# EZBUY — Inventory Management System (Phase 1 + Core Inventory)

A working web application for EZBUY LLC, built with **Flask + SQLAlchemy**,
following the module list and phased build plan you outlined.

This is the **v1 foundation**: everything in Phase 1, plus the core Inventory
ledger (Phase 2) and simple Sales/Purchase order creation (Phases 3–4), since
those are what make stock levels actually work end-to-end.

## What's included

- **Auth** — login/logout, role field on users (Admin, Manager, Sales, Inventory, Accountant)
- **Dashboard** — total products, total stock, stock value, low-stock count, total sales/purchases, outstanding payments, recent activity
- **Products** — SKU, barcode, category, supplier, cost/selling price, reorder level; live stock computed from the transaction ledger (not stored directly — matches the design in your notes)
- **Categories, Suppliers, Customers, Warehouses** — full CRUD
- **Inventory** — manual stock movements: PURCHASE, SALE, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT, DAMAGE, with full history
- **Sales Orders** — creating an order auto-generates a SALE inventory transaction and deducts stock
- **Purchase Orders** — creating an order auto-generates a PURCHASE inventory transaction and adds stock
- **Reports** — low-stock report, top stock-value report, full inventory report
- **Users** — Admin-only user management

## Not yet built (next phases, per your own roadmap)

Barcode scanning, audit logs, notifications, Excel/PDF export, multi-item
orders (currently one product per order — easy to extend to line items),
API integrations.

## Running it locally

```bash
cd ezbuy_app
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

python app.py
```

The app creates a local **SQLite** database (`ezbuy.db`) automatically on
first run, and seeds:

- Login: **admin / admin123**
- A "Main Warehouse"
- A "General" category

Open **http://localhost:5000** in your browser.

⚠️ Change the seeded admin password and `SECRET_KEY` before using this for
anything real.

## Switching to PostgreSQL

You already use Flask + PostgreSQL for your capstone dashboards, so this
drops in the same way. Set an environment variable before running:

```bash
export DATABASE_URL="postgresql://username:password@localhost:5432/ezbuy"
python app.py
```

Or with Flask's CLI once the env var is set:

```bash
flask --app app init-db
flask --app app run
```

## Project structure

```
ezbuy_app/
├── app.py              # Routes / application logic
├── models.py            # Database schema (SQLAlchemy models)
├── requirements.txt
├── templates/            # Jinja2 HTML templates
└── static/css/style.css  # Styling
```

## Database design notes

Stock is **never stored as a single number** — it's always derived by
summing the `InventoryTransaction` ledger for a product (purchases add,
sales/damage/transfers-out subtract, adjustments are signed). This matches
the "source of truth" principle from your original plan: every movement is
recorded, and current stock is calculated from history.

## Extending this

Natural next steps, in the order your roadmap suggests:

1. Multi-line sales/purchase orders (several products per order)
2. Barcode scanning on the Products/Inventory pages
3. Role-based permission checks beyond just Admin vs everyone else
4. Excel/PDF export on the Reports page
5. Audit log of who changed what
