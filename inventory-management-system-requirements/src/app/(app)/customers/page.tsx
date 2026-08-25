"use client";

import { useEffect, useState } from "react";
import { PageHeader, Spinner, Modal, Field, Input, Textarea, Th, Td, btnPrimary, btnGhost, Card, EmptyState } from "@/components/ui";
import { money } from "@/lib/format";
import { useAuth } from "@/components/AuthProvider";

type Customer = {
  id: number; name: string; phone: string | null; email: string | null; address: string | null;
  saleCount: number; totalSales: number; outstanding: number;
};

const empty = { name: "", phone: "", email: "", address: "" };

export default function CustomersPage() {
  const { user } = useAuth();
  const canManage = ["ADMIN", "MANAGER"].includes(user?.role ?? "");
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  const load = async () => {
    const res = await fetch("/api/contacts?type=customer", { cache: "no-store" });
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setError(""); setModalOpen(true); };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone ?? "", email: c.email ?? "", address: c.address ?? "" });
    setError("");
    setModalOpen(true);
  };
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError("");
    const body = editing ? { type: "customer", id: editing.id, ...form } : { type: "customer", ...form };
    const res = await fetch("/api/contacts", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Save failed"); return; }
    setModalOpen(false);
    load();
  };

  const remove = async (c: Customer) => {
    if (!confirm(`Delete customer "${c.name}"?`)) return;
    const res = await fetch("/api/contacts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "customer", id: c.id }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Delete failed"); return; }
    load();
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${items.length} customers`}
        actions={canManage && <button onClick={openNew} className={btnPrimary}>＋ Add Customer</button>}
      />
      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card><EmptyState message="No customers yet" /></Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th className="text-right">Sales</Th>
                <Th className="text-right">Outstanding</Th>
                {canManage && <Th className="text-right">Actions</Th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <Td>
                    <p className="font-semibold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.address ?? ""}</p>
                  </Td>
                  <Td className="text-slate-500">{c.phone ?? "—"}</Td>
                  <Td className="text-slate-500">{c.email ?? "—"}</Td>
                  <Td className="text-right">
                    <span className="text-slate-500">{c.saleCount}</span>
                    <p className="text-xs text-slate-400">{money(c.totalSales)}</p>
                  </Td>
                  <Td className="text-right">
                    <span className={`font-semibold ${c.outstanding > 0 ? "text-rose-600" : "text-emerald-600"}`}>{money(c.outstanding)}</span>
                  </Td>
                  {canManage && (
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">Edit</button>
                        <button onClick={() => remove(c)} className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">Delete</button>
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${editing.name}` : "Add Customer"}>
        {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">{error}</div>}
        <div className="space-y-4">
          <Field label="Full name" required>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Address">
            <Textarea value={form.address} onChange={(e) => set("address", e.target.value)} />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setModalOpen(false)} className={btnGhost}>Cancel</button>
          <button onClick={save} className={btnPrimary}>{editing ? "Save changes" : "Add customer"}</button>
        </div>
      </Modal>
    </div>
  );
}
