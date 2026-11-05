"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function StudentVoucherRecord({ voucher }: { voucher: any }) {
  const [payments, setPayments] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function showPayments() {
    if (payments) { setPayments(null); return; }
    setLoading(true); setError("");
    try { const response = await api.get(`/student/vouchers/${voucher._id}/payments`); setPayments(response.data.data.items); }
    catch (err: any) { setError(err.response?.data?.message ?? "Unable to load payment history."); }
    finally { setLoading(false); }
  }
  return <div><div className="flex flex-wrap justify-between gap-3"><div><strong>{voucher.month}/{voucher.year}</strong><p className="mt-1 text-sm text-muted-foreground">Due {new Date(voucher.dueDate).toLocaleDateString()}</p></div><div className="text-end"><strong>PKR {voucher.total - voucher.paid}</strong><p className="mt-1 text-sm capitalize text-muted-foreground">{voucher.status}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={showPayments} disabled={loading}>{loading ? "Loading…" : payments ? "Hide payments" : "Payment history"}</Button><Button asChild variant="outline" size="sm"><Link href={`/student/vouchers/${voucher._id}`}>View / print voucher</Link></Button></div>{error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}{payments && <div className="mt-4 space-y-2 border-t pt-3">{payments.length ? payments.map(payment => <p key={payment._id} className="flex justify-between gap-3 text-sm"><span>{new Date(payment.date).toLocaleDateString()} · {payment.method}</span><strong>PKR {payment.amount}</strong></p>) : <p className="text-sm text-muted-foreground">No payments recorded.</p>}</div>}</div>;
}
