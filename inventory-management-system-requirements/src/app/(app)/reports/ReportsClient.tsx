"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader, Spinner, Tabs, Th, Td, StatusBadge, TxnBadge, Card, EmptyState, btnGhost } from "@/components/ui";
import { money, fmtDate, fmtDateTime, fmtNumber } from "@/lib/format";
import { useAuth } from "@/components/AuthProvider";

type ReportRow = Record<string, any>;

export default function ReportsClient() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const canView = ["ADMIN", "MANAGER", "ACCOUNTANT"].includes(user?.role ?? "");

  const initialTab = searchParams.get("tab") ?? "inventory";
  const [tab, setTab] = useState(initialTab);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [totals, setTotals] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const load = async (t: string) => {
    setLoading(true);
    const res = await fetch(`/api/reports?type=${t}`, { cache: "no-store" });
    const data = await res.json();
    setRows(data.rows ?? []);
    setTotals(data.totals ?? {});
    setLoading(false);
  };

  useEffect(() => { load(tab); }, [tab]);

  const exportCsv = () => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ezbuy-${tab}-report.csv`;
    a.click();
  };

  if (!canView) {
    return <Card className="p-8 text-center text-slate-500">You don't have permission to view reports.</Card>;
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Insights across inventory, sales, purchases and profit"
        actions={<button onClick={exportCsv} disabled={!rows.length} className={btnGhost}>⬇ Export CSV</button>}
      />
      <Tabs
        tabs={[
          { id: "inventory", label: "Inventory" },
          { id: "lowstock", label: "Low Stock" },
          { id: "sales", label: "Sales" },
          { id: "purchase", label: "Purchases" },
          { id: "profit", label: "Profit" },
          { id: "movement", label: "Movements" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Card><EmptyState message="No data for this report yet" /></Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            {Object.entries(totals).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-400">{k.replace(/([A-Z])/g, " $1")}</p>
                <p className="text-lg font-bold text-slate-900">{typeof v === "number" ? (k === "count" || k === "units" ? fmtNumber(v) : money(v)) : String(v)}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  {Object.keys(rows[0]).map((h) => (
                    <Th key={h}>{h.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}</Th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {Object.entries(r).map(([k, v], j) => (
                      <Td key={k} className={j === 0 ? "font-semibold text-slate-900" : ""}>
                        {renderCell(k, v)}
                      </Td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );

  function renderCell(key: string, value: any) {
    if (value === null || value === undefined || value === "") return <span className="text-slate-400">—</span>;
    if (key === "status" || key === "paymentStatus") return <StatusBadge status={String(value)} />;
    if (key === "type") return <TxnBadge type={String(value)} />;
    if (key === "lowStock" || key === "active") return value ? "✓" : "✗";
    if (/price|total|value|cost|profit|revenue|outstanding|balance|paid|collected|margin|stockValue|retailValue|amount/i.test(key) && typeof value === "number") {
      return key === "margin" ? `${value.toFixed(1)}%` : money(value);
    }
    if (key === "quantity" || key === "stock" || key === "reorderLevel" || key === "shortage" || key === "count" || key === "units") {
      return fmtNumber(value);
    }
    if (key === "saleDate" || key === "orderDate") return fmtDate(value);
    if (key === "createdAt") return fmtDateTime(value);
    return String(value);
  }
}
