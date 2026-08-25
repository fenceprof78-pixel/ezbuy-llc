"use client";

import { useEffect, useState } from "react";
import { PageHeader, Spinner, Modal, Field, Input, Select, Th, Td, StatusBadge, Card, EmptyState, btnPrimary, btnGhost } from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";

type AppUser = { id: number; name: string; email: string; role: string; active: boolean; createdAt: string };

const ROLES = ["ADMIN", "MANAGER", "SALES", "INVENTORY", "ACCOUNTANT"];

export default function UsersPage() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === "ADMIN";
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("SALES");
  const [error, setError] = useState("");

  const load = async () => {
    const res = await fetch("/api/users", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
    }
    setLoading(false);
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const create = async () => {
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Create failed"); return; }
    setModalOpen(false);
    setName(""); setEmail(""); setPassword(""); setRole("SALES");
    load();
  };

  const update = async (id: number, body: Record<string, any>) => {
    const res = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Update failed"); return; }
    load();
  };

  if (!isAdmin) {
    return <Card className="p-8 text-center text-slate-500">Admin access required to manage users.</Card>;
  }

  return (
    <div>
      <PageHeader
        title="Users & Permissions"
        subtitle="Roles control what each employee can see and do"
        actions={<button onClick={() => { setError(""); setModalOpen(true); }} className={btnPrimary}>＋ Add User</button>}
      />
      {loading ? (
        <Spinner />
      ) : users.length === 0 ? (
        <Card><EmptyState message="No users" /></Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <Td className="font-semibold text-slate-900">
                    {u.name}
                    {u.id === me?.id && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                  </Td>
                  <Td className="text-slate-500">{u.email}</Td>
                  <Td>
                    <select
                      value={u.role}
                      onChange={(e) => update(u.id, { role: e.target.value })}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium outline-none focus:border-indigo-500"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Td>
                  <Td>
                    <button onClick={() => update(u.id, { active: !u.active })}>
                      <StatusBadge status={u.active ? "ACTIVE" : "INACTIVE"} />
                    </button>
                  </Td>
                  <Td className="text-right">
                    <button
                      onClick={() => update(u.id, { active: !u.active })}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                    >
                      {u.active ? "Deactivate" : "Activate"}
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add User">
        {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">{error}</div>}
        <div className="space-y-4">
          <Field label="Full name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" required>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temporary password" />
          </Field>
          <Field label="Role" hint="Controls module permissions (see login page for demo role accounts)">
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setModalOpen(false)} className={btnGhost}>Cancel</button>
          <button onClick={create} className={btnPrimary}>Create user</button>
        </div>
      </Modal>
    </div>
  );
}
