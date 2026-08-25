"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Field, Input, Select, Textarea, Card, btnPrimary, btnGhost } from "@/components/ui";
import { money } from "@/lib/format";
import { useAuth } from "@/components/AuthProvider";

type Product = { id: number; name: string; sku: string; sellingPrice: number; stock: number };
type Customer = { id: number; name: string };

type Line = { productId: string; quantity: string; unitPrice: string };

export default function NewSalePage() {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = ["ADMIN", "MANAGER", "SALES", "ACCOUNTANT"].includes(user?.role ?? "");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: "1", unitPrice: "" }]);
  const [tax, setTax] = useState("0");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/contacts?type=customer", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/products", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([c, p]) => {
      setCustomers(c.items ?? []);
      setProducts(p.products ?? []);
    });
  }, []);

  const pmap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const setLine = (idx: number, key: keyof Line, value: string) => {
    setLines((ls) => {
      const next = ls.map((l, i) => (i === idx ? { ...l, [key]: value } : l));
      if (key === "productId" && value) {
        const p = pmap.get(Number(value));
        if (p) next[idx] = { ...next[idx], unitPrice: String(p.sellingPrice) };
      }
      return next;
    });
  };

  const addLine = () => setLines((ls) => [...ls, { productId: "", quantity: "1", unitPrice: "" }]);
  const removeLine = (idx: number) => setLines((ls) => ls.filter((_, i) => i !== idx));

  const subtotal = lines.reduce((a, l) => a + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
  const taxVal = Number(tax) || 0;
  const total = subtotal + taxVal;

  const submit = async () => {
    setError("");
    setBusy(true);
    const items = lines
      .filter((l) => l.productId && Number(l.quantity) > 0)
      .map((l) => ({ productId: Number(l.productId), quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) || undefined }));
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: Number(customerId), saleDate, items, tax: taxVal, notes }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error || "Failed to create sale"); return; }
    router.push("/sales");
  };

  if (!canManage) {
    return <Card className="p-8 text-center text-slate-500">You don't have permission to create sales.</Card>;
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title="New Sale / Invoice" subtitle="Create an invoice — stock is deducted automatically" />
      <Card className="p-6">
        {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">{error}</div>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Customer" required>
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— Select customer —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Invoice date" required>
            <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
          </Field>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Line items</h3>
            <button onClick={addLine} className={btnGhost}>＋ Add item</button>
          </div>
          <div className="space-y-3">
            {lines.map((l, idx) => {
              const p = l.productId ? pmap.get(Number(l.productId)) : null;
              return (
                <div key={idx} className="grid grid-cols-12 items-end gap-2 rounded-lg border border-slate-200 p-3">
                  <div className="col-span-12 sm:col-span-5">
                    <Field label="Product">
                      <Select value={l.productId} onChange={(e) => setLine(idx, "productId", e.target.value)}>
                        <option value="">— Select —</option>
                        {products.map((pr) => (
                          <option key={pr.id} value={pr.id}>
                            {pr.name} ({pr.stock} in stock)
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Field label="Qty">
                      <Input type="number" min="1" value={l.quantity} onChange={(e) => setLine(idx, "quantity", e.target.value)} />
                    </Field>
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Field label="Unit price">
                      <Input type="number" min="0" step="0.01" value={l.unitPrice} onChange={(e) => setLine(idx, "unitPrice", e.target.value)} />
                    </Field>
                  </div>
                  <div className="col-span-3 sm:col-span-2 pb-1 text-right text-sm font-semibold text-slate-900">
                    {money((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0))}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeLine(idx)} disabled={lines.length === 1} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 disabled:opacity-30">✕</button>
                  </div>
                  {p && p.stock < Number(l.quantity) && (
                    <p className="col-span-12 text-xs font-medium text-rose-600">
                      ⚠️ Only {p.stock} units of {p.name} in stock
                    </p>
                  )}
                </div>
              );
            })}
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
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes for this invoice" />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => router.push("/sales")} className={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={busy} className={btnPrimary}>{busy ? "Creating…" : "Create invoice"}</button>
        </div>
      </Card>
    </div>
  );
}
