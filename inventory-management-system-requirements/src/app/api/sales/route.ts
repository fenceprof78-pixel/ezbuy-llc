import { desc, eq, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { sales, saleItems, customers, products, warehouses, inventoryTransactions } from "@/db/schema";
import { getSessionUser, can } from "@/lib/auth";
import { getStockMap } from "@/lib/stock";
import { json, fail, body } from "@/lib/api";
import { num } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);

  const rows = await db
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
    .orderBy(desc(sales.createdAt));

  const itemCounts = await db
    .select({ saleId: saleItems.saleId, n: sql<string>`count(*)` })
    .from(saleItems)
    .groupBy(saleItems.saleId);
  const cmap = new Map(itemCounts.map((r) => [r.saleId, num(r.n)]));

  const list = rows.map((r) => ({
    ...r,
    amountPaid: num(r.amountPaid),
    subtotal: num(r.subtotal),
    tax: num(r.tax),
    total: num(r.total),
    balance: num(r.total) - num(r.amountPaid),
    itemCount: cmap.get(r.id) ?? 0,
  }));
  return json({ sales: list });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "sales.manage")) return fail("You don't have permission to manage sales", 403);

  const b = await body<Record<string, any>>(req);
  const customerId = Number(b.customerId);
  const items = (Array.isArray(b.items) ? b.items : []).filter(
    (i: any) => Number(i.productId) && Number(i.quantity) > 0,
  );
  if (!customerId || items.length === 0) return fail("Customer and at least one item are required");

  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  if (!customer) return fail("Customer not found", 404);

  const productIds = items.map((i: any) => Number(i.productId));
  const prods = await db.select().from(products).where(inArray(products.id, productIds));
  const pmap = new Map(prods.map((p) => [p.id, p]));
  const stock = await getStockMap();

  const detail = items.map((i: any) => {
    const p = pmap.get(Number(i.productId));
    if (!p) throw new Error(`Product ${i.productId} not found`);
    const qty = Math.round(Number(i.quantity));
    const unitPrice = num(i.unitPrice != null ? i.unitPrice : p.sellingPrice);
    return {
      product: p,
      quantity: qty,
      unitPrice,
      costPrice: num(p.costPrice),
      lineTotal: qty * unitPrice,
    };
  });

  for (const d of detail) {
    const available = stock.get(d.product.id)?.total ?? 0;
    if (available < d.quantity) {
      return fail(
        `Insufficient stock for ${d.product.name} — only ${available} available (requested ${d.quantity})`,
        400,
      );
    }
  }

  const subtotal = detail.reduce((s, d) => s + d.lineTotal, 0);
  const tax = num(b.tax);
  const total = subtotal + tax;

  const whRows = await db.select().from(warehouses);
  const firstWarehouseId = whRows[0]?.id;

  const [cnt] = await db.select({ n: sql<string>`count(*)` }).from(sales);
  const invoiceNumber = `INV-${String(num(cnt.n) + 1).padStart(4, "0")}`;

  const sale = await db.transaction(async (tx) => {
    const [s] = await tx
      .insert(sales)
      .values({
        invoiceNumber,
        customerId,
        saleDate: b.saleDate ? new Date(String(b.saleDate)) : new Date(),
        status: "CONFIRMED",
        paymentStatus: "UNPAID",
        subtotal: String(subtotal),
        tax: String(tax),
        total: String(total),
        notes: b.notes ? String(b.notes) : null,
        userId: user.id,
      })
      .returning();

    for (const d of detail) {
      await tx.insert(saleItems).values({
        saleId: s.id,
        productId: d.product.id,
        quantity: d.quantity,
        unitPrice: String(d.unitPrice),
        costPrice: String(d.costPrice),
        lineTotal: String(d.lineTotal),
      });
      const whId = d.product.defaultWarehouseId ?? firstWarehouseId;
      if (!whId) throw new Error(`No warehouse available for ${d.product.name}`);
      await tx.insert(inventoryTransactions).values({
        productId: d.product.id,
        warehouseId: whId,
        type: "SALE",
        quantity: -d.quantity,
        referenceType: "SALE",
        referenceId: s.id,
        note: `Invoice ${invoiceNumber}`,
        userId: user.id,
      });
    }
    return s;
  });

  return json({ sale }, 201);
}
