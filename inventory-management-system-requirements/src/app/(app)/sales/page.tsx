"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Spinner, Modal, Th, Td, StatusBadge, EmptyState, Card, btnPrimary, btnGhost, btnDanger, btnSuccess, Input, Field } from "@/components/ui";
import { money, fmtDate } from "@/lib/format";
import { useAuth } from "@/components/AuthProvider";

type Sale = {
  id: number; invoiceNumber: string; customerName: string | null; saleDate: string;
  status: string; paymentStatus: string; amountPaid: number; subtotal: number; tax: number;
  total: number; balance: number; itemCount: number; notes: string | null;
};
type SaleDetail = { sale: Sale; items: any[] };

export default function SalesPage() {
  const { user } = useAuth();
  const canManage = ["ADMIN", "MANAGER", "SALES", "ACCOUNTANT"].includes(user?.role ?? "");
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [paidInput, setPaidInput] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const res = await fetch("/api/sales", { cache: "no-store" });
    const data = await res.json();
    setSales(data.sales ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openDetail = async (id: number) => {
    setError("");
    const res = await fetch(`/api/sales/${id}`, { cache: "no-store" });
    const data = await res.json();
    if (res.ok) {
      setDetail(data);
      setPaidInput(String(data.sale.amountPaid));
    }
  };

  const savePayment = async (saleId: number) => {
    const res = await fetch(`/api/sales/${saleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountPaid: Number(paidInput) || 0 }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Update failed"); return; }
    setDetail(null);
    load();
  };

  const setStatus = async (saleId: number, status: string) => {
    const res = await fetch(`/api/sales/${saleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    setDetail(null);
    load();
  };

  const remove = async (sale: Sale) => {
    if (!confirm(`Delete invoice ${sale.invoiceNumber}? This reverses its stock impact.`)) return;
    const res = await fetch(`/api/sales/${sale.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error || "Delete failed"); return; }
    setDetail(null);
    load();
  };

  const totals = sales.reduce((a, s) => ({ total: a.total + s.total, paid: a.paid + s.amountPaid, balance: a.balance + s.balance }), { total: 0, paid: 0, balance: 0 });

  return (
    <div>
      <PageHeader
        title="Sales"
        subtitle={`${sales.length} invoices · ${money(totals.total)} total · ${money(totals.balance)} outstanding`}
        actions={canManage && <Link href="/sales/new" className={btnPrimary}>＋ New Sale</Link>}
      />
      {loading ? (
        <Spinner />
      ) : sales.length === 0 ? (
        <Card><EmptyState message="No sales yet" /></Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <Th>Invoice</Th>
                <Th>Customer</Th>
                <Th>Date</Th>
                <Th className="text-right">Items</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-right">Paid</Th>
                <Th className="text-right">Balance</Th>
                <Th>Status</Th>
                <Th>Payment</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <Td className="font-semibold text-indigo-600">{s.invoiceNumber}</Td>
                  <Td className="font-medium text-slate-900">{s.customerName ?? "—"}</Td>
                  <Td className="text-slate-500">{fmtDate(s.saleDate)}</Td>
                  <Td className="text-right text-slate-500">{s.itemCount}</Td>
                  <Td className="text-right font-semibold text-slate-900">{money(s.total)}</Td>
                  <Td className="text-right text-emerald-600">{money(s.amountPaid)}</Td>
                  <Td className={`text-right font-semibold ${s.balance > 0 ? "text-rose-600" : "text-slate-400"}`}>{money(s.balance)}</Td>
                  <Td><StatusBadge status={s.status} /></Td>
                  <Td><StatusBadge status={s.paymentStatus} /></Td>
                  <Td className="text-right">
                    <button onClick={() => openDetail(s.id)} className="rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">View</button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `Invoice ${detail.sale.invoiceNumber}` : ""} wide>
        {detail && (
          <div>
            {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">{error}</div>}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{detail.sale.customerName}</p>
                <p className="text-xs text-slate-500">{fmtDate(detail.sale.saleDate)}{detail.sale.notes ? ` · ${detail.sale.notes}` : ""}</p>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={detail.sale.status} />
                <StatusBadge status={detail.sale.paymentStatus} />
              </div>
            </div>

            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Product</Th>
                  <Th className="text-right">Qty</Th>
                  <Th className="text-right">Price</Th>
                  <Th className="text-right">Line total</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detail.items.map((i) => (
                  <tr key={i.id}>
                    <Td className="font-medium text-slate-900">{i.productName}</Td>
                    <Td className="text-right">{i.quantity}</Td>
                    <Td className="text-right">{money(i.unitPrice)}</Td>
                    <Td className="text-right font-semibold">{money(i.lineTotal)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 space-y-1 rounded-lg bg-slate-50 p-4 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{money(detail.sale.subtotal)}</span></div>
              <div className="flex justify-between text-slate-600"><span>Tax</span><span>{money(detail.sale.tax)}</span></div>
              <div className="flex justify-between text-base font-bold text-slate-900"><span>Total</span><span>{money(detail.sale.total)}</span></div>
              <div className="flex justify-between text-emerald-600"><span>Paid</span><span>{money(detail.sale.amountPaid)}</span></div>
              <div className="flex justify-between font-semibold text-rose-600"><span>Balance due</span><span>{money(detail.sale.balance)}</span></div>
            </div>

            {canManage && (
              <div className="mt-5 space-y-3">
                <div className="flex items-end gap-2">
                  <div className="w-40">
                    <Field label="Amount paid ($)">
                      <Input type="number" min="0" step="0.01" value={paidInput} onChange={(e) => setPaidInput(e.target.value)} />
                    </Field>
                  </div>
                  <button onClick={() => savePayment(detail.sale.id)} className={btnPrimary}>Update payment</button>
                  <button onClick={() => { setPaidInput(String(detail.sale.total)); savePayment(detail.sale.id); }} className={btnGhost}>Mark fully paid</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {detail.sale.status !== "COMPLETED" && detail.sale.status !== "CANCELLED" && (
                    <button onClick={() => setStatus(detail.sale.id, "COMPLETED")} className={btnSuccess}>Mark completed</button>
                  )}
                  {detail.sale.status === "CONFIRMED" && (
                    <button onClick={() => setStatus(detail.sale.id, "SHIPPED")} className={btnGhost}>Mark shipped</button>
                  )}
                  {canManage && detail.sale.status !== "CANCELLED" && (
                    <button onClick={() => setStatus(detail.sale.id, "CANCELLED")} className={btnGhost}>Cancel invoice</button>
                  )}
                  <button onClick={() => remove(detail.sale)} className={btnDanger}>Delete invoice</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
