import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/db";
import { purchases, purchaseItems, suppliers, products, warehouses, inventoryTransactions } from "@/db/schema";
import { getSessionUser, can } from "@/lib/auth";
import { json, fail, body } from "@/lib/api";
import { num } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  const { id } = await params;
  const [purchase] = await db
    .select({
      id: purchases.id,
      poNumber: purchases.poNumber,
      supplierId: purchases.supplierId,
      supplierName: suppliers.companyName,
      orderDate: purchases.orderDate,
      status: purchases.status,
      paymentStatus: purchases.paymentStatus,
      amountPaid: purchases.amountPaid,
      subtotal: purchases.subtotal,
      tax: purchases.tax,
      total: purchases.total,
      notes: purchases.notes,
      createdAt: purchases.createdAt,
    })
    .from(purchases)
    .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .where(eq(purchases.id, Number(id)))
    .limit(1);
  if (!purchase) return fail("Purchase order not found", 404);

  const items = await db
    .select({
      id: purchaseItems.id,
      productId: purchaseItems.productId,
      productName: products.name,
      productSku: products.sku,
      quantity: purchaseItems.quantity,
      unitCost: purchaseItems.unitCost,
      lineTotal: purchaseItems.lineTotal,
    })
    .from(purchaseItems)
    .leftJoin(products, eq(purchaseItems.productId, products.id))
    .where(eq(purchaseItems.purchaseId, Number(id)));

  return json({
    purchase: {
      ...purchase,
      amountPaid: num(purchase.amountPaid),
      subtotal: num(purchase.subtotal),
      tax: num(purchase.tax),
      total: num(purchase.total),
      balance: num(purchase.total) - num(purchase.amountPaid),
    },
    items: items.map((i) => ({
      ...i,
      unitCost: num(i.unitCost),
      lineTotal: num(i.lineTotal),
    })),
  });
}

export async function PUT(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "purchases.manage")) return fail("You don't have permission to manage purchases", 403);

  const { id } = await params;
  const b = await body<Record<string, any>>(req);
  const [purchase] = await db.select().from(purchases).where(eq(purchases.id, Number(id))).limit(1);
  if (!purchase) return fail("Purchase order not found", 404);

  const validStatuses = ["DRAFT", "ORDERED", "RECEIVED", "CANCELLED"];
  const status = validStatuses.includes(String(b.status)) ? String(b.status) : purchase.status;

  let amountPaid = b.amountPaid !== undefined ? num(b.amountPaid) : num(purchase.amountPaid);
  const total = num(purchase.total);
  if (amountPaid >= total) amountPaid = total;
  else if (amountPaid < 0) amountPaid = 0;
  const paymentStatus = amountPaid >= total ? "PAID" : amountPaid > 0 ? "PARTIAL" : "UNPAID";

  const [row] = await db
    .update(purchases)
    .set({
      status: status as any,
      paymentStatus: paymentStatus as any,
      amountPaid: String(amountPaid),
    })
    .where(eq(purchases.id, Number(id)))
    .returning();

  // Receiving goods → create RECEIVE ledger entries (stock in), exactly once
  if (status === "RECEIVED" && purchase.status !== "RECEIVED") {
    const [existing] = await db
      .select({ n: inventoryTransactions.id })
      .from(inventoryTransactions)
      .where(
        and(
          eq(inventoryTransactions.referenceType, "PURCHASE"),
          eq(inventoryTransactions.referenceId, Number(id)),
        ),
      )
      .limit(1);
    if (!existing) {
      const items = await db
        .select()
        .from(purchaseItems)
        .where(eq(purchaseItems.purchaseId, Number(id)));
      const whRows = await db.select().from(warehouses);
      const firstWh = whRows[0]?.id;
      for (const it of items) {
        const [prod] = await db
          .select({ defaultWarehouseId: products.defaultWarehouseId })
          .from(products)
          .where(eq(products.id, it.productId))
          .limit(1);
        const whId = prod?.defaultWarehouseId ?? firstWh;
        if (!whId) continue;
        await db.insert(inventoryTransactions).values({
          productId: it.productId,
          warehouseId: whId,
          type: "RECEIVE",
          quantity: it.quantity,
          referenceType: "PURCHASE",
          referenceId: Number(id),
          note: `PO ${purchase.poNumber} received`,
          userId: user.id,
        });
      }
    }
  }

  return json({ purchase: row });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "purchases.manage")) return fail("You don't have permission to manage purchases", 403);

  const { id } = await params;
  const [purchase] = await db.select().from(purchases).where(eq(purchases.id, Number(id))).limit(1);
  if (!purchase) return fail("Purchase order not found", 404);

  await db.transaction(async (tx) => {
    const txnRows = await tx
      .select({ id: inventoryTransactions.id })
      .from(inventoryTransactions)
      .where(
        and(
          eq(inventoryTransactions.referenceType, "PURCHASE"),
          eq(inventoryTransactions.referenceId, Number(id)),
        ),
      );
    if (txnRows.length) {
      await tx.delete(inventoryTransactions).where(
        inArray(
          inventoryTransactions.id,
          txnRows.map((t) => t.id),
        ),
      );
    }
    await tx.delete(purchaseItems).where(eq(purchaseItems.purchaseId, Number(id)));
    await tx.delete(purchases).where(eq(purchases.id, Number(id)));
  });

  return json({ ok: true });
}
