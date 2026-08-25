"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Field, Input, Select, Textarea, Card, btnPrimary, btnGhost } from "@/components/ui";
import { money } from "@/lib/format";
import { useAuth } from "@/components/AuthProvider";

type Product = { id: number; name: string; sku: string; costPrice: number };
type Supplier = { id: number; companyName: string };

type Line = { productId: string; quantity: string; unitCost: string };

export default function NewPurchasePage() {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = ["ADMIN", "MANAGER", "ACCOUNTANT", "INVENTORY"].includes(user?.role ?? "");

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: "1", unitCost: "" }]);
  const [tax, setTax] = useState("0");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/contacts?type=supplier", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/products", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([s, p]) => {
      setSuppliers(s.items ?? []);
      setProducts(p.products ?? []);
    });
  }, []);

  const pmap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const setLine = (idx: number, key: keyof Line, value: string) => {
    setLines((ls) => {
      const next = ls.map((l, i) => (i === idx ? { ...l, [key]: value } : l));
      if (key === "productId" && value) {
        const p = pmap.get(Number(value));
        if (p) next[idx] = { ...next[idx], unitCost: String(p.costPrice) };
      }
      return next;
    });
  };

  const addLine = () => setLines((ls) => [...ls, { productId: "", quantity: "1", unitCost: "" }]);
  const removeLine = (idx: number) => setLines((ls) => ls.filter((_, i) => i !== idx));

  const subtotal = lines.reduce((a, l) => a + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0);
  const taxVal = Number(tax) || 0;
  const total = subtotal + taxVal;

  const submit = async () => {
    setError("");
    setBusy(true);
    const items = lines
      .filter((l) => l.productId && Number(l.quantity) > 0)
      .map((l) => ({ productId: Number(l.productId), quantity: Number(l.quantity), unitCost: Number(l.unitCost) || undefined }));
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierId: Number(supplierId), orderDate, items, tax: taxVal, notes }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error || "Failed to create purchase order"); return; }
    router.push("/purchases");
  };

  if (!canManage) {
    return <Card className="p-8 text-center text-slate-500">You don't have permission to create purchase orders.</Card>;
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title="New Purchase Order" subtitle="Order stock from a supplier — goods enter the ledger when received" />
      <Card className="p-6">
        {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">{error}</div>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Supplier" required>
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">— Select supplier —</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.companyName}</option>)}
            </Select>
          </Field>
          <Field label="Order date" required>
            <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
          </Field>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Order items</h3>
            <button onClick={addLine} className={btnGhost}>＋ Add item</button>
          </div>
          <div className="space-y-3">
            {lines.map((l, idx) => (
              <div key={idx} className="grid grid-cols-12 items-end gap-2 rounded-lg border border-slate-200 p-3">
                <div className="col-span-12 sm:col-span-6">
                  <Field label="Product">
                    <Select value={l.productId} onChange={(e) => setLine(idx, "productId", e.target.value)}>
                      <option value="">— Select —</option>
                      {products.map((pr) => <option key={pr.id} value={pr.id}>{pr.name} ({pr.sku})</option>)}
                    </Select>
                  </Field>
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Field label="Qty">
                    <Input type="number" min="1" value={l.quantity} onChange={(e) => setLine(idx, "quantity", e.target.value)} />
                  </Field>
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Field label="Unit cost">
                    <Input type="number" min="0" step="0.01" value={l.unitCost} onChange={(e) => setLine(idx, "unitCost", e.target.value)} />
                  </Field>
                </div>
                <div className="col-span-3 sm:col-span-1 pb-1 text-right text-sm font-semibold text-slate-900">
                  {money((Number(l.quantity) || 0) * (Number(l.unitCost) || 0))}
                </div>
                <div className="col-span-1 flex justify-end">
                  <button onClick={() => removeLine(idx)} disabled={lines.length === 1} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 disabled:opacity-30">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Tax ($)">
            <Input type="number" min="0" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
          </Field>
          <div />
          <div className="space-y-1 rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Tax</span><span>{money(taxVal)}</span></div>
            <div className="flex justify-between text-lg font-bold text-slate-900"><span>Total</span><span>{money(total)}</span></div>
          </div>
        </div>

        <div className="mt-4">
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions, terms…" />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => router.push("/purchases")} className={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={busy} className={btnPrimary}>{busy ? "Creating…" : "Create purchase order"}</button>
        </div>
      </Card>
    </div>
  );
}
