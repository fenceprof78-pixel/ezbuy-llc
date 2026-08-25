import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  numeric,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "ADMIN",
  "MANAGER",
  "SALES",
  "INVENTORY",
  "ACCOUNTANT",
]);

export const productStatusEnum = pgEnum("product_status", ["ACTIVE", "INACTIVE"]);

export const txnTypeEnum = pgEnum("txn_type", [
  "RECEIVE", // stock in from purchases / manual receiving
  "ISSUE", // manual stock out
  "SALE", // stock out from a sale
  "RETURN_IN", // customer returns goods -> stock back in
  "RETURN_OUT", // goods returned to supplier -> stock out
  "ADJUSTMENT", // physical count correction (+/-)
  "DAMAGE", // damaged / lost stock (-)
  "TRANSFER_IN", // stock arriving from another warehouse (+)
  "TRANSFER_OUT", // stock leaving to another warehouse (-)
]);

export const paymentStatusEnum = pgEnum("payment_status", ["UNPAID", "PARTIAL", "PAID"]);

export const purchaseStatusEnum = pgEnum("purchase_status", [
  "DRAFT",
  "ORDERED",
  "RECEIVED",
  "CANCELLED",
]);

export const saleStatusEnum = pgEnum("sale_status", [
  "DRAFT",
  "CONFIRMED",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
]);

// ─── Users & Roles ────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("SALES"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Catalog (categories, brands) ─────────────────────────────────────────────

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Contacts ─────────────────────────────────────────────────────────────────

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  paymentTerms: text("payment_terms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Warehouses ───────────────────────────────────────────────────────────────

export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  location: text("location"),
  manager: text("manager"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Products ─────────────────────────────────────────────────────────────────

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    sku: text("sku").notNull().unique(),
    barcode: text("barcode"),
    name: text("name").notNull(),
    description: text("description"),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    brandId: integer("brand_id").references(() => brands.id, {
      onDelete: "set null",
    }),
    supplierId: integer("supplier_id").references(() => suppliers.id, {
      onDelete: "set null",
    }),
    defaultWarehouseId: integer("default_warehouse_id").references(
      () => warehouses.id,
      { onDelete: "set null" },
    ),
    costPrice: numeric("cost_price", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    sellingPrice: numeric("selling_price", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    reorderLevel: integer("reorder_level").notNull().default(5),
    imageUrl: text("image_url"),
    status: productStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_products_name").on(t.name)],
);

// ─── Inventory ledger ─────────────────────────────────────────────────────────
// The single source of truth for stock. Current stock is ALWAYS derived by
// summing these signed quantities — never stored as a static column.

export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    warehouseId: integer("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "restrict" }),
    type: txnTypeEnum("type").notNull(),
    // signed quantity: positive = stock in, negative = stock out
    quantity: integer("quantity").notNull(),
    referenceType: text("reference_type"), // SALE | PURCHASE | MANUAL | TRANSFER
    referenceId: integer("reference_id"),
    note: text("note"),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_txn_product").on(t.productId),
    index("idx_txn_created").on(t.createdAt),
    index("idx_txn_ref").on(t.referenceType, t.referenceId),
  ],
);

// ─── Sales ────────────────────────────────────────────────────────────────────

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  saleDate: timestamp("sale_date").notNull().defaultNow(),
  status: saleStatusEnum("status").notNull().default("CONFIRMED"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("UNPAID"),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }).notNull().default("0"),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
});

// ─── Purchases ────────────────────────────────────────────────────────────────

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  poNumber: text("po_number").notNull().unique(),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  orderDate: timestamp("order_date").notNull().defaultNow(),
  status: purchaseStatusEnum("status").notNull().default("ORDERED"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("UNPAID"),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const purchaseItems = pgTable("purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id")
    .notNull()
    .references(() => purchases.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Brand = typeof brands.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Warehouse = typeof warehouses.$inferSelect;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
export type PurchaseItem = typeof purchaseItems.$inferSelect;

export const moneyFields = sql`numeric`;
