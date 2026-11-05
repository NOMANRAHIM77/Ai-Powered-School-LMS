import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";

import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";

export default function VoucherPage() {
  return <>
    <div className="mb-6 flex items-center justify-between print:hidden">
      <Button asChild variant="ghost"><Link href="/fees"><ArrowLeft />Back to fees</Link></Button>
      <div className="flex gap-2"><Button variant="outline"><Download />Download PDF</Button><PrintButton label="Print voucher" /></div>
    </div>
    <article className="print-page mx-auto max-w-[210mm] bg-white p-8 text-slate-900 shadow-card print:max-w-none print:p-0 print:shadow-none">
      <header className="flex items-start justify-between border-b-2 border-indigo-600 pb-6"><div><p className="font-display text-2xl font-bold text-indigo-700">Bright Future Academy</p><p className="mt-1 text-sm text-slate-600">123 Education Road, Karachi · +92 21 12345678</p></div><div className="text-end"><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Fee voucher</p><p className="mt-1 font-mono font-bold">V-10242</p></div></header>
      <section className="mt-6 grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-5 text-sm"><div><p className="text-xs text-slate-500">Student</p><p className="font-semibold">Hamza Siddiqui</p></div><div><p className="text-xs text-slate-500">Class / Roll no.</p><p className="font-semibold">Grade 8-A · 08-A-02</p></div><div><p className="text-xs text-slate-500">Billing month</p><p className="font-semibold">October 2026</p></div><div><p className="text-xs text-slate-500">Due date</p><p className="font-semibold text-red-700">28 October 2026</p></div></section>
      <table className="mt-8 w-full text-sm"><thead><tr className="border-y bg-slate-50"><th className="px-3 py-3 text-start">Fee item</th><th className="px-3 py-3 text-end">Amount</th></tr></thead><tbody><tr className="border-b"><td className="px-3 py-4">Monthly tuition</td><td className="px-3 py-4 text-end">PKR 15,000</td></tr><tr className="border-b"><td className="px-3 py-4">Laboratory fee</td><td className="px-3 py-4 text-end">PKR 2,000</td></tr><tr className="border-b"><td className="px-3 py-4">Student activities</td><td className="px-3 py-4 text-end">PKR 1,500</td></tr></tbody><tfoot><tr><td className="px-3 pt-5 text-end font-semibold">Voucher total</td><td className="px-3 pt-5 text-end font-display text-xl font-bold">PKR 18,500</td></tr><tr><td className="px-3 pt-2 text-end text-slate-600">Already paid</td><td className="px-3 pt-2 text-end text-slate-600">PKR 10,000</td></tr><tr><td className="px-3 pt-2 text-end font-bold">Balance due</td><td className="px-3 pt-2 text-end font-display text-xl font-bold text-red-700">PKR 8,500</td></tr></tfoot></table>
      <div className="mt-16 grid grid-cols-2 gap-16 text-center text-xs text-slate-500"><div className="border-t pt-2">Accounts officer signature</div><div className="border-t pt-2">Parent / guardian signature</div></div>
      <footer className="mt-12 border-t pt-5 text-xs leading-5 text-slate-500"><p>Payment methods: cash at the accounts office, bank transfer, or approved card payment. Please retain this voucher for your records.</p></footer>
    </article>
  </>;
}
