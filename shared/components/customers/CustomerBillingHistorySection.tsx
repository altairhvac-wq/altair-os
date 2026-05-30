import Link from "next/link";
import { FileText, Receipt } from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { Estimate } from "@/shared/types/estimate";
import type { Invoice } from "@/shared/types/invoice";
import { EstimateStatusBadge } from "@/shared/components/estimates/EstimateStatusBadge";
import { InvoiceStatusBadge } from "@/shared/components/invoices/InvoiceStatusBadge";

type CustomerBillingHistorySectionProps = {
  estimates: Estimate[];
  invoices: Invoice[];
};

function BillingEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
      <p className="text-sm font-medium text-slate-700">{message}</p>
    </div>
  );
}

export function CustomerBillingHistorySection({
  estimates,
  invoices,
}: CustomerBillingHistorySectionProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          <Receipt className="h-4 w-4 text-slate-500" />
        </div>
        <h2 className="text-sm font-bold text-slate-900">Billing history</h2>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Estimates
            </h3>
          </div>

          {estimates.length === 0 ? (
            <div className="mt-3">
              <BillingEmptyState message="No estimates yet" />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {estimates.map((estimate) => (
                <li key={estimate.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/estimates/${estimate.id}`}
                    className="flex items-start justify-between gap-3 rounded-lg transition-colors hover:bg-slate-50 -mx-2 px-2 py-1"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {estimate.estimateNumber}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Created {formatDate(estimate.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(estimate.total)}
                      </p>
                      <EstimateStatusBadge status={estimate.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-slate-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Invoices
            </h3>
          </div>

          {invoices.length === 0 ? (
            <div className="mt-3">
              <BillingEmptyState message="No invoices yet" />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {invoices.map((invoice) => (
                <li key={invoice.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="flex items-start justify-between gap-3 rounded-lg transition-colors hover:bg-slate-50 -mx-2 px-2 py-1"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Issued {formatDate(invoice.issueDate)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(invoice.total)}
                      </p>
                      <InvoiceStatusBadge status={invoice.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
