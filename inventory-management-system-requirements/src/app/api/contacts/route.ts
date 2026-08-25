import { asc, eq, count, sql } from "drizzle-orm";
import { db } from "@/db";
import { suppliers, customers, products, purchases, sales } from "@/db/schema";
import { getSessionUser, can } from "@/lib/auth";
import { json, fail, body } from "@/lib/api";
import { num } from "@/lib/format";

export const dynamic = "force-dynamic";

const isSupplier = (type: string) => type === "supplier";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  const type = new URL(req.url).searchParams.get("type") ?? "customer";

  if (isSupplier(type)) {
    const rows = await db.select().from(suppliers).orderBy(asc(suppliers.companyName));
    const totals = await db
      .select({
        id: purchases.supplierId,
        total: sql<string>`coalesce(sum(${purchases.total}),0)`,
        balance: sql<string>`coalesce(sum(case when ${purchases.status} <> 'CANCELLED' then ${purchases.total} - ${purchases.amountPaid} else 0 end),0)`,
        count: sql<string>`count(*)`,
      })
      .from(purchases)
      .groupBy(purchases.supplierId);
    const tmap = new Map(totals.map((t) => [t.id, t]));
    const items = rows.map((s) => ({
      ...s,
      purchaseCount: num(tmap.get(s.id)?.count),
      totalPurchases: num(tmap.get(s.id)?.total),
      amountOwed: num(tmap.get(s.id)?.balance),
    }));
    return json({ items });
  }

  const rows = await db.select().from(customers).orderBy(asc(customers.name));
  const totals = await db
    .select({
      id: sales.customerId,
      total: sql<string>`coalesce(sum(${sales.total}),0)`,
      balance: sql<string>`coalesce(sum(case when ${sales.status} <> 'CANCELLED' then ${sales.total} - ${sales.amountPaid} else 0 end),0)`,
      count: sql<string>`count(*)`,
    })
    .from(sales)
    .groupBy(sales.customerId);
  const tmap = new Map(totals.map((t) => [t.id, t]));
  const items = rows.map((c) => ({
    ...c,
    saleCount: num(tmap.get(c.id)?.count),
    totalSales: num(tmap.get(c.id)?.total),
    outstanding: num(tmap.get(c.id)?.balance),
  }));
  return json({ items });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "contacts.manage")) return fail("You don't have permission to manage contacts", 403);

  const b = await body<Record<string, any>>(req);
  const type = String(b.type ?? "customer");
  if (isSupplier(type)) {
    const companyName = String(b.companyName ?? "").trim();
    if (!companyName) return fail("Company name is required");
    const [row] = await db
      .insert(suppliers)
      .values({
        companyName,
        contactPerson: b.contactPerson ? String(b.contactPerson) : null,
        phone: b.phone ? String(b.phone) : null,
        email: b.email ? String(b.email) : null,
        address: b.address ? String(b.address) : null,
        paymentTerms: b.paymentTerms ? String(b.paymentTerms) : null,
      })
      .returning();
    return json({ item: row }, 201);
  }
  const name = String(b.name ?? "").trim();
  if (!name) return fail("Customer name is required");
  const [row] = await db
    .insert(customers)
    .values({
      name,
      phone: b.phone ? String(b.phone) : null,
      email: b.email ? String(b.email) : null,
      address: b.address ? String(b.address) : null,
    })
    .returning();
  return json({ item: row }, 201);
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "contacts.manage")) return fail("You don't have permission to manage contacts", 403);

  const b = await body<Record<string, any>>(req);
  const id = Number(b.id);
  if (!id) return fail("ID is required");

  if (isSupplier(String(b.type))) {
    await db
      .update(suppliers)
      .set({
        companyName: b.companyName ? String(b.companyName) : undefined,
        contactPerson: b.contactPerson !== undefined ? String(b.contactPerson) : undefined,
        phone: b.phone !== undefined ? String(b.phone) : undefined,
        email: b.email !== undefined ? String(b.email) : undefined,
        address: b.address !== undefined ? String(b.address) : undefined,
        paymentTerms: b.paymentTerms !== undefined ? String(b.paymentTerms) : undefined,
      })
      .where(eq(suppliers.id, id));
  } else {
    await db
      .update(customers)
      .set({
        name: b.name ? String(b.name) : undefined,
        phone: b.phone !== undefined ? String(b.phone) : undefined,
        email: b.email !== undefined ? String(b.email) : undefined,
        address: b.address !== undefined ? String(b.address) : undefined,
      })
      .where(eq(customers.id, id));
  }
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "contacts.manage")) return fail("You don't have permission to manage contacts", 403);

  const b = await body<Record<string, any>>(req);
  const id = Number(b.id);
  if (!id) return fail("ID is required");

  if (isSupplier(String(b.type))) {
    const [p] = await db.select({ n: count() }).from(products).where(eq(products.supplierId, id));
    const [po] = await db.select({ n: count() }).from(purchases).where(eq(purchases.supplierId, id));
    if (Number(p?.n ?? 0) + Number(po?.n ?? 0) > 0) {
      return fail("Cannot delete — this supplier has products or purchase orders", 400);
    }
    await db.delete(suppliers).where(eq(suppliers.id, id));
  } else {
    const [s] = await db.select({ n: count() }).from(sales).where(eq(sales.customerId, id));
    if (Number(s?.n ?? 0) > 0) return fail("Cannot delete — this customer has sales", 400);
    await db.delete(customers).where(eq(customers.id, id));
  }
  return json({ ok: true });
}
