import Link from "next/link";
import { ChevronRight, Globe } from "lucide-react";
import type { RecentInvoicePayment } from "@/lib/database/queries/invoice-payments";
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import { formatDate, formatCurrencyExact } from "@/shared/types/customer";
import { formatPaymentMethod } from "@/shared/types/invoice-payment";

type PaymentsMobileCardListProps = {
  payments: RecentInvoicePayment[];
  canManageCustomers?: boolean;
  northStar?: boolean;
};

export function PaymentsMobileCardList({
  payments,
  canManageCustomers = false,
  northStar = false,
}: PaymentsMobileCardListProps) {
  return (
    <ul
      className={`md:hidden ${
        northStar
          ? "divide-y divide-[rgba(119,89,27,0.12)]"
          : "divide-y divide-slate-100"
      }`}
    >
      {payments.map((payment) => {
        const isOnline = payment.source === "stripe";
        const methodLabel = formatPaymentMethod(payment.paymentMethod);

        return (
          <li key={payment.id}>
            <Link
              href={`/invoices/${payment.invoiceId}`}
              className={`flex items-center gap-3 px-3.5 py-3 transition-colors ${
                northStar
                  ? "hover:bg-[rgba(119,89,27,0.04)]"
                  : "hover:bg-slate-50"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p
                    className={`truncate text-sm font-semibold ${
                      northStar ? "text-[#17130E]" : "text-slate-900"
                    }`}
                  >
                    {formatCurrencyExact(payment.amount)}
                  </p>
                  <p className="shrink-0 text-xs tabular-nums text-altair-ink-on-paper-muted">
                    {formatDate(payment.paymentDate)}
                  </p>
                </div>
                <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                  <CustomerNameLink
                    customerId={payment.customerId}
                    customerName={payment.customerName}
                    canManageCustomers={canManageCustomers}
                    className="truncate text-sm text-altair-ink-on-paper-secondary"
                    linkClassName="truncate text-sm font-medium text-altair-ink-on-paper transition-colors hover:underline"
                    stopRowNavigation
                  />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-altair-ink-on-paper-muted">
                  <span>{payment.invoiceNumber}</span>
                  <span aria-hidden="true">·</span>
                  <span>{methodLabel}</span>
                  {isOnline ? (
                    <span className="inline-flex items-center gap-0.5 rounded border border-altair-border bg-[var(--surface-tile)] px-1 py-px text-[10px] font-semibold uppercase tracking-[0.06em] text-altair-ink-on-paper-muted">
                      <Globe className="h-2.5 w-2.5" aria-hidden="true" />
                      Online
                    </span>
                  ) : null}
                </div>
              </div>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-altair-ink-on-paper-muted"
                aria-hidden="true"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
