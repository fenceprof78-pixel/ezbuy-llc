"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  section?: string;
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

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-lg shadow-lg shadow-indigo-500/30">
          📦
        </div>
        <div>
          <p className="text-base font-extrabold tracking-tight text-white">EZBUY</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
            Inventory System
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV.filter((n) => !n.adminOnly || user?.role === "ADMIN").map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/40"
                  : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-5 py-4 text-[11px] text-slate-500">
        EZBUY LLC · Inventory v1.0
      </div>
    </aside>
  );
}
