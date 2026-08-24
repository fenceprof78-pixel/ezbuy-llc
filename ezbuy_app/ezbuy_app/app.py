import os
from datetime import datetime
from flask import Flask, render_template, redirect, url_for, request, flash
from flask_login import (
    LoginManager, login_user, logout_user, login_required, current_user
)
from models import (
    db, User, Category, Supplier, Customer, Warehouse, Product,
    InventoryTransaction, SalesOrder, SalesOrderItem, PurchaseOrder,
    PurchaseOrderItem, ROLES, TRANSACTION_TYPES
)

basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "ezbuy-dev-secret-change-me")

# --- Database config -------------------------------------------------
# Default: local SQLite file, zero setup, works immediately.
# To use PostgreSQL instead (recommended for production / multi-user):
#   set the DATABASE_URL environment variable, e.g.
#   postgresql://user:password@localhost:5432/ezbuy
db_url = os.environ.get("DATABASE_URL", f"sqlite:///{os.path.join(basedir, 'ezbuy.db')}")
if db_url.startswith("postgres://"):  # Render/Heroku-style URLs
    db_url = db_url.replace("postgres://", "postgresql://", 1)
app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

login_manager = LoginManager(app)
login_manager.login_view = "login"


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# ----------------------------------------------------------------------
# Auth
# ----------------------------------------------------------------------
@app.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard"))
    if request.method == "POST":
        username = request.form["username"].strip()
        password = request.form["password"]
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for("dashboard"))
        flash("Invalid username or password.", "danger")
    return render_template("login.html")


@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("login"))


# ----------------------------------------------------------------------
# Dashboard
# ----------------------------------------------------------------------
@app.route("/")
@login_required
def dashboard():
    products = Product.query.all()
    total_products = len(products)
    total_stock = sum(p.current_stock for p in products)
    stock_value = sum(p.stock_value for p in products)
    low_stock = [p for p in products if p.current_stock <= p.reorder_level]

    total_sales = db.session.query(db.func.coalesce(db.func.sum(SalesOrder.total_amount), 0)).scalar()
    total_purchases = db.session.query(db.func.coalesce(db.func.sum(PurchaseOrder.total_amount), 0)).scalar()
    outstanding_sales = db.session.query(db.func.coalesce(db.func.sum(SalesOrder.total_amount), 0)).filter(
        SalesOrder.payment_status == "Unpaid"
    ).scalar()

    recent_transactions = InventoryTransaction.query.order_by(
        InventoryTransaction.transaction_date.desc()
    ).limit(10).all()

    return render_template(
        "dashboard.html",
        total_products=total_products,
        total_stock=total_stock,
        stock_value=stock_value,
        low_stock=low_stock,
        total_sales=total_sales,
        total_purchases=total_purchases,
        outstanding_sales=outstanding_sales,
        recent_transactions=recent_transactions,
    )


# ----------------------------------------------------------------------
# Categories
# ----------------------------------------------------------------------
@app.route("/categories", methods=["GET", "POST"])
@login_required
def categories():
    if request.method == "POST":
        c = Category(name=request.form["name"].strip(), description=request.form.get("description", ""))
        db.session.add(c)
        db.session.commit()
        flash("Category added.", "success")
        return redirect(url_for("categories"))
    return render_template("categories.html", categories=Category.query.order_by(Category.name).all())


@app.route("/categories/<int:cid>/delete", methods=["POST"])
@login_required
def delete_category(cid):
    c = Category.query.get_or_404(cid)
    db.session.delete(c)
    db.session.commit()
    flash("Category deleted.", "success")
    return redirect(url_for("categories"))


# ----------------------------------------------------------------------
# Suppliers
# ----------------------------------------------------------------------
@app.route("/suppliers", methods=["GET", "POST"])
@login_required
def suppliers():
    if request.method == "POST":
        s = Supplier(
            company_name=request.form["company_name"].strip(),
            contact_person=request.form.get("contact_person", ""),
            phone=request.form.get("phone", ""),
            email=request.form.get("email", ""),
            address=request.form.get("address", ""),
            payment_terms=request.form.get("payment_terms", ""),
        )
        db.session.add(s)
        db.session.commit()
        flash("Supplier added.", "success")
        return redirect(url_for("suppliers"))
    return render_template("suppliers.html", suppliers=Supplier.query.order_by(Supplier.company_name).all())


@app.route("/suppliers/<int:sid>/delete", methods=["POST"])
@login_required
def delete_supplier(sid):
    s = Supplier.query.get_or_404(sid)
    db.session.delete(s)
    db.session.commit()
    flash("Supplier deleted.", "success")
    return redirect(url_for("suppliers"))


# ----------------------------------------------------------------------
# Customers
# ----------------------------------------------------------------------
@app.route("/customers", methods=["GET", "POST"])
@login_required
def customers():
    if request.method == "POST":
        c = Customer(
            name=request.form["name"].strip(),
            phone=request.form.get("phone", ""),
            email=request.form.get("email", ""),
            address=request.form.get("address", ""),
        )
        db.session.add(c)
        db.session.commit()
        flash("Customer added.", "success")
        return redirect(url_for("customers"))
    return render_template("customers.html", customers=Customer.query.order_by(Customer.name).all())


@app.route("/customers/<int:cid>/delete", methods=["POST"])
@login_required
def delete_customer(cid):
    c = Customer.query.get_or_404(cid)
    db.session.delete(c)
    db.session.commit()
    flash("Customer deleted.", "success")
    return redirect(url_for("customers"))


# ----------------------------------------------------------------------
# Warehouses
# ----------------------------------------------------------------------
@app.route("/warehouses", methods=["GET", "POST"])
@login_required
def warehouses():
    if request.method == "POST":
        w = Warehouse(
            name=request.form["name"].strip(),
            location=request.form.get("location", ""),
            manager=request.form.get("manager", ""),
        )
        db.session.add(w)
        db.session.commit()
        flash("Warehouse added.", "success")
        return redirect(url_for("warehouses"))
    return render_template("warehouses.html", warehouses=Warehouse.query.order_by(Warehouse.name).all())


@app.route("/warehouses/<int:wid>/delete", methods=["POST"])
@login_required
def delete_warehouse(wid):
    w = Warehouse.query.get_or_404(wid)
    db.session.delete(w)
    db.session.commit()
    flash("Warehouse deleted.", "success")
    return redirect(url_for("warehouses"))


# ----------------------------------------------------------------------
# Products
# ----------------------------------------------------------------------
@app.route("/products", methods=["GET", "POST"])
@login_required
def products():
    if request.method == "POST":
        p = Product(
            sku=request.form["sku"].strip(),
            name=request.form["name"].strip(),
            barcode=request.form.get("barcode", ""),
            description=request.form.get("description", ""),
            cost_price=request.form.get("cost_price") or 0,
            selling_price=request.form.get("selling_price") or 0,
            reorder_level=request.form.get("reorder_level") or 10,
            category_id=request.form.get("category_id") or None,
            supplier_id=request.form.get("supplier_id") or None,
            status=request.form.get("status", "Active"),
        )
        db.session.add(p)
        db.session.commit()
        flash("Product added.", "success")
        return redirect(url_for("products"))
    return render_template(
        "products.html",
        products=Product.query.order_by(Product.name).all(),
        categories=Category.query.order_by(Category.name).all(),
        suppliers=Supplier.query.order_by(Supplier.company_name).all(),
    )


@app.route("/products/<int:pid>/delete", methods=["POST"])
@login_required
def delete_product(pid):
    p = Product.query.get_or_404(pid)
    db.session.delete(p)
    db.session.commit()
    flash("Product deleted.", "success")
    return redirect(url_for("products"))


# ----------------------------------------------------------------------
# Inventory transactions (stock in / out / adjustment / transfer)
# ----------------------------------------------------------------------
@app.route("/inventory", methods=["GET", "POST"])
@login_required
def inventory():
    if request.method == "POST":
        t = InventoryTransaction(
            product_id=request.form["product_id"],
            warehouse_id=request.form["warehouse_id"],
            transaction_type=request.form["transaction_type"],
            quantity=int(request.form["quantity"]),
            reference_id=request.form.get("reference_id", ""),
            notes=request.form.get("notes", ""),
            user_id=current_user.id,
        )
        db.session.add(t)
        db.session.commit()
        flash("Inventory transaction recorded.", "success")
        return redirect(url_for("inventory"))
    transactions = InventoryTransaction.query.order_by(InventoryTransaction.transaction_date.desc()).limit(100).all()
    return render_template(
        "inventory.html",
        transactions=transactions,
        products=Product.query.order_by(Product.name).all(),
        warehouses=Warehouse.query.order_by(Warehouse.name).all(),
        transaction_types=TRANSACTION_TYPES,
    )


# ----------------------------------------------------------------------
# Sales orders
# ----------------------------------------------------------------------
@app.route("/sales", methods=["GET", "POST"])
@login_required
def sales():
    if request.method == "POST":
        product = Product.query.get(request.form["product_id"])
        qty = int(request.form["quantity"])
        unit_price = float(request.form.get("unit_price") or product.selling_price)
        warehouse_id = request.form["warehouse_id"]

        order = SalesOrder(customer_id=request.form.get("customer_id") or None, total_amount=qty * unit_price)
        db.session.add(order)
        db.session.flush()  # get order.id

        item = SalesOrderItem(order_id=order.id, product_id=product.id, quantity=qty, unit_price=unit_price)
        db.session.add(item)

        txn = InventoryTransaction(
            product_id=product.id,
            warehouse_id=warehouse_id,
            transaction_type="SALE",
            quantity=qty,
            reference_id=f"SO-{order.id}",
            user_id=current_user.id,
            notes="Auto-created from sales order",
        )
        db.session.add(txn)
        db.session.commit()
        flash(f"Sales order #{order.id} created and stock updated.", "success")
        return redirect(url_for("sales"))

    orders = SalesOrder.query.order_by(SalesOrder.order_date.desc()).all()
    return render_template(
        "sales.html",
        orders=orders,
        products=Product.query.order_by(Product.name).all(),
        customers=Customer.query.order_by(Customer.name).all(),
        warehouses=Warehouse.query.order_by(Warehouse.name).all(),
    )


@app.route("/sales/<int:oid>/mark_paid", methods=["POST"])
@login_required
def mark_sale_paid(oid):
    o = SalesOrder.query.get_or_404(oid)
    o.payment_status = "Paid"
    o.status = "Completed"
    db.session.commit()
    return redirect(url_for("sales"))


# ----------------------------------------------------------------------
# Purchase orders
# ----------------------------------------------------------------------
@app.route("/purchases", methods=["GET", "POST"])
@login_required
def purchases():
    if request.method == "POST":
        product = Product.query.get(request.form["product_id"])
        qty = int(request.form["quantity"])
        unit_cost = float(request.form.get("unit_cost") or product.cost_price)
        warehouse_id = request.form["warehouse_id"]

        order = PurchaseOrder(supplier_id=request.form.get("supplier_id") or None, total_amount=qty * unit_cost)
        db.session.add(order)
        db.session.flush()

        item = PurchaseOrderItem(order_id=order.id, product_id=product.id, quantity=qty, unit_cost=unit_cost)
        db.session.add(item)

        txn = InventoryTransaction(
            product_id=product.id,
            warehouse_id=warehouse_id,
            transaction_type="PURCHASE",
            quantity=qty,
            reference_id=f"PO-{order.id}",
            user_id=current_user.id,
            notes="Auto-created from purchase order",
        )
        db.session.add(txn)
        db.session.commit()
        flash(f"Purchase order #{order.id} created and stock updated.", "success")
        return redirect(url_for("purchases"))

    orders = PurchaseOrder.query.order_by(PurchaseOrder.order_date.desc()).all()
    return render_template(
        "purchases.html",
        orders=orders,
        products=Product.query.order_by(Product.name).all(),
        suppliers=Supplier.query.order_by(Supplier.company_name).all(),
        warehouses=Warehouse.query.order_by(Warehouse.name).all(),
    )


@app.route("/purchases/<int:oid>/mark_paid", methods=["POST"])
@login_required
def mark_purchase_paid(oid):
    o = PurchaseOrder.query.get_or_404(oid)
    o.payment_status = "Paid"
    o.status = "Received"
    db.session.commit()
    return redirect(url_for("purchases"))


# ----------------------------------------------------------------------
# Reports
# ----------------------------------------------------------------------
@app.route("/reports")
@login_required
def reports():
    products = Product.query.all()
    low_stock = [p for p in products if p.current_stock <= p.reorder_level]
    top_value = sorted(products, key=lambda p: p.stock_value, reverse=True)[:10]
    return render_template("reports.html", low_stock=low_stock, top_value=top_value, products=products)


# ----------------------------------------------------------------------
# Users (Admin only, simplified)
# ----------------------------------------------------------------------
@app.route("/users", methods=["GET", "POST"])
@login_required
def users():
    if current_user.role != "Admin":
        flash("Only Admins can manage users.", "danger")
        return redirect(url_for("dashboard"))
    if request.method == "POST":
        u = User(
            username=request.form["username"].strip(),
            full_name=request.form.get("full_name", ""),
            role=request.form.get("role", "Sales"),
        )
        u.set_password(request.form["password"])
        db.session.add(u)
        db.session.commit()
        flash("User created.", "success")
        return redirect(url_for("users"))
    return render_template("users.html", users=User.query.all(), roles=ROLES)


# ----------------------------------------------------------------------
# CLI: init-db with seed data
# ----------------------------------------------------------------------
@app.cli.command("init-db")
def init_db():
    """Create tables and seed an initial admin user + sample data."""
    db.create_all()

    if not User.query.filter_by(username="admin").first():
        admin = User(username="admin", full_name="Administrator", role="Admin")
        admin.set_password("admin123")
        db.session.add(admin)

    if not Warehouse.query.first():
        db.session.add(Warehouse(name="Main Warehouse", location="Manila", manager="Admin"))

    if not Category.query.first():
        db.session.add(Category(name="General", description="Default category"))

    db.session.commit()
    print("Database initialized. Login with username=admin / password=admin123")


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        if not User.query.filter_by(username="admin").first():
            admin = User(username="admin", full_name="Administrator", role="Admin")
            admin.set_password("admin123")
            db.session.add(admin)
        if not Warehouse.query.first():
            db.session.add(Warehouse(name="Main Warehouse", location="Manila", manager="Admin"))
        if not Category.query.first():
            db.session.add(Category(name="General", description="Default category"))
        db.session.commit()
    app.run(debug=True, host="0.0.0.0", port=5000)
