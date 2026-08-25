import { sql, eq } from "drizzle-orm";
import { db } from "@/db";
import { inventoryTransactions } from "@/db/schema";

export type StockEntry = { total: number; warehouses: Map<number, number> };
export type StockMap = Map<number, StockEntry>;

/**
 * Current stock is ALWAYS derived from the inventory ledger.
 * Returns a map: productId -> { total, warehouses: Map<warehouseId, qty> }
 */
export async function getStockMap(): Promise<StockMap> {
  const rows = await db
    .select({
      productId: inventoryTransactions.productId,
      warehouseId: inventoryTransactions.warehouseId,
      qty: sql<string>`coalesce(sum(${inventoryTransactions.quantity}), 0)::int`,
    })
    .from(inventoryTransactions)
    .groupBy(inventoryTransactions.productId, inventoryTransactions.warehouseId);

  const map: StockMap = new Map();
  for (const r of rows) {
    const qty = Number(r.qty);
    let entry = map.get(r.productId);
    if (!entry) {
      entry = { total: 0, warehouses: new Map() };
      map.set(r.productId, entry);
    }
    entry.total += qty;
    entry.warehouses.set(r.warehouseId, qty);
  }
  return map;
}

export async function getProductStock(productId: number): Promise<number> {
  const [row] = await db
    .select({
      qty: sql<string>`coalesce(sum(${inventoryTransactions.quantity}), 0)::int`,
    })
    .from(inventoryTransactions)
    .where(eq(inventoryTransactions.productId, productId));
  return Number(row?.qty ?? 0);
}

export async function getWarehouseStock(warehouseId: number): Promise<number> {
  const [row] = await db
    .select({
      qty: sql<string>`coalesce(sum(${inventoryTransactions.quantity}), 0)::int`,
    })
    .from(inventoryTransactions)
    .where(eq(inventoryTransactions.warehouseId, warehouseId));
  return Number(row?.qty ?? 0);
}

export async function getTotalStockUnits(): Promise<number> {
  const [row] = await db
    .select({
      qty: sql<string>`coalesce(sum(${inventoryTransactions.quantity}), 0)::int`,
    })
    .from(inventoryTransactions);
  return Number(row?.qty ?? 0);
}
