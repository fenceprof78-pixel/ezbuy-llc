import { desc, eq, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { products, customers, suppliers, warehouses, sales, purchases, inventoryTransactions, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getStockMap, getTotalStockUnits } from "@/lib/stock";
import { json, fail } from "@/lib/api";
import { num } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);

  const [productCount] = await db.select({ n: sql<string>`count(*)` }).from(products);
  const [customerCount] = await db.select({ n: sql<string>`count(*)` }).from(customers);
  const [supplierCount] = await db.select({ n: sql<string>`count(*)` }).from(suppliers);
  const [warehouseCount] = await db.select({ n: sql<string>`count(*)` }).from(warehouses);

  const [salesRow] = await db
    .select({
      total: sql<string>`coalesce(sum(case when ${sales.status} <> 'CANCELLED' then ${sales.total} else 0 end), 0)`,
      outstanding: sql<string>`coalesce(sum(case when ${sales.status} <> 'CANCELLED' then ${sales.total} - ${sales.amountPaid} else 0 end), 0)`,
    })
    .from(sales);

  const [purchasesRow] = await db
    .select({
      total: sql<string>`coalesce(sum(case when ${purchases.status} <> 'CANCELLED' then ${purchases.total} else 0 end), 0)`,
      outstanding: sql<string>`coalesce(sum(case when ${purchases.status} <> 'CANCELLED' then ${purchases.total} - ${purchases.amountPaid} else 0 end), 0)`,
    })
    .from(purchases);

  const totalStock = await getTotalStockUnits();
  const stock = await getStockMap();

  const prodRows = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      reorderLevel: products.reorderLevel,
      costPrice: products.costPrice,
      sellingPrice: products.sellingPrice,
      imageUrl: products.imageUrl,
    })
    .from(products);

  let stockValue = 0;
  let lowStockCount = 0;
  const lowStock: any[] = [];
  for (const p of prodRows) {
    const s = stock.get(p.id)?.total ?? 0;
    stockValue += s * num(p.costPrice);
    if (s <= num(p.reorderLevel)) {
      lowStockCount += 1;
      if (lowStock.length < 8) {
        lowStock.push({ ...p, costPrice: num(p.costPrice), sellingPrice: num(p.sellingPrice), stock: s });
      }
    }
  }

  const recent = await db
    .select({
      id: inventoryTransactions.id,
      productId: inventoryTransactions.productId,
      warehouseId: inventoryTransactions.warehouseId,
      type: inventoryTransactions.type,
      quantity: inventoryTransactions.quantity,
      note: inventoryTransactions.note,
      createdAt: inventoryTransactions.createdAt,
      productName: products.name,
      warehouseName: warehouses.name,
      userName: users.name,
    })
    .from(inventoryTransactions)
    .leftJoin(products, eq(inventoryTransactions.productId, products.id))
    .leftJoin(warehouses, eq(inventoryTransactions.warehouseId, warehouses.id))
    .leftJoin(users, eq(inventoryTransactions.userId, users.id))
    .orderBy(desc(inventoryTransactions.createdAt))
    .limit(10);

  const recentSales = await db
    .select({ id: sales.id, invoiceNumber: sales.invoiceNumber, total: sales.total, saleDate: sales.saleDate })
    .from(sales)
    .orderBy(desc(sales.createdAt))
    .limit(5);

  return json({
    stats: {
      totalProducts: num(productCount?.n),
      totalStock,
      stockValue,
      lowStockCount,
      totalSales: num(salesRow?.total),
      salesOutstanding: num(salesRow?.outstanding),
      totalPurchases: num(purchasesRow?.total),
      purchasesOutstanding: num(purchasesRow?.outstanding),
      totalOutstanding: num(salesRow?.outstanding) + num(purchasesRow?.outstanding),
      customers: num(customerCount?.n),
      suppliers: num(supplierCount?.n),
      warehouses: num(warehouseCount?.n),
    },
    lowStock,
    recent,
    recentSales,
  });
}
