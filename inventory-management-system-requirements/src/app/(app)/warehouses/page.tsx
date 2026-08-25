"use client";

import { useEffect, useState } from "react";
import { PageHeader, Spinner, Modal, Field, Input, Th, Td, btnPrimary, btnGhost, Card, EmptyState } from "@/components/ui";
import { fmtNumber } from "@/lib/format";
import { useAuth } from "@/components/AuthProvider";

type Warehouse = {
  id: number; name: string; location: string | null; manager: string | null;
  stockUnits: number; defaultProductCount: number;
};

const empty = { name: "", location: "", manager: "" };

export default function WarehousesPage() {
  const { user } = useAuth();
  const canManage = ["ADMIN", "MANAGER"].includes(user?.role ?? "");
  const [items, setItems] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  const load = async () => {
    const res = await fetch("/api/warehouses", { cache: "no-store" });
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setError(""); setModalOpen(true); };
  const openEdit = (w: Warehouse) => {
    setEditing(w);
    setForm({ name: w.name, location: w.location ?? "", manager: w.manager ?? "" });
    setError("");
    setModalOpen(true);
  };
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError("");
    const body = editing ? { id: editing.id, ...form } : form;
    const res = await fetch("/api/warehouses", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Save failed"); return; }
    setModalOpen(false);
    load();
  };

  const remove = async (w: Warehouse) => {
    if (!confirm(`Delete warehouse "${w.name}"?`)) return;
    const res = await fetch("/api/warehouses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: w.id }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Delete failed"); return; }
    load();
  };

  return (
    <div>
      <PageHeader
        title="Warehouses"
        subtitle="Storage locations across EZBUY"
        actions={canManage && <button onClick={openNew} className={btnPrimary}>＋ Add Warehouse</button>}
      />
      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card><EmptyState message="No warehouses yet" /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((w) => (
            <Card key={w.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-xl">🏢</div>
                  <div>
                    <p className="font-bold text-slate-900">{w.name}</p>
                    <p className="text-xs text-slate-500">{w.location ?? "No location set"}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Stock units</p>
                  <p className="text-lg font-bold text-slate-900">{fmtNumber(w.stockUnits)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Manager</p>
                  <p className="truncate text-sm font-semibold text-slate-700">{w.manager ?? "—"}</p>
                </div>
              </div>
              {canManage && (
                <div className="mt-4 flex justify-end gap-1">
                  <button onClick={() => openEdit(w)} className="rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">Edit</button>
                  <button onClick={() => remove(w)} className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">Delete</button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${editing.name}` : "Add Warehouse"}>
        {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">{error}</div>}
        <div className="space-y-4">
          <Field label="Warehouse name" required>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Downtown, Springfield" />
          </Field>
          <Field label="Manager">
            <Input value={form.manager} onChange={(e) => set("manager", e.target.value)} />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setModalOpen(false)} className={btnGhost}>Cancel</button>
          <button onClick={save} className={btnPrimary}>{editing ? "Save changes" : "Add warehouse"}</button>
        </div>
      </Modal>
    </div>
  );
}
