import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, categories, brands, suppliers, warehouses } from "@/db/schema";
import { getSessionUser, can } from "@/lib/auth";
import { getStockMap } from "@/lib/stock";
import { json, fail, body } from "@/lib/api";
import { num } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);

  const rows = await db
    .select({
      id: products.id,
      sku: products.sku,
      barcode: products.barcode,
      name: products.name,
      description: products.description,
      categoryId: products.categoryId,
      brandId: products.brandId,
      supplierId: products.supplierId,
      defaultWarehouseId: products.defaultWarehouseId,
      costPrice: products.costPrice,
      sellingPrice: products.sellingPrice,
      reorderLevel: products.reorderLevel,
      imageUrl: products.imageUrl,
      status: products.status,
      createdAt: products.createdAt,
      categoryName: categories.name,
      brandName: brands.name,
      supplierName: suppliers.companyName,
      warehouseName: warehouses.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
    .leftJoin(warehouses, eq(products.defaultWarehouseId, warehouses.id))
    .orderBy(desc(products.createdAt));

  const stock = await getStockMap();

  const list = rows.map((r) => {
    const s = stock.get(r.id);
    return {
      ...r,
      costPrice: num(r.costPrice),
      sellingPrice: num(r.sellingPrice),
      stock: s?.total ?? 0,
      stockByWarehouse: Object.fromEntries(s?.warehouses ?? new Map()),
      lowStock: s ? s.total <= num(r.reorderLevel) : true,
    };
  });

  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase();
  const filtered = q
    ? list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode ?? "").toLowerCase().includes(q),
      )
    : list;

  return json({ products: filtered });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "products.manage")) return fail("You don't have permission to manage products", 403);

  const b = await body<Record<string, any>>(req);
  const name = String(b.name ?? "").trim();
  const sku = String(b.sku ?? "").trim();
  if (!name || !sku) return fail("Product name and SKU are required");

  const [existing] = await db.select({ id: products.id }).from(products).where(eq(products.sku, sku)).limit(1);
  if (existing) return fail(`A product with SKU "${sku}" already exists`);

  const [row] = await db
    .insert(products)
    .values({
      name,
      sku,
      barcode: b.barcode ? String(b.barcode) : null,
      description: b.description ? String(b.description) : null,
      categoryId: b.categoryId ? Number(b.categoryId) : null,
      brandId: b.brandId ? Number(b.brandId) : null,
      supplierId: b.supplierId ? Number(b.supplierId) : null,
      defaultWarehouseId: b.defaultWarehouseId ? Number(b.defaultWarehouseId) : null,
      costPrice: String(num(b.costPrice)),
      sellingPrice: String(num(b.sellingPrice)),
      reorderLevel: Math.max(0, Math.round(num(b.reorderLevel))),
      imageUrl: b.imageUrl ? String(b.imageUrl) : null,
      status: b.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    })
    .returning();

  return json({ product: row }, 201);
}
