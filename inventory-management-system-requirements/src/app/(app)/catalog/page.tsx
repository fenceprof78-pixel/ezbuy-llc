"use client";

import { useEffect, useState } from "react";
import { PageHeader, Spinner, Modal, Field, Input, Th, Td, btnPrimary, btnGhost, btnDanger, Card, EmptyState, Tabs } from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";

type Item = { id: number; name: string; description?: string | null };

export default function CatalogPage() {
  const { user } = useAuth();
  const canManage = ["ADMIN", "MANAGER"].includes(user?.role ?? "");
  const [tab, setTab] = useState("category");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const load = async (type: string) => {
    setLoading(true);
    const res = await fetch(`/api/catalog?type=${type}`, { cache: "no-store" });
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  };

  useEffect(() => { load(tab); }, [tab]);

  const openNew = () => { setEditing(null); setName(""); setDescription(""); setError(""); setModalOpen(true); };
  const openEdit = (it: Item) => { setEditing(it); setName(it.name); setDescription(it.description ?? ""); setError(""); setModalOpen(true); };

  const save = async () => {
    setError("");
    const body = editing
      ? { type: tab, id: editing.id, name, description }
      : { type: tab, name, description };
    const res = await fetch("/api/catalog", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Save failed"); return; }
    setModalOpen(false);
    load(tab);
  };

  const remove = async (it: Item) => {
    if (!confirm(`Delete "${it.name}"?`)) return;
    const res = await fetch("/api/catalog", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: tab, id: it.id }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Delete failed"); return; }
    load(tab);
  };

  return (
    <div>
      <PageHeader
        title="Categories & Brands"
        subtitle="Organize your product catalog"
        actions={canManage && <button onClick={openNew} className={btnPrimary}>＋ Add {tab === "category" ? "Category" : "Brand"}</button>}
      />
      <Tabs
        tabs={[
          { id: "category", label: "Categories" },
          { id: "brand", label: "Brands" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card><EmptyState message={`No ${tab}s yet`} /></Card>
      ) : (
        <Card>
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <Th>Name</Th>
                <Th>Description</Th>
                {canManage && <Th className="text-right">Actions</Th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50">
                  <Td className="font-semibold text-slate-900">{it.name}</Td>
                  <Td className="text-slate-500">{it.description ?? "—"}</Td>
                  {canManage && (
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(it)} className="rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">Edit</button>
                        <button onClick={() => remove(it)} className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">Delete</button>
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${editing.name}` : `Add ${tab === "category" ? "Category" : "Brand"}`}>
        {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">{error}</div>}
        <div className="space-y-4">
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          {tab === "category" && (
            <Field label="Description">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setModalOpen(false)} className={btnGhost}>Cancel</button>
          <button onClick={save} className={btnPrimary}>{editing ? "Save" : "Create"}</button>
        </div>
      </Modal>
    </div>
  );
}
