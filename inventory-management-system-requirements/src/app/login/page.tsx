"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Input, Field, btnPrimary } from "@/components/ui";

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@ezbuy.com", password: "admin123" },
  { role: "Manager", email: "manager@ezbuy.com", password: "manager123" },
  { role: "Sales", email: "sales@ezbuy.com", password: "sales123" },
  { role: "Inventory", email: "inv@ezbuy.com", password: "inv123" },
  { role: "Accountant", email: "acct@ezbuy.com", password: "acct123" },
];

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setBusy(false);
        return;
      }
      setUser(data);
      router.replace("/dashboard");
    } catch {
      setError("Something went wrong. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500 text-3xl shadow-xl shadow-indigo-500/40">
            📦
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">EZBUY</h1>
          <p className="mt-1 text-sm text-slate-400">Inventory Management System</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-slate-700/60 bg-white/95 p-8 shadow-2xl">
          <h2 className="mb-6 text-lg font-bold text-slate-900">Sign in to your account</h2>
          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <Field label="Email" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@ezbuy.com"
                autoComplete="email"
                required
              />
            </Field>
            <Field label="Password" required>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </Field>
            <button type="submit" disabled={busy} className={`${btnPrimary} w-full py-2.5`}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>

        <div className="mt-6 rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Demo accounts (click to fill)
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                onClick={() => {
                  setEmail(a.email);
                  setPassword(a.password);
                  setError("");
                }}
                className="rounded-lg border border-slate-600 bg-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-600"
              >
                {a.role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
