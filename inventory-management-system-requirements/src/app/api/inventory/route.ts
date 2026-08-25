import { desc, eq, and, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { inventoryTransactions, products, warehouses, users } from "@/db/schema";
import { getSessionUser, can } from "@/lib/auth";
import { getStockMap } from "@/lib/stock";
import { json, fail, body } from "@/lib/api";
import { num } from "@/lib/format";

export const dynamic = "force-dynamic";

const OUT_TYPES = ["ISSUE", "SALE", "DAMAGE", "RETURN_OUT"];
const IN_TYPES = ["RECEIVE", "RETURN_IN", "TRANSFER_IN"];

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const summary = url.searchParams.get("summary") === "1";
  const limit = Number(url.searchParams.get("limit") ?? 200);

  const base = db
    .select({
      id: inventoryTransactions.id,
      productId: inventoryTransactions.productId,
      warehouseId: inventoryTransactions.warehouseId,
      type: inventoryTransactions.type,
      quantity: inventoryTransactions.quantity,
      referenceType: inventoryTransactions.referenceType,
      referenceId: inventoryTransactions.referenceId,
      note: inventoryTransactions.note,
      userId: inventoryTransactions.userId,
      createdAt: inventoryTransactions.createdAt,
      productName: products.name,
      productSku: products.sku,
      warehouseName: warehouses.name,
      userName: users.name,
    })
    .from(inventoryTransactions)
    .leftJoin(products, eq(inventoryTransactions.productId, products.id))
    .leftJoin(warehouses, eq(inventoryTransactions.warehouseId, warehouses.id))
    .leftJoin(users, eq(inventoryTransactions.userId, users.id));

  const q = type ? base.where(eq(inventoryTransactions.type, type as any)) : base;
  const history = await q.orderBy(desc(inventoryTransactions.createdAt)).limit(limit);

  let stockSummary: any[] = [];
  if (summary) {
    const stock = await getStockMap();
    const ids = [...stock.keys()];
    const prodRows = ids.length
      ? await db.select().from(products).where(inArray(products.id, ids))
      : [];
    const whRows = await db.select().from(warehouses);
    stockSummary = prodRows.map((p) => {
      const s = stock.get(p.id);
      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        total: s?.total ?? 0,
        warehouses: whRows
          .filter((w) => (s?.warehouses.get(w.id) ?? 0) !== 0)
          .map((w) => ({ warehouseId: w.id, name: w.name, qty: s?.warehouses.get(w.id) ?? 0 })),
      };
    });
  }

  return json({ history, stockSummary });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "inventory.manage")) return fail("You don't have permission to manage inventory", 403);

  const b = await body<Record<string, any>>(req);
  const type = String(b.type ?? "");
  const productId = Number(b.productId);
  const quantity = Math.round(Number(b.quantity));

  if (!["RECEIVE", "ISSUE", "ADJUSTMENT", "DAMAGE", "RETURN_IN", "RETURN_OUT", "TRANSFER"].includes(type)) {
    return fail("Invalid transaction type");
  }
  if (!productId || !quantity) return fail("Product and quantity are required");

  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return fail("Product not found", 404);

  if (type === "TRANSFER") {
    const fromId = Number(b.fromWarehouseId);
    const toId = Number(b.toWarehouseId);
    if (!fromId || !toId || fromId === toId) return fail("Select two different warehouses for a transfer");
    const stock = await getStockMap();
    const available = stock.get(productId)?.warehouses.get(fromId) ?? 0;
    if (available < quantity) {
      return fail(`Insufficient stock in source warehouse (${available} available)`, 400);
    }
    const [from] = await db.select().from(warehouses).where(eq(warehouses.id, fromId)).limit(1);
    const [to] = await db.select().from(warehouses).where(eq(warehouses.id, toId)).limit(1);
    if (!from || !to) return fail("Warehouse not found", 404);

    await db.insert(inventoryTransactions).values([
      {
        productId,
        warehouseId: fromId,
        type: "TRANSFER_OUT",
        quantity: -quantity,
        referenceType: "TRANSFER",
        note: `Transfer to ${to.name}`,
        userId: user.id,
      },
      {
        productId,
        warehouseId: toId,
        type: "TRANSFER_IN",
        quantity,
        referenceType: "TRANSFER",
        note: `Transfer from ${from.name}`,
        userId: user.id,
      },
    ]);
    return json({ ok: true }, 201);
  }

  // Single-warehouse movement
  const warehouseId = Number(b.warehouseId) || Number(product.defaultWarehouseId);
  if (!warehouseId) return fail("Select a warehouse (or set a default warehouse on the product)");
  const [warehouse] = await db.select().from(warehouses).where(eq(warehouses.id, warehouseId)).limit(1);
  if (!warehouse) return fail("Warehouse not found", 404);

  let signedQty = quantity;
  if (type === "ADJUSTMENT") {
    // quantity sign is meaningful: positive = add, negative = remove
  } else if (OUT_TYPES.includes(type)) {
    signedQty = -quantity;
    const stock = await getStockMap();
    const available = stock.get(productId)?.warehouses.get(warehouseId) ?? 0;
    if (available < quantity) {
      return fail(`Insufficient stock in ${warehouse.name} (${available} available)`, 400);
    }
  }

  const [row] = await db
    .insert(inventoryTransactions)
    .values({
      productId,
      warehouseId,
      type: type as any,
      quantity: signedQty,
      referenceType: "MANUAL",
      note: b.note ? String(b.note) : null,
      userId: user.id,
    })
    .returning();

  return json({ transaction: row }, 201);
}
