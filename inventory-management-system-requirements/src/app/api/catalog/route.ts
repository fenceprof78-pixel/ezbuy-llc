import { asc, eq, count } from "drizzle-orm";
import { db } from "@/db";
import { categories, brands, products } from "@/db/schema";
import { getSessionUser, can } from "@/lib/auth";
import { json, fail, body } from "@/lib/api";

export const dynamic = "force-dynamic";

const asBrand = (type: string) => type === "brand";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  const type = new URL(req.url).searchParams.get("type") ?? "category";

  if (asBrand(type)) {
    const items = await db.select().from(brands).orderBy(asc(brands.name));
    return json({ items });
  }
  const items = await db.select().from(categories).orderBy(asc(categories.name));
  return json({ items });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "catalog.manage")) return fail("You don't have permission to manage the catalog", 403);

  const b = await body<Record<string, any>>(req);
  const type = String(b.type ?? "category");
  const name = String(b.name ?? "").trim();
  if (!name) return fail("Name is required");

  if (asBrand(type)) {
    const [dup] = await db.select({ id: brands.id }).from(brands).where(eq(brands.name, name)).limit(1);
    if (dup) return fail(`Brand "${name}" already exists`);
    await db.insert(brands).values({ name });
    return json({ ok: true }, 201);
  }

  const [dup] = await db.select({ id: categories.id }).from(categories).where(eq(categories.name, name)).limit(1);
  if (dup) return fail(`Category "${name}" already exists`);
  await db.insert(categories).values({ name, description: b.description ? String(b.description) : null });
  return json({ ok: true }, 201);
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "catalog.manage")) return fail("You don't have permission to manage the catalog", 403);

  const b = await body<Record<string, any>>(req);
  const id = Number(b.id);
  const name = String(b.name ?? "").trim();
  if (!id || !name) return fail("ID and name are required");

  if (asBrand(String(b.type))) {
    await db.update(brands).set({ name }).where(eq(brands.id, id));
  } else {
    await db
      .update(categories)
      .set({ name, description: b.description !== undefined ? String(b.description) : undefined })
      .where(eq(categories.id, id));
  }
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "catalog.manage")) return fail("You don't have permission to manage the catalog", 403);

  const b = await body<Record<string, any>>(req);
  const id = Number(b.id);
  if (!id) return fail("ID is required");

  if (asBrand(String(b.type))) {
    const [used] = await db.select({ n: count() }).from(products).where(eq(products.brandId, id));
    if (Number(used?.n ?? 0) > 0) return fail("Cannot delete — this brand is used by products", 400);
    await db.delete(brands).where(eq(brands.id, id));
  } else {
    const [used] = await db.select({ n: count() }).from(products).where(eq(products.categoryId, id));
    if (Number(used?.n ?? 0) > 0) return fail("Cannot delete — this category is used by products", 400);
    await db.delete(categories).where(eq(categories.id, id));
  }
  return json({ ok: true });
}
