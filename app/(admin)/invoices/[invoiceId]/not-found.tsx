import Link from "next/link";
import { Receipt } from "lucide-react";

export default function InvoiceNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <Receipt className="h-7 w-7 text-slate-400" />
      </div>
      <h1 className="mt-5 text-lg font-bold text-slate-900">
        Invoice not found
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        This invoice may have been removed or you may not have access to view
        it.
      </p>
      <Link
        href="/invoices"
        className="mt-6 inline-flex rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
      >
        Back to invoices
      </Link>
    </div>
  );
}
