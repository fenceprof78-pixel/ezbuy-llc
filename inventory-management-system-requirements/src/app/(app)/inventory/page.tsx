"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Spinner, Tabs, Th, Td, TxnBadge, EmptyState, Card, btnPrimary } from "@/components/ui";
import { fmtNumber, fmtDateTime } from "@/lib/format";

type Txn = {
  id: number; type: string; quantity: number; note: string | null;
  createdAt: string; productName: string; productSku: string; warehouseName: string; userName: string | null;
};
type StockRow = { productId: number; name: string; sku: string; total: number; warehouses: { warehouseId: number; name: string; qty: number }[] };

export default function InventoryPage() {
  const [tab, setTab] = useState("stock");
  const [history, setHistory] = useState<Txn[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (t: string) => {
    setLoading(true);
    const url = t === "stock"
      ? "/api/inventory?summary=1&limit=1"
      : `/api/inventory?limit=300${typeFilter ? `&type=${typeFilter}` : ""}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (t === "stock") {
      setStock(data.stockSummary ?? []);
      setHistory([]);
    } else {
      setHistory(data.history ?? []);
      setStock([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(tab); }, [tab, typeFilter]);

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Live stock levels and full movement history"
        actions={<Link href="/inventory/new" className={btnPrimary}>＋ New Movement</Link>}
      />
      <Tabs
        tabs={[
          { id: "stock", label: "Stock Overview" },
          { id: "history", label: "Movement History" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "history" && (
        <div className="mb-4">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">All types</option>
            <option value="RECEIVE">Stock In (Receive)</option>
            <option value="ISSUE">Stock Out (Issue)</option>
            <option value="SALE">Sale</option>
            <option value="RETURN_IN">Return In</option>
            <option value="RETURN_OUT">Return Out</option>
            <option value="ADJUSTMENT">Adjustment</option>
            <option value="DAMAGE">Damaged</option>
            <option value="TRANSFER_IN">Transfer In</option>
            <option value="TRANSFER_OUT">Transfer Out</option>
          </select>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : tab === "stock" ? (
        stock.length === 0 ? (
          <Card><EmptyState message="No stock yet — receive goods to get started" /></Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Product</Th>
                  <Th className="text-right">Total Stock</Th>
                  <Th>Per Warehouse</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stock.map((s) => (
                  <tr key={s.productId} className="hover:bg-slate-50">
                    <Td>
                      <p className="font-semibold text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.sku}</p>
                    </Td>
                    <Td className="text-right">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-bold ${s.total <= 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {fmtNumber(s.total)}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1.5">
                        {s.warehouses.length === 0 ? (
                          <span className="text-xs text-slate-400">No stock</span>
                        ) : (
                          s.warehouses.map((w) => (
                            <span key={w.warehouseId} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                              {w.name}: <b>{fmtNumber(w.qty)}</b>
                            </span>
                          ))
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : history.length === 0 ? (
        <Card><EmptyState message="No movements recorded" /></Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <Th>When</Th>
                <Th>Product</Th>
                <Th>Type</Th>
                <Th className="text-right">Qty</Th>
                <Th>Warehouse</Th>
                <Th>By</Th>
                <Th>Note</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <Td className="whitespace-nowrap text-slate-500">{fmtDateTime(t.createdAt)}</Td>
                  <Td>
                    <p className="font-medium text-slate-900">{t.productName}</p>
                    <p className="text-xs text-slate-400">{t.productSku}</p>
                  </Td>
                  <Td><TxnBadge type={t.type} /></Td>
                  <Td className={`text-right font-bold ${t.quantity > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                  </Td>
                  <Td>{t.warehouseName}</Td>
                  <Td className="text-slate-500">{t.userName ?? "—"}</Td>
                  <Td className="max-w-[220px] truncate text-slate-400">{t.note ?? ""}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
