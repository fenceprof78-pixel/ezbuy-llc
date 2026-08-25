"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Card, PageHeader, Spinner, Modal, Field, Input, Select, Textarea, StatusBadge,
  Th, Td, btnPrimary, btnGhost, btnDanger, EmptyState,
} from "@/components/ui";
import { money, fmtNumber } from "@/lib/format";
import { useAuth } from "@/components/AuthProvider";

type Product = {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  categoryId: number | null;
  brandId: number | null;
  supplierId: number | null;
  defaultWarehouseId: number | null;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  imageUrl: string | null;
  status: "ACTIVE" | "INACTIVE";
  categoryName?: string;
  brandName?: string;
  supplierName?: string;
  warehouseName?: string;
  stock: number;
  lowStock: boolean;
};

const emptyForm = {
  name: "", sku: "", barcode: "", description: "",
  categoryId: "", brandId: "", supplierId: "", defaultWarehouseId: "",
  costPrice: "", sellingPrice: "", reorderLevel: "5", status: "ACTIVE", imageUrl: "",
};

export default function ProductsPage() {
  const { user } = useAuth();
  const canManage = ["ADMIN", "MANAGER", "INVENTORY"].includes(user?.role ?? "");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [p, c, b, s, w] = await Promise.all([
      fetch("/api/products", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/catalog?type=category", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/catalog?type=brand", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/contacts?type=supplier", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/warehouses", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setProducts(p.products ?? []);
    setCategories(c.items ?? []);
    setBrands(b.items ?? []);
    setSuppliers(s.items ?? []);
    setWarehouses(w.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, sku: p.sku, barcode: p.barcode ?? "", description: p.description ?? "",
      categoryId: p.categoryId ? String(p.categoryId) : "", brandId: p.brandId ? String(p.brandId) : "",
      supplierId: p.supplierId ? String(p.supplierId) : "", defaultWarehouseId: p.defaultWarehouseId ? String(p.defaultWarehouseId) : "",
      costPrice: String(p.costPrice), sellingPrice: String(p.sellingPrice),
      reorderLevel: String(p.reorderLevel), status: p.status, imageUrl: p.imageUrl ?? "",
    });
    setModalOpen(true);
  };

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      categoryId: form.categoryId || null,
      brandId: form.brandId || null,
      supplierId: form.supplierId || null,
      defaultWarehouseId: form.defaultWarehouseId || null,
      costPrice: Number(form.costPrice) || 0,
      sellingPrice: Number(form.sellingPrice) || 0,
      reorderLevel: Number(form.reorderLevel) || 0,
      imageUrl: form.imageUrl || null,
    };
    const res = await fetch(editing ? `/api/products/${editing.id}` : "/api/products", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Save failed"); return; }
    setModalOpen(false);
    load();
  };

  const remove = async (p: Product) => {
    if (!confirm(`Delete product "${p.name}"?`)) return;
    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Delete failed"); return; }
    load();
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { alert(data.error || "Upload failed"); return; }
    set("imageUrl", data.url);
  };

  const filtered = q
    ? products.filter((p) => (p.name + p.sku + (p.barcode ?? "")).toLowerCase().includes(q.toLowerCase()))
    : products;

  const totalStockValue = products.reduce((a, p) => a + p.stock * p.costPrice, 0);

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={`${products.length} products · stock value ${money(totalStockValue)}`}
        actions={
          canManage && (
            <button onClick={openNew} className={btnPrimary}>＋ Add Product</button>
          )
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, SKU or barcode…"
          className="w-full max-w-md rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <span className="text-sm text-slate-500">{filtered.length} shown</span>
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Card><EmptyState message="No products found" /></Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <Th>Product</Th>
                <Th>Category</Th>
                <Th>Brand</Th>
                <Th className="text-right">Cost</Th>
                <Th className="text-right">Price</Th>
                <Th className="text-right">Stock</Th>
                <Th className="text-right">Reorder</Th>
                <Th>Supplier</Th>
                <Th>Status</Th>
                {canManage && <Th className="text-right">Actions</Th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-lg">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          "📦"
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.sku}{p.barcode ? ` · ${p.barcode}` : ""}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>{p.categoryName ?? "—"}</Td>
                  <Td>{p.brandName ?? "—"}</Td>
                  <Td className="text-right">{money(p.costPrice)}</Td>
                  <Td className="text-right font-medium">{money(p.sellingPrice)}</Td>
                  <Td className="text-right">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                      p.stock <= p.reorderLevel ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {fmtNumber(p.stock)}
                    </span>
                  </Td>
                  <Td className="text-right text-slate-500">{p.reorderLevel}</Td>
                  <Td className="text-slate-500">{p.supplierName ?? "—"}</Td>
                  <Td><StatusBadge status={p.status} /></Td>
                  {canManage && (
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(p)} className="rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">Edit</button>
                        <button onClick={() => remove(p)} className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">Delete</button>
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${editing.name}` : "Add Product"} wide>
        {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">{error}</div>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Product name" required>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nike Air Max" />
          </Field>
          <Field label="SKU" required>
            <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="EZ-SHOE-001" />
          </Field>
          <Field label="Barcode">
            <Input value={form.barcode} onChange={(e) => set("barcode", e.target.value)} placeholder="123456789012" />
          </Field>
          <Field label="Category">
            <Select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              <option value="">— None —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Brand">
            <Select value={form.brandId} onChange={(e) => set("brandId", e.target.value)}>
              <option value="">— None —</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          <Field label="Supplier">
            <Select value={form.supplierId} onChange={(e) => set("supplierId", e.target.value)}>
              <option value="">— None —</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.companyName}</option>)}
            </Select>
          </Field>
          <Field label="Default warehouse">
            <Select value={form.defaultWarehouseId} onChange={(e) => set("defaultWarehouseId", e.target.value)}>
              <option value="">— None —</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </Field>
          <Field label="Cost price ($)" required>
            <Input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} />
          </Field>
          <Field label="Selling price ($)" required>
            <Input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => set("sellingPrice", e.target.value)} />
          </Field>
          <Field label="Reorder level" hint="Alert when stock drops to this level">
            <Input type="number" min="0" value={form.reorderLevel} onChange={(e) => set("reorderLevel", e.target.value)} />
          </Field>
          <Field label="Product image">
            <div className="flex items-center gap-2">
              <Input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="/uploads/… or https://…" />
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
              <button type="button" onClick={() => fileRef.current?.click()} className={`${btnGhost} shrink-0`} disabled={uploading}>
                {uploading ? "…" : "Upload"}
              </button>
            </div>
            {form.imageUrl && (
              <img src={form.imageUrl} alt="preview" className="mt-2 h-16 w-16 rounded-lg border border-slate-200 object-cover" />
            )}
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional details…" />
            </Field>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setModalOpen(false)} className={btnGhost}>Cancel</button>
          <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? "Saving…" : editing ? "Save changes" : "Create product"}</button>
        </div>
      </Modal>
    </div>
  );
}
