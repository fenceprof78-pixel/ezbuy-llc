import { desc, eq, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { purchases, purchaseItems, suppliers, products } from "@/db/schema";
import { getSessionUser, can } from "@/lib/auth";
import { json, fail, body } from "@/lib/api";
import { num } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);

  const rows = await db
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
    .orderBy(desc(purchases.createdAt));

  const itemCounts = await db
    .select({ purchaseId: purchaseItems.purchaseId, n: sql<string>`count(*)` })
    .from(purchaseItems)
    .groupBy(purchaseItems.purchaseId);
  const cmap = new Map(itemCounts.map((r) => [r.purchaseId, num(r.n)]));

  const list = rows.map((r) => ({
    ...r,
    amountPaid: num(r.amountPaid),
    subtotal: num(r.subtotal),
    tax: num(r.tax),
    total: num(r.total),
    balance: num(r.total) - num(r.amountPaid),
    itemCount: cmap.get(r.id) ?? 0,
  }));
  return json({ purchases: list });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "purchases.manage")) return fail("You don't have permission to manage purchases", 403);

  const b = await body<Record<string, any>>(req);
  const supplierId = Number(b.supplierId);
  const items = (Array.isArray(b.items) ? b.items : []).filter(
    (i: any) => Number(i.productId) && Number(i.quantity) > 0,
  );
  if (!supplierId || items.length === 0) return fail("Supplier and at least one item are required");

  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, supplierId)).limit(1);
  if (!supplier) return fail("Supplier not found", 404);

  const productIds = items.map((i: any) => Number(i.productId));
  const prods = await db.select().from(products).where(inArray(products.id, productIds));
  const pmap = new Map(prods.map((p) => [p.id, p]));

  const detail = items.map((i: any) => {
    const p = pmap.get(Number(i.productId));
    if (!p) throw new Error(`Product ${i.productId} not found`);
    const qty = Math.round(Number(i.quantity));
    const unitCost = num(i.unitCost != null ? i.unitCost : p.costPrice);
    return { product: p, quantity: qty, unitCost, lineTotal: qty * unitCost };
  });

  const subtotal = detail.reduce((s, d) => s + d.lineTotal, 0);
  const tax = num(b.tax);
  const total = subtotal + tax;

  const [cnt] = await db.select({ n: sql<string>`count(*)` }).from(purchases);
  const poNumber = `PO-${String(num(cnt.n) + 1).padStart(4, "0")}`;

  const purchase = await db.transaction(async (tx) => {
    const [p] = await tx
      .insert(purchases)
      .values({
        poNumber,
        supplierId,
        orderDate: b.orderDate ? new Date(String(b.orderDate)) : new Date(),
        status: "ORDERED",
        paymentStatus: "UNPAID",
        subtotal: String(subtotal),
        tax: String(tax),
        total: String(total),
        notes: b.notes ? String(b.notes) : null,
        userId: user.id,
      })
      .returning();

    for (const d of detail) {
      await tx.insert(purchaseItems).values({
        purchaseId: p.id,
        productId: d.product.id,
        quantity: d.quantity,
        unitCost: String(d.unitCost),
        lineTotal: String(d.lineTotal),
      });
    }
    return p;
  });

  return json({ purchase }, 201);
}
