"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, StatCard, Spinner, TxnBadge, EmptyState, btnPrimary, btnGhost, Th, Td } from "@/components/ui";
import { money, fmtDateTime, fmtNumber } from "@/lib/format";

type DashData = {
  stats: {
    totalProducts: number;
    totalStock: number;
    stockValue: number;
    lowStockCount: number;
    totalSales: number;
    salesOutstanding: number;
    totalPurchases: number;
    purchasesOutstanding: number;
    totalOutstanding: number;
    customers: number;
    suppliers: number;
    warehouses: number;
  };
  lowStock: any[];
  recent: any[];
  recentSales: any[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setError("Failed to load dashboard"));
  }, []);

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!data) return <Spinner label="Loading dashboard…" />;

  const s = data.stats;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-500">A live overview of EZBUY operations</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/products" className={btnGhost}>＋ Add Product</Link>
          <Link href="/inventory/new" className={btnGhost}>📥 Receive Stock</Link>
          <Link href="/sales/new" className={btnGhost}>🛒 Create Sale</Link>
          <Link href="/purchases/new" className={btnPrimary}>📥 Purchase Order</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Products" value={fmtNumber(s.totalProducts)} icon="📦" accent="indigo" sub={`${s.warehouses} warehouses`} />
        <StatCard label="Stock Value" value={money(s.stockValue)} icon="💰" accent="green" sub={`${fmtNumber(s.totalStock)} units`} />
        <StatCard label="Total Sales" value={money(s.totalSales)} icon="🛒" accent="sky" />
        <StatCard label="Total Purchases" value={money(s.totalPurchases)} icon="📥" accent="amber" />
        <StatCard label="Outstanding" value={money(s.totalOutstanding)} icon="⏳" accent="red" sub="Sales + purchases" />
        <StatCard label="Low Stock" value={fmtNumber(s.lowStockCount)} icon="⚠️" accent="amber" sub="At or below reorder level" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-slate-900">Recent Activity</h2>
            <Link href="/inventory" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View all →
            </Link>
          </div>
          {data.recent.length === 0 ? (
            <EmptyState message="No inventory movements yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <Th>Product</Th>
                    <Th>Type</Th>
                    <Th>Qty</Th>
                    <Th>Warehouse</Th>
                    <Th>When</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recent.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <Td className="font-medium text-slate-900">{t.productName}</Td>
                      <Td><TxnBadge type={t.type} /></Td>
                      <Td className={t.quantity > 0 ? "font-semibold text-emerald-600" : "font-semibold text-rose-600"}>
                        {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                      </Td>
                      <Td>{t.warehouseName}</Td>
                      <Td className="text-slate-500">{fmtDateTime(t.createdAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-slate-900">Low Stock Alerts</h2>
            <Link href="/reports?tab=lowstock" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Report →
            </Link>
          </div>
          {data.lowStock.length === 0 ? (
            <EmptyState message="All products well stocked 🎉" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${p.stock === 0 ? "text-rose-600" : "text-amber-600"}`}>
                      {p.stock} left
                    </p>
                    <p className="text-xs text-slate-400">reorder at {p.reorderLevel}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-slate-900">Latest Invoices</h2>
            <Link href="/sales" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Sales →
            </Link>
          </div>
          {data.recentSales.length === 0 ? (
            <EmptyState message="No sales yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <Th>Invoice</Th>
                    <Th>Date</Th>
                    <Th className="text-right">Total</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentSales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <Td className="font-medium text-slate-900">{s.invoiceNumber}</Td>
                      <Td className="text-slate-500">{fmtDateTime(s.saleDate)}</Td>
                      <Td className="text-right font-semibold text-slate-900">{money(s.total)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-bold text-slate-900">Payments Due</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-rose-50 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase text-rose-500">Customers owe</p>
                <p className="text-lg font-bold text-rose-700">{money(s.salesOutstanding)}</p>
              </div>
              <span className="text-2xl">🧾</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase text-amber-600">We owe suppliers</p>
                <p className="text-lg font-bold text-amber-700">{money(s.purchasesOutstanding)}</p>
              </div>
              <span className="text-2xl">🏭</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase text-emerald-600">Contacts</p>
                <p className="text-lg font-bold text-emerald-700">
                  {fmtNumber(s.customers)} customers · {fmtNumber(s.suppliers)} suppliers
                </p>
              </div>
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
