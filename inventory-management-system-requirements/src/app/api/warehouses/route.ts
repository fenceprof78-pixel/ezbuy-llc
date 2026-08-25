import { asc, eq, count } from "drizzle-orm";
import { db } from "@/db";
import { warehouses, inventoryTransactions, products } from "@/db/schema";
import { getSessionUser, can } from "@/lib/auth";
import { getWarehouseStock } from "@/lib/stock";
import { json, fail, body } from "@/lib/api";
import { num } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  const rows = await db.select().from(warehouses).orderBy(asc(warehouses.name));
  const items = [];
  for (const w of rows) {
    const units = await getWarehouseStock(w.id);
    const [pc] = await db
      .select({ n: count() })
      .from(products)
      .where(eq(products.defaultWarehouseId, w.id));
    items.push({ ...w, stockUnits: units, defaultProductCount: num(pc?.n) });
  }
  return json({ items });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "warehouses.manage")) return fail("You don't have permission to manage warehouses", 403);

  const b = await body<Record<string, any>>(req);
  const name = String(b.name ?? "").trim();
  if (!name) return fail("Warehouse name is required");
  const [dup] = await db.select({ id: warehouses.id }).from(warehouses).where(eq(warehouses.name, name)).limit(1);
  if (dup) return fail(`Warehouse "${name}" already exists`);

  const [row] = await db
    .insert(warehouses)
    .values({
      name,
      location: b.location ? String(b.location) : null,
      manager: b.manager ? String(b.manager) : null,
    })
    .returning();
  return json({ item: row }, 201);
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "warehouses.manage")) return fail("You don't have permission to manage warehouses", 403);

  const b = await body<Record<string, any>>(req);
  const id = Number(b.id);
  if (!id) return fail("ID is required");
  await db
    .update(warehouses)
    .set({
      name: b.name ? String(b.name) : undefined,
      location: b.location !== undefined ? String(b.location) : undefined,
      manager: b.manager !== undefined ? String(b.manager) : undefined,
    })
    .where(eq(warehouses.id, id));
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "warehouses.manage")) return fail("You don't have permission to manage warehouses", 403);

  const b = await body<Record<string, any>>(req);
  const id = Number(b.id);
  if (!id) return fail("ID is required");
  const [txns] = await db
    .select({ n: count() })
    .from(inventoryTransactions)
    .where(eq(inventoryTransactions.warehouseId, id));
  if (Number(txns?.n ?? 0) > 0) return fail("Cannot delete — this warehouse has inventory transactions", 400);
  await db.delete(warehouses).where(eq(warehouses.id, id));
  return json({ ok: true });
}
