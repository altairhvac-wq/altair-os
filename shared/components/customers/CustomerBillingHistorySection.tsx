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
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

type CustomerBillingHistorySectionProps = {
  customerId: string;
  estimates: Estimate[];
  invoices: Invoice[];
  payments: InvoicePayment[];
  canManageBilling: boolean;
  northStar?: boolean;
  compact?: boolean;
};

const COMPACT_LIST_LIMIT = 4;

function BillingEmptyState({
  message,
  northStar = false,
}: {
  message: string;
  northStar?: boolean;
}) {
  return (
    <div
      className={
        northStar
          ? dt.emptyState
          : "rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center"
      }
    >
      <p
        className={
          northStar
            ? "text-sm font-medium text-[#4F4638]"
            : "text-sm font-medium text-slate-700"
        }
      >
        {message}
      </p>
    </div>
  );
}

export function CustomerBillingHistorySection({
  customerId,
  estimates,
  invoices,
  payments,
  canManageBilling,
  northStar = false,
  compact = false,
}: CustomerBillingHistorySectionProps) {
  const invoiceNumberById = new Map(
    invoices.map((invoice) => [invoice.id, invoice.invoiceNumber]),
  );
  const sectionClass = northStar
    ? compact
      ? dt.compactSectionSurface
      : dt.sectionSurface
    : adminCardSectionClass;
  const rowHoverClass = northStar
    ? dt.listRowHover
    : "rounded-lg transition-colors hover:bg-slate-50 -mx-2 px-2 py-1";
  const visibleEstimates = compact
    ? estimates.slice(0, COMPACT_LIST_LIMIT)
    : estimates;
  const visibleInvoices = compact
    ? invoices.slice(0, COMPACT_LIST_LIMIT)
    : invoices;
  const visiblePayments = compact
    ? payments.slice(0, COMPACT_LIST_LIMIT)
    : payments;
  const subheadingClass = northStar
    ? dt.metricLabel
    : "text-xs font-semibold uppercase tracking-wide text-slate-500";
  const iconClass = northStar ? "h-4 w-4 text-[#8A6324]" : "h-4 w-4 text-slate-400";
  const primaryTextClass = northStar
    ? "font-semibold text-[#17130E]"
    : "font-semibold text-slate-900";
  const secondaryTextClass = northStar
    ? "mt-0.5 text-xs text-[#64748B]"
    : "mt-0.5 text-xs text-slate-500";
  const amountClass = northStar
    ? "text-sm font-semibold text-[#17130E]"
    : "text-sm font-semibold text-slate-900";

  return (
    <section
      className={`${sectionClass} scroll-mt-6`}
      id={CUSTOMER_DETAIL_BILLING_ANCHOR}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={
              northStar
                ? dt.sectionIconWrap
                : "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100"
            }
          >
            <Receipt className={northStar ? "h-4 w-4" : "h-4 w-4 text-slate-500"} />
          </div>
          <h2 className={northStar ? dt.sectionTitle : "text-sm font-bold text-slate-900"}>
            Billing history
          </h2>
        </div>
        {canManageBilling ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={createEstimateForCustomerHref(customerId)}
              className={northStar ? dt.secondaryAction : "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"}
            >
              <FileText className="h-3.5 w-3.5" />
              New estimate
            </Link>
            <Link
              href={createInvoiceForCustomerHref(customerId)}
              className={northStar ? dt.secondaryAction : "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"}
            >
              <Receipt className="h-3.5 w-3.5" />
              New invoice
            </Link>
          </div>
        ) : null}
      </div>

      <div className={`${compact ? "mt-3" : "mt-4"} grid gap-3 lg:grid-cols-2`}>
        <div>
          <div className="flex items-center gap-2">
            <FileText className={iconClass} />
            <h3 className={subheadingClass}>Estimates</h3>
          </div>

          {estimates.length === 0 ? (
            <div className="mt-2">
              <BillingEmptyState message="No estimates yet" northStar={northStar} />
            </div>
          ) : (
            <ul className={`mt-2 ${northStar ? dt.listDivider : "divide-y divide-slate-100"}`}>
              {visibleEstimates.map((estimate) => (
                <li key={estimate.id} className="py-2.5 first:pt-0 last:pb-0">
                  <Link
                    href={`/estimates/${estimate.id}`}
                    className={`flex items-start justify-between gap-3 ${rowHoverClass}`}
                  >
                    <div className="min-w-0">
                      <p className={primaryTextClass}>{estimate.estimateNumber}</p>
                      <p className={secondaryTextClass}>
                        Created {formatDate(estimate.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <p className={amountClass}>{formatCurrency(estimate.total)}</p>
                      <EstimateStatusBadge status={estimate.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {compact && estimates.length > COMPACT_LIST_LIMIT ? (
            <p className={northStar ? dt.truncatedHint : "mt-2 text-xs text-slate-500"}>
              Showing {visibleEstimates.length} of {estimates.length} estimates
            </p>
          ) : null}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <Receipt className={iconClass} />
            <h3 className={subheadingClass}>Invoices</h3>
          </div>

          {invoices.length === 0 ? (
            <div className="mt-2">
              <BillingEmptyState message="No invoices yet" northStar={northStar} />
            </div>
          ) : (
            <ul className={`mt-2 ${northStar ? dt.listDivider : "divide-y divide-slate-100"}`}>
              {visibleInvoices.map((invoice) => (
                <li key={invoice.id} className="py-2.5 first:pt-0 last:pb-0">
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className={`flex items-start justify-between gap-3 ${rowHoverClass}`}
                  >
                    <div className="min-w-0">
                      <p className={primaryTextClass}>{invoice.invoiceNumber}</p>
                      <p className={secondaryTextClass}>
                        Issued {formatDate(invoice.issueDate)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <p className={amountClass}>{formatCurrency(invoice.total)}</p>
                      <InvoiceStatusBadge status={invoice.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {compact && invoices.length > COMPACT_LIST_LIMIT ? (
            <p className={northStar ? dt.truncatedHint : "mt-2 text-xs text-slate-500"}>
              Showing {visibleInvoices.length} of {invoices.length} invoices
            </p>
          ) : null}
        </div>
      </div>

      <div className={compact ? "mt-3" : "mt-4"}>
        <div className="flex items-center gap-2">
          <CreditCard className={iconClass} />
          <h3 className={subheadingClass}>Payments</h3>
        </div>
        <div className="mt-2">
          {payments.length === 0 ? (
            <BillingEmptyState message="No payments recorded yet" northStar={northStar} />
          ) : (
            <ul className={northStar ? dt.listDivider : "divide-y divide-slate-100"}>
              {visiblePayments.map((payment) => (
                <li key={payment.id} className="py-2.5 first:pt-0 last:pb-0">
                  <Link
                    href={`/invoices/${payment.invoiceId}`}
                    className={`flex items-start justify-between gap-3 ${rowHoverClass}`}
                  >
                    <div className="min-w-0">
                      <p className={primaryTextClass}>
                        {invoiceNumberById.get(payment.invoiceId) ?? "Invoice"}
                      </p>
                      <p className={secondaryTextClass}>
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
          {compact && payments.length > COMPACT_LIST_LIMIT ? (
            <p className={northStar ? dt.truncatedHint : "mt-2 text-xs text-slate-500"}>
              Showing {visiblePayments.length} of {payments.length} payments
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
