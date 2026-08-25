"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Field, Input, Select, Textarea, Card, btnPrimary, btnGhost } from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";

type Product = { id: number; name: string; sku: string; stock: number; defaultWarehouseId: number | null };
type Warehouse = { id: number; name: string };

const TYPES = [
  { id: "RECEIVE", label: "📥 Stock In (Receive)", desc: "Goods received into a warehouse" },
  { id: "ISSUE", label: "📤 Stock Out (Issue)", desc: "Goods issued out of a warehouse" },
  { id: "ADJUSTMENT", label: "⚖️ Adjustment", desc: "Physical count correction — use +/- quantity" },
  { id: "DAMAGE", label: "⚠️ Damaged / Lost", desc: "Damaged, expired or lost stock" },
  { id: "RETURN_IN", label: "↩️ Return In", desc: "Customer returns goods" },
  { id: "RETURN_OUT", label: "↪️ Return Out", desc: "Goods returned to supplier" },
  { id: "TRANSFER", label: "🔁 Transfer", desc: "Move stock between warehouses" },
];

export default function NewMovementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = ["ADMIN", "MANAGER", "INVENTORY"].includes(user?.role ?? "");

  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [type, setType] = useState("RECEIVE");
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/products", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/warehouses", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([p, w]) => {
      setProducts(p.products ?? []);
      setWarehouses(w.items ?? []);
    });
  }, []);

  const selectedProduct = products.find((p) => p.id === Number(productId));

  const submit = async () => {
    setError("");
    setSuccess("");
    setBusy(true);
    const body: Record<string, any> = { type, productId: Number(productId), quantity: Number(quantity), note };
    if (type === "TRANSFER") {
      body.fromWarehouseId = Number(fromId);
      body.toWarehouseId = Number(toId);
    } else {
      body.warehouseId = Number(warehouseId);
    }
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error || "Failed to record movement"); return; }
    setSuccess("Movement recorded ✓");
    setQuantity("");
    setNote("");
    setTimeout(() => router.push("/inventory"), 800);
  };

  if (!canManage) {
    return (
      <Card className="p-8 text-center text-slate-500">
        You don't have permission to record inventory movements.
      </Card>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="New Stock Movement" subtitle="Record stock in, out, adjustments, damages and transfers" />

      <Card className="p-6">
        {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">{error}</div>}
        {success && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">{success}</div>}

        <div className="space-y-4">
          <Field label="Movement type" required>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-slate-400">{TYPES.find((t) => t.id === type)?.desc}</p>
          </Field>

          <Field label="Product" required>
            <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">— Select product —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku}) — {p.stock} in stock</option>
              ))}
            </Select>
          </Field>

          {type === "TRANSFER" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="From warehouse" required>
                <Select value={fromId} onChange={(e) => setFromId(e.target.value)}>
                  <option value="">— Select —</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </Select>
              </Field>
              <Field label="To warehouse" required>
                <Select value={toId} onChange={(e) => setToId(e.target.value)}>
                  <option value="">— Select —</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </Select>
              </Field>
            </div>
          ) : (
            <Field label="Warehouse" required>
              <Select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                <option value="">{selectedProduct?.defaultWarehouseId ? "— Select (default set) —" : "— Select warehouse —"}</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </Field>
          )}

          <Field
            label={type === "ADJUSTMENT" ? "Quantity (use negative to remove stock)" : "Quantity"}
            required
            hint={type === "ADJUSTMENT" ? "Example: +5 to add, -3 to remove" : undefined}
          >
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={type === "ADJUSTMENT" ? "+5 or -3" : "10"}
            />
          </Field>

          <Field label="Note / reason">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note, e.g. damaged during shipping" />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => router.push("/inventory")} className={btnGhost}>Cancel</button>
            <button onClick={submit} disabled={busy} className={btnPrimary}>{busy ? "Recording…" : "Record movement"}</button>
          </div>
        </div>
      </Card>
    </div>
  );
}
