"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Spinner, Modal, Th, Td, StatusBadge, EmptyState, Card, btnPrimary, btnGhost, btnDanger, btnSuccess, Input, Field } from "@/components/ui";
import { money, fmtDate } from "@/lib/format";
import { useAuth } from "@/components/AuthProvider";

type Purchase = {
  id: number; poNumber: string; supplierName: string | null; orderDate: string;
  status: string; paymentStatus: string; amountPaid: number; subtotal: number; tax: number;
  total: number; balance: number; itemCount: number; notes: string | null;
};
type PurchaseDetail = { purchase: Purchase; items: any[] };

export default function PurchasesPage() {
  const { user } = useAuth();
  const canManage = ["ADMIN", "MANAGER", "ACCOUNTANT", "INVENTORY"].includes(user?.role ?? "");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [paidInput, setPaidInput] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const res = await fetch("/api/purchases", { cache: "no-store" });
    const data = await res.json();
    setPurchases(data.purchases ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openDetail = async (id: number) => {
    setError("");
    const res = await fetch(`/api/purchases/${id}`, { cache: "no-store" });
    const data = await res.json();
    if (res.ok) {
      setDetail(data);
      setPaidInput(String(data.purchase.amountPaid));
    }
  };

  const update = async (purchaseId: number, body: Record<string, any>) => {
    const res = await fetch(`/api/purchases/${purchaseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Update failed"); return false; }
    return true;
  };

  const savePayment = async (purchaseId: number) => {
    const ok = await update(purchaseId, { amountPaid: Number(paidInput) || 0 });
    if (ok) { setDetail(null); load(); }
  };

  const receive = async (p: Purchase) => {
    if (!confirm(`Receive goods for ${p.poNumber}? Stock will be added to the ledger.`)) return;
    const ok = await update(p.id, { status: "RECEIVED" });
    if (ok) { setDetail(null); load(); }
  };

  const remove = async (p: Purchase) => {
    if (!confirm(`Delete ${p.poNumber}? This reverses any received stock.`)) return;
    const res = await fetch(`/api/purchases/${p.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error || "Delete failed"); return; }
    setDetail(null);
    load();
  };

  const totals = purchases.reduce((a, p) => ({ total: a.total + p.total, paid: a.paid + p.amountPaid, balance: a.balance + p.balance }), { total: 0, paid: 0, balance: 0 });

  return (
    <div>
      <PageHeader
        title="Purchases"
        subtitle={`${purchases.length} orders · ${money(totals.total)} total · ${money(totals.balance)} to pay`}
        actions={canManage && <Link href="/purchases/new" className={btnPrimary}>＋ New Purchase Order</Link>}
      />
      {loading ? (
        <Spinner />
      ) : purchases.length === 0 ? (
        <Card><EmptyState message="No purchase orders yet" /></Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <Th>PO Number</Th>
                <Th>Supplier</Th>
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
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <Td className="font-semibold text-indigo-600">{p.poNumber}</Td>
                  <Td className="font-medium text-slate-900">{p.supplierName ?? "—"}</Td>
                  <Td className="text-slate-500">{fmtDate(p.orderDate)}</Td>
                  <Td className="text-right text-slate-500">{p.itemCount}</Td>
                  <Td className="text-right font-semibold text-slate-900">{money(p.total)}</Td>
                  <Td className="text-right text-emerald-600">{money(p.amountPaid)}</Td>
                  <Td className={`text-right font-semibold ${p.balance > 0 ? "text-amber-600" : "text-slate-400"}`}>{money(p.balance)}</Td>
                  <Td><StatusBadge status={p.status} /></Td>
                  <Td><StatusBadge status={p.paymentStatus} /></Td>
                  <Td className="text-right">
                    <button onClick={() => openDetail(p.id)} className="rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">View</button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `PO ${detail.purchase.poNumber}` : ""} wide>
        {detail && (
          <div>
            {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">{error}</div>}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{detail.purchase.supplierName}</p>
                <p className="text-xs text-slate-500">{fmtDate(detail.purchase.orderDate)}{detail.purchase.notes ? ` · ${detail.purchase.notes}` : ""}</p>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={detail.purchase.status} />
                <StatusBadge status={detail.purchase.paymentStatus} />
              </div>
            </div>

            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Product</Th>
                  <Th className="text-right">Qty</Th>
                  <Th className="text-right">Unit cost</Th>
                  <Th className="text-right">Line total</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detail.items.map((i) => (
                  <tr key={i.id}>
                    <Td className="font-medium text-slate-900">{i.productName}</Td>
                    <Td className="text-right">{i.quantity}</Td>
                    <Td className="text-right">{money(i.unitCost)}</Td>
                    <Td className="text-right font-semibold">{money(i.lineTotal)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 space-y-1 rounded-lg bg-slate-50 p-4 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{money(detail.purchase.subtotal)}</span></div>
              <div className="flex justify-between text-slate-600"><span>Tax</span><span>{money(detail.purchase.tax)}</span></div>
              <div className="flex justify-between text-base font-bold text-slate-900"><span>Total</span><span>{money(detail.purchase.total)}</span></div>
              <div className="flex justify-between text-emerald-600"><span>Paid</span><span>{money(detail.purchase.amountPaid)}</span></div>
              <div className="flex justify-between font-semibold text-amber-600"><span>Balance to pay</span><span>{money(detail.purchase.balance)}</span></div>
            </div>

            {canManage && (
              <div className="mt-5 space-y-3">
                {detail.purchase.status !== "RECEIVED" && detail.purchase.status !== "CANCELLED" && (
                  <button onClick={() => receive(detail.purchase)} className={btnSuccess}>📥 Receive goods into stock</button>
                )}
                <div className="flex items-end gap-2">
                  <div className="w-40">
                    <Field label="Amount paid ($)">
                      <Input type="number" min="0" step="0.01" value={paidInput} onChange={(e) => setPaidInput(e.target.value)} />
                    </Field>
                  </div>
                  <button onClick={() => savePayment(detail.purchase.id)} className={btnPrimary}>Update payment</button>
                  <button onClick={() => { setPaidInput(String(detail.purchase.total)); savePayment(detail.purchase.id); }} className={btnGhost}>Mark fully paid</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {detail.purchase.status !== "CANCELLED" && (
                    <button onClick={() => { update(detail.purchase.id, { status: "CANCELLED" }).then((ok) => { if (ok) { setDetail(null); load(); } }); }} className={btnGhost}>Cancel order</button>
                  )}
                  <button onClick={() => remove(detail.purchase)} className={btnDanger}>Delete order</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
