"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/products", label: "Products", icon: "📦" },
  { href: "/catalog", label: "Categories & Brands", icon: "🏷️" },
  { href: "/inventory", label: "Inventory", icon: "📊" },
  { href: "/sales", label: "Sales", icon: "🛒" },
  { href: "/purchases", label: "Purchases", icon: "📥" },
  { href: "/customers", label: "Customers", icon: "🧑‍🤝‍🧑" },
  { href: "/suppliers", label: "Suppliers", icon: "🏭" },
  { href: "/warehouses", label: "Warehouses", icon: "🏢" },
  { href: "/reports", label: "Reports", icon: "📈" },
  { href: "/users", label: "Users", icon: "👤", adminOnly: true },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-60 shrink-0 -translate-x-full flex-col bg-[#150F2E] text-slate-300 transition-transform duration-200 md:sticky md:top-0 md:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[image:var(--grad-brand)] text-lg shadow-lg shadow-fuchsia-500/30">
              📦
            </div>
            <div>
              <p className="font-display text-base font-extrabold tracking-tight text-white">EZBUY</p>
              <p className="text-[10px] font-medium uppercase tracking-widest text-violet-300/60">
                Inventory System
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white md:hidden"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {NAV.filter((n) => !n.adminOnly || user?.role === "ADMIN").map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[image:var(--grad-brand)] text-white shadow-md shadow-fuchsia-900/40"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-[11px] text-slate-500">
          EZBUY LLC · Inventory v1.0
        </div>
      </aside>
    </>
  );
}
