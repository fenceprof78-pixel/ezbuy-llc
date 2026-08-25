import { eq, count } from "drizzle-orm";
import { db } from "@/db";
import { products, inventoryTransactions } from "@/db/schema";
import { getSessionUser, can } from "@/lib/auth";
import { getProductStock } from "@/lib/stock";
import { json, fail, body } from "@/lib/api";
import { num } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  const { id } = await params;
  const [row] = await db.select().from(products).where(eq(products.id, Number(id))).limit(1);
  if (!row) return fail("Product not found", 404);
  const stock = await getProductStock(row.id);
  return json({ product: { ...row, costPrice: num(row.costPrice), sellingPrice: num(row.sellingPrice), stock } });
}

export async function PUT(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "products.manage")) return fail("You don't have permission to manage products", 403);

  const { id } = await params;
  const b = await body<Record<string, any>>(req);
  const [existing] = await db.select().from(products).where(eq(products.id, Number(id))).limit(1);
  if (!existing) return fail("Product not found", 404);

  const name = String(b.name ?? existing.name).trim();
  const sku = String(b.sku ?? existing.sku).trim();
  if (!name || !sku) return fail("Product name and SKU are required");

  const [dup] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.sku, sku))
    .limit(1);
  if (dup && dup.id !== existing.id) return fail(`A product with SKU "${sku}" already exists`);

  const [row] = await db
    .update(products)
    .set({
      name,
      sku,
      barcode: b.barcode !== undefined ? String(b.barcode) : existing.barcode,
      description: b.description !== undefined ? String(b.description) : existing.description,
      categoryId: b.categoryId !== undefined ? (b.categoryId ? Number(b.categoryId) : null) : existing.categoryId,
      brandId: b.brandId !== undefined ? (b.brandId ? Number(b.brandId) : null) : existing.brandId,
      supplierId: b.supplierId !== undefined ? (b.supplierId ? Number(b.supplierId) : null) : existing.supplierId,
      defaultWarehouseId:
        b.defaultWarehouseId !== undefined
          ? b.defaultWarehouseId
            ? Number(b.defaultWarehouseId)
            : null
          : existing.defaultWarehouseId,
      costPrice: b.costPrice !== undefined ? String(num(b.costPrice)) : existing.costPrice,
      sellingPrice: b.sellingPrice !== undefined ? String(num(b.sellingPrice)) : existing.sellingPrice,
      reorderLevel:
        b.reorderLevel !== undefined ? Math.max(0, Math.round(num(b.reorderLevel))) : existing.reorderLevel,
      imageUrl: b.imageUrl !== undefined ? String(b.imageUrl) : existing.imageUrl,
      status: b.status === "INACTIVE" ? "INACTIVE" : b.status === "ACTIVE" ? "ACTIVE" : existing.status,
    })
    .where(eq(products.id, existing.id))
    .returning();

  return json({ product: row });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "products.manage")) return fail("You don't have permission to manage products", 403);

  const { id } = await params;
  const [txnCount] = await db
    .select({ n: count() })
    .from(inventoryTransactions)
    .where(eq(inventoryTransactions.productId, Number(id)));
  if (Number(txnCount?.n ?? 0) > 0) {
    return fail("Cannot delete this product — it has inventory history. Set it to Inactive instead.", 400);
  }

  await db.delete(products).where(eq(products.id, Number(id)));
  return json({ ok: true });
}
