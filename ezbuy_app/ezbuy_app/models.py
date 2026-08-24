from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

ROLES = ["Admin", "Manager", "Sales", "Inventory", "Accountant"]
TRANSACTION_TYPES = ["PURCHASE", "SALE", "ADJUSTMENT", "TRANSFER_IN", "TRANSFER_OUT", "DAMAGE"]


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="Sales")
    full_name = db.Column(db.String(120))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.String(255))

    products = db.relationship("Product", backref="category", lazy=True)


class Supplier(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    company_name = db.Column(db.String(150), nullable=False)
    contact_person = db.Column(db.String(120))
    phone = db.Column(db.String(30))
    email = db.Column(db.String(120))
    address = db.Column(db.String(255))
    payment_terms = db.Column(db.String(100))

    products = db.relationship("Product", backref="supplier", lazy=True)


class Customer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(30))
    email = db.Column(db.String(120))
    address = db.Column(db.String(255))


class Warehouse(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    location = db.Column(db.String(255))
    manager = db.Column(db.String(120))


class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(150), nullable=False)
    barcode = db.Column(db.String(100))
    description = db.Column(db.String(255))
    cost_price = db.Column(db.Numeric(10, 2), default=0)
    selling_price = db.Column(db.Numeric(10, 2), default=0)
    reorder_level = db.Column(db.Integer, default=10)
    status = db.Column(db.String(20), default="Active")
    image_url = db.Column(db.String(255))

    category_id = db.Column(db.Integer, db.ForeignKey("category.id"))
    supplier_id = db.Column(db.Integer, db.ForeignKey("supplier.id"))

    transactions = db.relationship("InventoryTransaction", backref="product", lazy=True)

    @property
    def current_stock(self):
        total = 0
        for t in self.transactions:
            if t.transaction_type in ("PURCHASE", "TRANSFER_IN"):
                total += t.quantity
            elif t.transaction_type in ("SALE", "DAMAGE", "TRANSFER_OUT"):
                total -= t.quantity
            elif t.transaction_type == "ADJUSTMENT":
                total += t.quantity  # signed value: can be negative
        return total

    @property
    def stock_value(self):
        return float(self.cost_price or 0) * self.current_stock


class InventoryTransaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    warehouse_id = db.Column(db.Integer, db.ForeignKey("warehouse.id"), nullable=False)
    transaction_type = db.Column(db.String(20), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)  # always positive except ADJUSTMENT (signed)
    reference_id = db.Column(db.String(50))
    transaction_date = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    notes = db.Column(db.String(255))

    warehouse = db.relationship("Warehouse")
    user = db.relationship("User")


class SalesOrder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customer.id"))
    order_date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default="Pending")  # Pending, Paid, Cancelled
    payment_status = db.Column(db.String(20), default="Unpaid")
    total_amount = db.Column(db.Numeric(10, 2), default=0)

    customer = db.relationship("Customer")
    items = db.relationship("SalesOrderItem", backref="order", lazy=True, cascade="all, delete-orphan")


class SalesOrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("sales_order.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)

    product = db.relationship("Product")


class PurchaseOrder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey("supplier.id"))
    order_date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default="Pending")  # Pending, Received, Cancelled
    payment_status = db.Column(db.String(20), default="Unpaid")
    total_amount = db.Column(db.Numeric(10, 2), default=0)

    supplier = db.relationship("Supplier")
    items = db.relationship("PurchaseOrderItem", backref="order", lazy=True, cascade="all, delete-orphan")


class PurchaseOrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("purchase_order.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_cost = db.Column(db.Numeric(10, 2), nullable=False)

    product = db.relationship("Product")
