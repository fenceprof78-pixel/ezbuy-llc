import { desc, eq, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { products, categories, brands, suppliers, customers, sales, saleItems, purchases, purchaseItems, warehouses, inventoryTransactions, users } from "@/db/schema";
import { getSessionUser, can } from "@/lib/auth";
import { getStockMap } from "@/lib/stock";
import { json, fail } from "@/lib/api";
import { num } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "reports.view")) return fail("You don't have permission to view reports", 403);

  const type = new URL(req.url).searchParams.get("type") ?? "inventory";

  if (type === "lowstock") {
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        reorderLevel: products.reorderLevel,
        costPrice: products.costPrice,
        sellingPrice: products.sellingPrice,
        categoryName: categories.name,
        supplierName: suppliers.companyName,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id));
    const stock = await getStockMap();
    const items = rows
      .map((r) => {
        const s = stock.get(r.id)?.total ?? 0;
        return {
          ...r,
          costPrice: num(r.costPrice),
          sellingPrice: num(r.sellingPrice),
          stock: s,
          shortage: Math.max(0, num(r.reorderLevel) - s),
        };
      })
      .filter((r) => r.stock <= r.reorderLevel)
      .sort((a, b) => a.stock - b.stock);
    return json({ rows: items, totals: { count: items.length } });
  }

  if (type === "inventory") {
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        barcode: products.barcode,
        status: products.status,
        reorderLevel: products.reorderLevel,
        costPrice: products.costPrice,
        sellingPrice: products.sellingPrice,
        categoryName: categories.name,
        brandName: brands.name,
        supplierName: suppliers.companyName,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id));
    const stock = await getStockMap();
    let stockValue = 0;
    let retailValue = 0;
    const items = rows.map((r) => {
      const s = stock.get(r.id)?.total ?? 0;
      const cost = num(r.costPrice);
      const price = num(r.sellingPrice);
      stockValue += s * cost;
      retailValue += s * price;
      return {
        ...r,
        costPrice: cost,
        sellingPrice: price,
        stock: s,
        stockValue: s * cost,
        retailValue: s * price,
        lowStock: s <= num(r.reorderLevel),
      };
    });
    return json({ rows: items, totals: { stockValue, retailValue, units: items.reduce((a, b) => a + b.stock, 0) } });
  }

  if (type === "sales") {
    const rows = await db
      .select({
        id: sales.id,
        invoiceNumber: sales.invoiceNumber,
        saleDate: sales.saleDate,
        status: sales.status,
        paymentStatus: sales.paymentStatus,
        amountPaid: sales.amountPaid,
        subtotal: sales.subtotal,
        tax: sales.tax,
        total: sales.total,
        customerName: customers.name,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .orderBy(desc(sales.saleDate));
    const items = rows.map((r) => ({
      ...r,
      amountPaid: num(r.amountPaid),
      subtotal: num(r.subtotal),
      tax: num(r.tax),
      total: num(r.total),
      balance: num(r.total) - num(r.amountPaid),
    }));
    return json({
      rows: items,
      totals: {
        count: items.length,
        total: items.reduce((a, b) => a + b.total, 0),
        collected: items.reduce((a, b) => a + b.amountPaid, 0),
        outstanding: items.reduce((a, b) => a + b.balance, 0),
      },
    });
  }

  if (type === "purchase") {
    const rows = await db
      .select({
        id: purchases.id,
        poNumber: purchases.poNumber,
        orderDate: purchases.orderDate,
        status: purchases.status,
        paymentStatus: purchases.paymentStatus,
        amountPaid: purchases.amountPaid,
        subtotal: purchases.subtotal,
        tax: purchases.tax,
        total: purchases.total,
        supplierName: suppliers.companyName,
      })
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .orderBy(desc(purchases.orderDate));
    const items = rows.map((r) => ({
      ...r,
      amountPaid: num(r.amountPaid),
      subtotal: num(r.subtotal),
      tax: num(r.tax),
      total: num(r.total),
      balance: num(r.total) - num(r.amountPaid),
    }));
    return json({
      rows: items,
      totals: {
        count: items.length,
        total: items.reduce((a, b) => a + b.total, 0),
        paid: items.reduce((a, b) => a + b.amountPaid, 0),
        outstanding: items.reduce((a, b) => a + b.balance, 0),
      },
    });
  }

  if (type === "profit") {
    const rows = await db
      .select({
        id: saleItems.id,
        saleId: saleItems.saleId,
        invoiceNumber: sales.invoiceNumber,
        saleDate: sales.saleDate,
        productName: products.name,
        productSku: products.sku,
        quantity: saleItems.quantity,
        unitPrice: saleItems.unitPrice,
        costPrice: saleItems.costPrice,
        lineTotal: saleItems.lineTotal,
        customerName: customers.name,
      })
      .from(saleItems)
      .leftJoin(sales, eq(saleItems.saleId, sales.id))
      .leftJoin(products, eq(saleItems.productId, products.id))
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(eq(sales.status, "COMPLETED"))
      .orderBy(desc(sales.saleDate));

    const items = rows.map((r) => {
      const price = num(r.unitPrice);
      const cost = num(r.costPrice);
      const qty = num(r.quantity);
      return {
        ...r,
        unitPrice: price,
        costPrice: cost,
        lineTotal: num(r.lineTotal),
        profit: (price - cost) * qty,
        margin: price > 0 ? ((price - cost) / price) * 100 : 0,
      };
    });
    const costTotal = items.reduce((a, b) => a + b.costPrice * b.quantity, 0);
    const revenue = items.reduce((a, b) => a + b.lineTotal, 0);
    return json({
      rows: items,
      totals: { count: items.length, revenue, cost: costTotal, profit: revenue - costTotal },
    });
  }

  // default: movement
  const rows = await db
    .select({
      id: inventoryTransactions.id,
      createdAt: inventoryTransactions.createdAt,
      type: inventoryTransactions.type,
      quantity: inventoryTransactions.quantity,
      note: inventoryTransactions.note,
      referenceType: inventoryTransactions.referenceType,
      productName: products.name,
      productSku: products.sku,
      warehouseName: warehouses.name,
      userName: users.name,
    })
    .from(inventoryTransactions)
    .leftJoin(products, eq(inventoryTransactions.productId, products.id))
    .leftJoin(warehouses, eq(inventoryTransactions.warehouseId, warehouses.id))
    .leftJoin(users, eq(inventoryTransactions.userId, users.id))
    .orderBy(desc(inventoryTransactions.createdAt))
    .limit(500);
  const items = rows.map((r) => ({ ...r, quantity: num(r.quantity) }));
  return json({
    rows: items,
    totals: {
      count: items.length,
      in: items.filter((r) => r.quantity > 0).reduce((a, b) => a + b.quantity, 0),
      out: items.filter((r) => r.quantity < 0).reduce((a, b) => a + Math.abs(b.quantity), 0),
    },
  });
}
