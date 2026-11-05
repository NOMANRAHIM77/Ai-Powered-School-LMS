"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function StudentVoucherPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [voucher, setVoucher] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!localStorage.getItem("educore-access-token")) { router.replace("/login/student"); return; }
    api.get(`/student/vouchers/${params.id}`).then(response => setVoucher(response.data.data)).catch(err => setError(err.response?.data?.message ?? "Unable to load voucher."));
  }, [params.id, router]);
  return <main className="min-h-screen bg-muted p-4 sm:p-8"><div className="mx-auto mb-6 flex max-w-[210mm] justify-between gap-2 print:hidden"><Button asChild variant="outline"><Link href="/student"><ArrowLeft />Back</Link></Button><Button onClick={() => window.print()} disabled={!voucher}><Printer />Print / save PDF</Button></div>{error ? <p className="mx-auto max-w-[210mm] rounded-lg bg-card p-6 text-destructive" role="alert">{error}</p> : !voucher ? <p className="mx-auto max-w-[210mm] rounded-lg bg-card p-6" role="status">Loading voucher…</p> : <article className="print-page mx-auto min-h-[200mm] max-w-[210mm] bg-white p-8 text-slate-900 shadow-card print:p-0"><header className="border-b-2 border-indigo-600 pb-5 text-center"><h1 className="font-display text-2xl font-bold text-indigo-700">Bright Future Academy</h1><p className="mt-2 text-sm">Fee voucher · {voucher.month}/{voucher.year}</p></header><div className="mt-6 grid grid-cols-2 gap-4 text-sm"><p><strong>Voucher:</strong> {voucher._id}</p><p><strong>Due:</strong> {new Date(voucher.dueDate).toLocaleDateString()}</p><p><strong>Status:</strong> {voucher.status}</p></div><table className="mt-8 w-full text-sm"><thead><tr className="border-y"><th className="py-3 text-start">Description</th><th className="py-3 text-end">Amount (PKR)</th></tr></thead><tbody>{voucher.items.map((item: any) => <tr className="border-b" key={item._id}><td className="py-3">{item.title}</td><td className="py-3 text-end">{item.amount}</td></tr>)}</tbody></table><div className="ms-auto mt-6 max-w-xs space-y-2 text-sm"><p className="flex justify-between"><span>Total</span><strong>{voucher.total}</strong></p><p className="flex justify-between"><span>Paid</span><strong>{voucher.paid}</strong></p><p className="flex justify-between border-t pt-2 text-base"><span>Amount due</span><strong>{voucher.total - voucher.paid}</strong></p></div></article>}</main>;
}
