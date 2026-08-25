"use client";

import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

// ─── Class presets ────────────────────────────────────────────────────────────

export const inputCls =
  "w-full rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100";
export const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[image:var(--grad-brand)] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-500/25 transition hover:shadow-lg hover:shadow-violet-500/35 hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-violet-100 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-violet-200 hover:bg-violet-50";
export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-600";
export const btnSuccess =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600";
export const thCls = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";
export const tdCls = "px-4 py-3 text-sm text-slate-700 align-middle";
export const tableWrap =
  "overflow-x-auto rounded-2xl border border-violet-100 bg-white shadow-sm shadow-violet-500/5";

// ─── Layout primitives ────────────────────────────────────────────────────────

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-violet-100 bg-white shadow-sm shadow-violet-500/5 ${className}`}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

const statAccents: Record<string, string> = {
  indigo: "bg-[image:var(--grad-brand)] text-white",
  green: "bg-gradient-to-br from-emerald-400 to-teal-500 text-white",
  red: "bg-gradient-to-br from-rose-400 to-pink-500 text-white",
  amber: "bg-gradient-to-br from-amber-400 to-orange-500 text-white",
  sky: "bg-gradient-to-br from-sky-400 to-cyan-500 text-white",
  slate: "bg-slate-100 text-slate-600",
};

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = "indigo",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  accent?: keyof typeof statAccents;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg shadow-md shadow-violet-500/20 ${statAccents[accent] ?? statAccents.indigo}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────

const badgeColors: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-rose-100 text-rose-700",
  amber: "bg-amber-100 text-amber-700",
  indigo: "bg-violet-100 text-violet-700",
  blue: "bg-cyan-100 text-cyan-700",
  slate: "bg-slate-100 text-slate-600",
};

export function Badge({ children, color = "slate" }: { children: ReactNode; color?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColors[color] ?? badgeColors.slate}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: "Active", color: "green" },
    INACTIVE: { label: "Inactive", color: "slate" },
    PAID: { label: "Paid", color: "green" },
    PARTIAL: { label: "Partial", color: "amber" },
    UNPAID: { label: "Unpaid", color: "red" },
    RECEIVED: { label: "Received", color: "green" },
    ORDERED: { label: "Ordered", color: "blue" },
    DRAFT: { label: "Draft", color: "slate" },
    CANCELLED: { label: "Cancelled", color: "red" },
    CONFIRMED: { label: "Confirmed", color: "blue" },
    SHIPPED: { label: "Shipped", color: "indigo" },
    COMPLETED: { label: "Completed", color: "green" },
    ADMIN: { label: "Admin", color: "red" },
    MANAGER: { label: "Manager", color: "indigo" },
    SALES: { label: "Sales", color: "sky" },
    INVENTORY: { label: "Inventory", color: "amber" },
    ACCOUNTANT: { label: "Accountant", color: "blue" },
  };
  const m = map[status] ?? { label: status, color: "slate" };
  return <Badge color={m.color}>{m.label}</Badge>;
}

export function TxnBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    RECEIVE: "green",
    ISSUE: "red",
    SALE: "red",
    RETURN_IN: "green",
    RETURN_OUT: "red",
    ADJUSTMENT: "amber",
    DAMAGE: "red",
    TRANSFER_IN: "blue",
    TRANSFER_OUT: "blue",
  };
  const labels: Record<string, string> = {
    RECEIVE: "Stock In",
    ISSUE: "Stock Out",
    SALE: "Sale",
    RETURN_IN: "Return In",
    RETURN_OUT: "Return Out",
    ADJUSTMENT: "Adjustment",
    DAMAGE: "Damaged",
    TRANSFER_IN: "Transfer In",
    TRANSFER_OUT: "Transfer Out",
  };
  return <Badge color={map[type] ?? "slate"}>{labels[type] ?? type}</Badge>;
}

// ─── Form primitives ──────────────────────────────────────────────────────────

export function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className={labelCls}>
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputCls} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputCls} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={inputCls} rows={3} {...props} />;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-violet-950/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`my-8 w-full ${wide ? "max-w-3xl" : "max-w-lg"} overflow-hidden rounded-2xl bg-white shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-violet-100 bg-[image:var(--grad-brand-soft)] px-6 py-4">
          <h3 className="font-display text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition hover:bg-white hover:text-slate-600" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function EmptyState({ message = "No records found" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[image:var(--grad-brand-soft)] text-2xl">🗂️</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-violet-100 bg-white p-1 shadow-sm">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            active === t.id ? "bg-[image:var(--grad-brand)] text-white shadow-sm" : "text-slate-600 hover:bg-violet-50"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <th className={`${thCls} ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`${tdCls} ${className}`}>{children}</td>;
}
