import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/db";
import { sales, saleItems, customers, products, inventoryTransactions } from "@/db/schema";
import { getSessionUser, can } from "@/lib/auth";
import { json, fail, body } from "@/lib/api";
import { num } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  const { id } = await params;
  const [sale] = await db
    .select({
      id: sales.id,
      invoiceNumber: sales.invoiceNumber,
      customerId: sales.customerId,
      customerName: customers.name,
      saleDate: sales.saleDate,
      status: sales.status,
      paymentStatus: sales.paymentStatus,
      amountPaid: sales.amountPaid,
      subtotal: sales.subtotal,
      tax: sales.tax,
      total: sales.total,
      notes: sales.notes,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(eq(sales.id, Number(id)))
    .limit(1);
  if (!sale) return fail("Sale not found", 404);

  const items = await db
    .select({
      id: saleItems.id,
      productId: saleItems.productId,
      productName: products.name,
      productSku: products.sku,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
      costPrice: saleItems.costPrice,
      lineTotal: saleItems.lineTotal,
    })
    .from(saleItems)
    .leftJoin(products, eq(saleItems.productId, products.id))
    .where(eq(saleItems.saleId, Number(id)));

  return json({
    sale: {
      ...sale,
      amountPaid: num(sale.amountPaid),
      subtotal: num(sale.subtotal),
      tax: num(sale.tax),
      total: num(sale.total),
      balance: num(sale.total) - num(sale.amountPaid),
    },
    items: items.map((i) => ({
      ...i,
      unitPrice: num(i.unitPrice),
      costPrice: num(i.costPrice),
      lineTotal: num(i.lineTotal),
    })),
  });
}

export async function PUT(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "sales.manage")) return fail("You don't have permission to manage sales", 403);

  const { id } = await params;
  const b = await body<Record<string, any>>(req);
  const [sale] = await db.select().from(sales).where(eq(sales.id, Number(id))).limit(1);
  if (!sale) return fail("Sale not found", 404);

  const validStatuses = ["DRAFT", "CONFIRMED", "SHIPPED", "COMPLETED", "CANCELLED"];
  const status = validStatuses.includes(String(b.status)) ? String(b.status) : sale.status;

  let amountPaid = b.amountPaid !== undefined ? num(b.amountPaid) : num(sale.amountPaid);
  const total = num(sale.total);
  if (amountPaid >= total) {
    amountPaid = total;
  } else if (amountPaid < 0) {
    amountPaid = 0;
  }
  const paymentStatus = amountPaid >= total ? "PAID" : amountPaid > 0 ? "PARTIAL" : "UNPAID";

  const [row] = await db
    .update(sales)
    .set({
      status: status as any,
      paymentStatus: paymentStatus as any,
      amountPaid: String(amountPaid),
    })
    .where(eq(sales.id, Number(id)))
    .returning();
  return json({ sale: row });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "sales.manage")) return fail("You don't have permission to manage sales", 403);

  const { id } = await params;
  const [sale] = await db.select().from(sales).where(eq(sales.id, Number(id))).limit(1);
  if (!sale) return fail("Sale not found", 404);

  await db.transaction(async (tx) => {
    // Remove ledger entries that reference this sale (reverses stock impact)
    const txnRows = await tx
      .select({ id: inventoryTransactions.id })
      .from(inventoryTransactions)
      .where(
        and(
          eq(inventoryTransactions.referenceType, "SALE"),
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
    await tx.delete(saleItems).where(eq(saleItems.saleId, Number(id)));
    await tx.delete(sales).where(eq(sales.id, Number(id)));
  });

  return json({ ok: true });
}
