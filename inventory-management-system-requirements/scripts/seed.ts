/* eslint-disable no-console */
import { db } from "../src/db";
import {
  users, categories, brands, warehouses, suppliers, customers, products,
  inventoryTransactions, sales, saleItems, purchases, purchaseItems,
} from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

const daysAgo = (d: number) => new Date(Date.now() - d * 86400000);

async function reset() {
  console.log("Clearing existing data…");
  await db.delete(inventoryTransactions);
  await db.delete(saleItems);
  await db.delete(sales);
  await db.delete(purchaseItems);
  await db.delete(purchases);
  await db.delete(products);
  await db.delete(customers);
  await db.delete(suppliers);
  await db.delete(warehouses);
  await db.delete(brands);
  await db.delete(categories);
  await db.delete(users);
}

async function main() {
  await reset();

  // ── Users ──
  const createdUsers = await db.insert(users).values([
    { name: "Amina Yusuf", email: "admin@ezbuy.com", passwordHash: hashPassword("admin123"), role: "ADMIN" },
    { name: "Daniel Okafor", email: "manager@ezbuy.com", passwordHash: hashPassword("manager123"), role: "MANAGER" },
    { name: "Sara Miller", email: "sales@ezbuy.com", passwordHash: hashPassword("sales123"), role: "SALES" },
    { name: "Tom Alvarez", email: "inv@ezbuy.com", passwordHash: hashPassword("inv123"), role: "INVENTORY" },
    { name: "Grace Chen", email: "acct@ezbuy.com", passwordHash: hashPassword("acct123"), role: "ACCOUNTANT" },
  ]).returning();
  const admin = createdUsers[0];
  console.log(`✓ ${createdUsers.length} users`);

  // ── Catalog ──
  const [catFootwear, catApparel, catAccessories, catElectronics, catHome] = await db.insert(categories)
    .values([
      { name: "Footwear", description: "Shoes, sneakers and boots" },
      { name: "Apparel", description: "Clothing and textiles" },
      { name: "Accessories", description: "Phone cases, bags and extras" },
      { name: "Electronics", description: "Gadgets and cables" },
      { name: "Home", description: "Home and office goods" },
    ]).returning();

  const [brandNike, brandAdidas, brandApple, brandSamsung, brandGeneric] = await db.insert(brands)
    .values([
      { name: "Nike" }, { name: "Adidas" }, { name: "Apple" }, { name: "Samsung" }, { name: "Generic" },
    ]).returning();

  // ── Warehouses ──
  const [whMain, whEast] = await db.insert(warehouses).values([
    { name: "Main Warehouse", location: "12 Commerce Ave, Springfield", manager: "Tom Alvarez" },
    { name: "East Side Storage", location: "88 Industrial Rd, Eastside", manager: "Daniel Okafor" },
  ]).returning();

  // ── Contacts ──
  const [supNike, supTech, supBulk] = await db.insert(suppliers).values([
    { companyName: "Nike Wholesale Ltd", contactPerson: "Chris Palmer", phone: "+1 555-0101", email: "orders@nikewholesale.com", address: "1 Beaverton Way, Oregon", paymentTerms: "Net 30" },
    { companyName: "TechSource Inc", contactPerson: "Linda Park", phone: "+1 555-0102", email: "sales@techsource.io", address: "500 Silicon Blvd, Austin TX", paymentTerms: "Net 15" },
    { companyName: "BulkGoods Trading", contactPerson: "Omar Haddad", phone: "+1 555-0103", email: "info@bulkgoods.com", address: "77 Harbor St, Miami FL", paymentTerms: "Net 45" },
  ]).returning();

  const [custAcme, custJohn, custJane, custCity] = await db.insert(customers).values([
    { name: "Acme Retail", phone: "+1 555-0201", email: "buyer@acmeretail.com", address: "300 Market St, Denver CO" },
    { name: "John Doe", phone: "+1 555-0202", email: "john.doe@gmail.com", address: "14 Maple Rd, Austin TX" },
    { name: "Jane Smith", phone: "+1 555-0203", email: "jane.smith@yahoo.com", address: "9 Oak Lane, Portland OR" },
    { name: "City Mart", phone: "+1 555-0204", email: "purchasing@citymart.com", address: "2 Town Square, Chicago IL" },
  ]).returning();

  // ── Products ──
  const p = await db.insert(products).values([
    { sku: "EZ-SHOE-001", barcode: "100000000001", name: "Nike Air Max 270", description: "Classic running sneaker, black/white", categoryId: catFootwear.id, brandId: brandNike.id, supplierId: supNike.id, defaultWarehouseId: whMain.id, costPrice: "50.00", sellingPrice: "85.00", reorderLevel: 10 },
    { sku: "EZ-SHOE-002", barcode: "100000000002", name: "Adidas Ultraboost", description: "Comfortable knit running shoe", categoryId: catFootwear.id, brandId: brandAdidas.id, supplierId: supNike.id, defaultWarehouseId: whMain.id, costPrice: "60.00", sellingPrice: "100.00", reorderLevel: 8 },
    { sku: "EZ-APP-001", barcode: "100000000003", name: "Cotton T-Shirt", description: "100% cotton crew neck, assorted colors", categoryId: catApparel.id, brandId: brandGeneric.id, supplierId: supBulk.id, defaultWarehouseId: whMain.id, costPrice: "8.00", sellingPrice: "20.00", reorderLevel: 20 },
    { sku: "EZ-APP-002", barcode: "100000000004", name: "Denim Jeans", description: "Slim fit denim jeans", categoryId: catApparel.id, brandId: brandGeneric.id, supplierId: supBulk.id, defaultWarehouseId: whMain.id, costPrice: "18.00", sellingPrice: "45.00", reorderLevel: 15 },
    { sku: "EZ-ACC-001", barcode: "100000000005", name: "iPhone 15 Case", description: "Shockproof clear case", categoryId: catAccessories.id, brandId: brandApple.id, supplierId: supTech.id, defaultWarehouseId: whMain.id, costPrice: "5.00", sellingPrice: "25.00", reorderLevel: 20 },
    { sku: "EZ-ELE-001", barcode: "100000000006", name: "USB-C Cable 2m", description: "Fast-charge braided cable", categoryId: catElectronics.id, brandId: brandSamsung.id, supplierId: supTech.id, defaultWarehouseId: whMain.id, costPrice: "3.00", sellingPrice: "15.00", reorderLevel: 30 },
    { sku: "EZ-ELE-002", barcode: "100000000007", name: "Wireless Mouse", description: "Ergonomic 2.4GHz wireless mouse", categoryId: catElectronics.id, brandId: brandGeneric.id, supplierId: supTech.id, defaultWarehouseId: whMain.id, costPrice: "12.00", sellingPrice: "35.00", reorderLevel: 10 },
    { sku: "EZ-HOM-001", barcode: "100000000008", name: "LED Desk Lamp", description: "Dimmable USB desk lamp", categoryId: catHome.id, brandId: brandGeneric.id, supplierId: supBulk.id, defaultWarehouseId: whEast.id, costPrice: "20.00", sellingPrice: "50.00", reorderLevel: 8 },
    { sku: "EZ-ELE-003", barcode: "100000000009", name: "Bluetooth Speaker", description: "Portable waterproof speaker", categoryId: catElectronics.id, brandId: brandSamsung.id, supplierId: supTech.id, defaultWarehouseId: whMain.id, costPrice: "22.00", sellingPrice: "60.00", reorderLevel: 10 },
    { sku: "EZ-APP-003", barcode: "100000000010", name: "Running Socks 3-Pack", description: "Cushioned athletic socks", categoryId: catApparel.id, brandId: brandNike.id, supplierId: supNike.id, defaultWarehouseId: whMain.id, costPrice: "6.00", sellingPrice: "18.00", reorderLevel: 25 },
  ]).returning();
  const byName = Object.fromEntries(p.map((x) => [x.name, x]));
  console.log(`✓ ${p.length} products`);

  // ── Opening stock (manual RECEIVE ledger entries) ──
  const opening: Record<string, [number, number]> = {
    "Nike Air Max 270": [20, whMain.id],
    "Adidas Ultraboost": [15, whMain.id],
    "Cotton T-Shirt": [100, whMain.id],
    "Denim Jeans": [40, whMain.id],
    "iPhone 15 Case": [40, whMain.id],
    "USB-C Cable 2m": [20, whMain.id],
    "Wireless Mouse": [25, whMain.id],
    "LED Desk Lamp": [15, whEast.id],
    "Running Socks 3-Pack": [30, whMain.id],
  };
  const openingTxns = Object.entries(opening).map(([name, [qty, wh]]) => ({
    productId: byName[name].id,
    warehouseId: wh,
    type: "RECEIVE" as const,
    quantity: qty,
    referenceType: "MANUAL",
    note: "Opening stock",
    userId: admin.id,
    createdAt: daysAgo(30),
  }));
  await db.insert(inventoryTransactions).values(openingTxns);
  console.log(`✓ opening stock recorded (${openingTxns.length} entries)`);

  // ── Sales ──
  const saleDefs = [
    {
      customerId: custAcme.id, days: 10, status: "COMPLETED", paymentStatus: "PAID", amountPaid: 0,
      items: [["Nike Air Max 270", 10], ["Cotton T-Shirt", 20], ["iPhone 15 Case", 10]],
    },
    {
      customerId: custJohn.id, days: 6, status: "SHIPPED", paymentStatus: "PARTIAL", amountPaid: 300,
      items: [["Adidas Ultraboost", 6], ["Nike Air Max 270", 6], ["Running Socks 3-Pack", 8]],
    },
    {
      customerId: custCity.id, days: 3, status: "CONFIRMED", paymentStatus: "UNPAID", amountPaid: 0,
      items: [["USB-C Cable 2m", 16], ["Cotton T-Shirt", 20], ["iPhone 15 Case", 10]],
    },
    {
      customerId: custJane.id, days: 1, status: "CONFIRMED", paymentStatus: "PAID", amountPaid: 0,
      items: [["Wireless Mouse", 5], ["Denim Jeans", 4], ["LED Desk Lamp", 2]],
    },
  ];

  let inv = 1;
  for (const sd of saleDefs) {
    const detail = sd.items.map(([name, qty]) => {
      const prod = byName[name as string];
      const q = qty as number;
      return { prod, qty: q, unitPrice: Number(prod.sellingPrice), costPrice: Number(prod.costPrice), lineTotal: q * Number(prod.sellingPrice) };
    });
    const subtotal = detail.reduce((a, d) => a + d.lineTotal, 0);
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const total = subtotal + tax;
    const invoiceNumber = `INV-${String(inv).padStart(4, "0")}`;
    const [sale] = await db.insert(sales).values({
      invoiceNumber,
      customerId: sd.customerId,
      saleDate: daysAgo(sd.days),
      status: sd.status as any,
      paymentStatus: sd.paymentStatus as any,
      amountPaid: String(sd.amountPaid || total),
      subtotal: String(subtotal),
      tax: String(tax),
      total: String(total),
      notes: "Seeded demo invoice",
      userId: admin.id,
    }).returning();
    for (const d of detail) {
      await db.insert(saleItems).values({
        saleId: sale.id, productId: d.prod.id, quantity: d.qty,
        unitPrice: String(d.unitPrice), costPrice: String(d.costPrice), lineTotal: String(d.lineTotal),
      });
      await db.insert(inventoryTransactions).values({
        productId: d.prod.id,
        warehouseId: d.prod.defaultWarehouseId ?? whMain.id,
        type: "SALE",
        quantity: -d.qty,
        referenceType: "SALE",
        referenceId: sale.id,
        note: `Invoice ${invoiceNumber}`,
        userId: admin.id,
        createdAt: daysAgo(sd.days),
      });
    }
    inv += 1;
  }
  console.log(`✓ ${saleDefs.length} sales with stock deductions`);

  // ── Purchase orders ──
  const [po1] = await db.insert(purchases).values({
    poNumber: "PO-0001",
    supplierId: supNike.id,
    orderDate: daysAgo(12),
    status: "RECEIVED",
    paymentStatus: "PAID",
    amountPaid: "340.00",
    subtotal: "340.00",
    tax: "0.00",
    total: "340.00",
    notes: "Restock order",
    userId: admin.id,
  }).returning();
  const po1Items: Array<[string, number]> = [["Cotton T-Shirt", 20], ["Denim Jeans", 10]];
  for (const [name, qty] of po1Items) {
    const prod = byName[name];
    const lineTotal = qty * Number(prod.costPrice);
    await db.insert(purchaseItems).values({
      purchaseId: po1.id, productId: prod.id, quantity: qty,
      unitCost: prod.costPrice, lineTotal: String(lineTotal),
    });
    await db.insert(inventoryTransactions).values({
      productId: prod.id,
      warehouseId: prod.defaultWarehouseId ?? whMain.id,
      type: "RECEIVE",
      quantity: qty,
      referenceType: "PURCHASE",
      referenceId: po1.id,
      note: "PO-0001 received",
      userId: admin.id,
      createdAt: daysAgo(11),
    });
  }

  const [po2] = await db.insert(purchases).values({
    poNumber: "PO-0002",
    supplierId: supTech.id,
    orderDate: daysAgo(2),
    status: "ORDERED",
    paymentStatus: "UNPAID",
    amountPaid: "0.00",
    subtotal: "250.00",
    tax: "0.00",
    total: "250.00",
    notes: "Awaiting delivery",
    userId: admin.id,
  }).returning();
  const po2Items: Array<[string, number]> = [["Bluetooth Speaker", 10], ["USB-C Cable 2m", 10]];
  for (const [name, qty] of po2Items) {
    const prod = byName[name];
    await db.insert(purchaseItems).values({
      purchaseId: po2.id, productId: prod.id, quantity: qty,
      unitCost: prod.costPrice, lineTotal: String(qty * Number(prod.costPrice)),
    });
  }

  console.log(`✓ 2 purchase orders (PO-0001 received, PO-0002 ordered)`);
  console.log("✅ Seed complete. Login: admin@ezbuy.com / admin123");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
