import Link from "next/link";
import { CreditCard, FileText, Receipt } from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { Estimate } from "@/shared/types/estimate";
import type { Invoice } from "@/shared/types/invoice";
import {
  formatPaymentMethod,
  type InvoicePayment,
} from "@/shared/types/invoice-payment";
import { EstimateStatusBadge } from "@/shared/components/estimates/EstimateStatusBadge";
import { InvoiceStatusBadge } from "@/shared/components/invoices/InvoiceStatusBadge";
import {
  createEstimateForCustomerHref,
  createInvoiceForCustomerHref,
} from "@/shared/lib/customers/customer-action-links";
import { CUSTOMER_DETAIL_BILLING_ANCHOR } from "@/shared/lib/customers/customer-detail-anchors";
import { adminCardSectionClass } from "@/shared/lib/admin-density";

type CustomerBillingHistorySectionProps = {
  customerId: string;
  estimates: Estimate[];
  invoices: Invoice[];
  payments: InvoicePayment[];
  canManageBilling: boolean;
};

function BillingEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
      <p className="text-sm font-medium text-slate-700">{message}</p>
    </div>
  );
}

export function CustomerBillingHistorySection({
  customerId,
  estimates,
  invoices,
  payments,
  canManageBilling,
}: CustomerBillingHistorySectionProps) {
  const invoiceNumberById = new Map(
    invoices.map((invoice) => [invoice.id, invoice.invoiceNumber]),
  );

  return (
    <section
      className={`${adminCardSectionClass} scroll-mt-6`}
      id={CUSTOMER_DETAIL_BILLING_ANCHOR}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            <Receipt className="h-4 w-4 text-slate-500" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">Billing history</h2>
        </div>
        {canManageBilling ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={createEstimateForCustomerHref(customerId)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <FileText className="h-3.5 w-3.5" />
              New estimate
            </Link>
            <Link
              href={createInvoiceForCustomerHref(customerId)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Receipt className="h-3.5 w-3.5" />
              New invoice
            </Link>
          </div>
        ) : null}
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

      <div className="mt-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-slate-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Payments
          </h3>
        </div>
        <div className="mt-3">
          {payments.length === 0 ? (
            <BillingEmptyState message="No payments recorded yet" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {payments.map((payment) => (
                <li key={payment.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/invoices/${payment.invoiceId}`}
                    className="flex items-start justify-between gap-3 rounded-lg transition-colors hover:bg-slate-50 -mx-2 px-2 py-1"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {invoiceNumberById.get(payment.invoiceId) ?? "Invoice"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDate(payment.paymentDate)} ·{" "}
                        {formatPaymentMethod(payment.paymentMethod)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-emerald-700">
                      {formatCurrency(payment.amount)}
                    </p>
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
