"use client";

import { useEffect, useState } from "react";
import { PageHeader, Spinner, Modal, Field, Input, Textarea, Th, Td, btnPrimary, btnGhost, Card, EmptyState, StatusBadge } from "@/components/ui";
import { money } from "@/lib/format";
import { useAuth } from "@/components/AuthProvider";

type Supplier = {
  id: number; companyName: string; contactPerson: string | null; phone: string | null;
  email: string | null; address: string | null; paymentTerms: string | null;
  purchaseCount: number; totalPurchases: number; amountOwed: number;
};

const empty = { companyName: "", contactPerson: "", phone: "", email: "", address: "", paymentTerms: "" };

export default function SuppliersPage() {
  const { user } = useAuth();
  const canManage = ["ADMIN", "MANAGER"].includes(user?.role ?? "");
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  const load = async () => {
    const res = await fetch("/api/contacts?type=supplier", { cache: "no-store" });
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setError(""); setModalOpen(true); };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ companyName: s.companyName, contactPerson: s.contactPerson ?? "", phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "", paymentTerms: s.paymentTerms ?? "" });
    setError("");
    setModalOpen(true);
  };
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError("");
    const body = editing ? { type: "supplier", id: editing.id, ...form } : { type: "supplier", ...form };
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

  const remove = async (s: Supplier) => {
    if (!confirm(`Delete supplier "${s.companyName}"?`)) return;
    const res = await fetch("/api/contacts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "supplier", id: s.id }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Delete failed"); return; }
    load();
  };

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle={`${items.length} suppliers`}
        actions={canManage && <button onClick={openNew} className={btnPrimary}>＋ Add Supplier</button>}
      />
      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card><EmptyState message="No suppliers yet" /></Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <Th>Company</Th>
                <Th>Contact</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th className="text-right">Purchases</Th>
                <Th className="text-right">Amount Owed</Th>
                {canManage && <Th className="text-right">Actions</Th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <Td>
                    <p className="font-semibold text-slate-900">{s.companyName}</p>
                    <p className="text-xs text-slate-400">{s.paymentTerms ?? ""}</p>
                  </Td>
                  <Td>{s.contactPerson ?? "—"}</Td>
                  <Td className="text-slate-500">{s.phone ?? "—"}</Td>
                  <Td className="text-slate-500">{s.email ?? "—"}</Td>
                  <Td className="text-right">
                    <span className="text-slate-500">{s.purchaseCount}</span>
                    <p className="text-xs text-slate-400">{money(s.totalPurchases)}</p>
                  </Td>
                  <Td className="text-right">
                    <span className={`font-semibold ${s.amountOwed > 0 ? "text-amber-600" : "text-emerald-600"}`}>{money(s.amountOwed)}</span>
                  </Td>
                  {canManage && (
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(s)} className="rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">Edit</button>
                        <button onClick={() => remove(s)} className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">Delete</button>
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${editing.companyName}` : "Add Supplier"} wide>
        {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">{error}</div>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Company name" required>
            <Input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
          </Field>
          <Field label="Contact person">
            <Input value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Payment terms">
            <Input value={form.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} placeholder="Net 30" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <Textarea value={form.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setModalOpen(false)} className={btnGhost}>Cancel</button>
          <button onClick={save} className={btnPrimary}>{editing ? "Save changes" : "Add supplier"}</button>
        </div>
      </Modal>
    </div>
  );
}
