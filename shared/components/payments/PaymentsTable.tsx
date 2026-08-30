"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { Globe } from "lucide-react";
import type { RecentInvoicePayment } from "@/lib/database/queries/invoice-payments";
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import { PaymentsMobileCardList } from "@/shared/components/payments/PaymentsMobileCardList";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import {
  AltairTable,
  AltairTableBody,
  AltairTableCell,
  AltairTableHead,
  AltairTableHeader,
  AltairTablePrimaryCell,
  AltairTableRow,
} from "@/shared/design-system/table";
import { formatDate, formatCurrencyExact } from "@/shared/types/customer";
import { formatPaymentMethod } from "@/shared/types/invoice-payment";

const invoiceNumberLinkFocusClass =
  "hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated";

function handleInvoiceLinkClick(event: MouseEvent<HTMLAnchorElement>) {
  event.stopPropagation();
}

type PaymentsTableProps = {
  payments: RecentInvoicePayment[];
  canManageCustomers?: boolean;
  northStar?: boolean;
};

function PaymentMethodCell({
  payment,
  northStar,
}: {
  payment: RecentInvoicePayment;
  northStar: boolean;
}) {
  const isOnline = payment.source === "stripe";
  const methodLabel = formatPaymentMethod(payment.paymentMethod);

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span
        className={
          northStar ? "text-sm text-[#17130E]" : "text-sm text-slate-700"
        }
      >
        {methodLabel}
      </span>
      {isOnline ? (
        <span
          className="inline-flex items-center gap-0.5 rounded border border-altair-border bg-[var(--surface-tile)] px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.06em] text-altair-ink-on-paper-muted"
          title="Collected online via Stripe"
        >
          <Globe className="h-2.5 w-2.5" aria-hidden="true" />
          Online
        </span>
      ) : null}
    </span>
  );
}

export function PaymentsTable({
  payments,
  canManageCustomers = false,
  northStar = false,
}: PaymentsTableProps) {
  const router = useRouter();

  return (
    <>
      <PaymentsMobileCardList
        payments={payments}
        canManageCustomers={canManageCustomers}
        northStar={northStar}
      />

      <div
        className={`hidden overflow-x-auto md:block${
          northStar ? " invoice-north-star-ledger" : ""
        }`}
      >
        <AltairTable className="min-w-[720px]">
          <AltairTableHeader>
            <AltairTableRow className={northStar ? lt.tableHeaderRow : undefined}>
              <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                Date
              </AltairTableHead>
              <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                Customer
              </AltairTableHead>
              <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                Invoice #
              </AltairTableHead>
              <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                Amount
              </AltairTableHead>
              <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                Method
              </AltairTableHead>
            </AltairTableRow>
          </AltairTableHeader>
          <AltairTableBody>
            {payments.map((payment) => (
              <AltairTableRow
                key={payment.id}
                onClick={() => router.push(`/invoices/${payment.invoiceId}`)}
                className={
                  northStar ? "hover:bg-[rgba(119,89,27,0.04)]" : undefined
                }
              >
                <AltairTableCell
                  className={`whitespace-nowrap tabular-nums ${
                    northStar ? "text-sm text-[#4F4638]" : "text-sm text-slate-600"
                  }`}
                >
                  {formatDate(payment.paymentDate)}
                </AltairTableCell>
                <AltairTableCell>
                  <CustomerNameLink
                    customerId={payment.customerId}
                    customerName={payment.customerName}
                    canManageCustomers={canManageCustomers}
                    className={
                      northStar
                        ? "text-sm text-[#17130E]"
                        : "text-sm text-slate-800"
                    }
                    linkClassName={
                      northStar
                        ? `text-sm font-medium text-[#17130E] ${invoiceNumberLinkFocusClass}`
                        : `text-sm font-medium text-slate-900 ${invoiceNumberLinkFocusClass}`
                    }
                    stopRowNavigation
                  />
                </AltairTableCell>
                <AltairTablePrimaryCell
                  primary={
                    <Link
                      href={`/invoices/${payment.invoiceId}`}
                      onClick={handleInvoiceLinkClick}
                      className={
                        northStar
                          ? `font-semibold text-[#17130E] ${invoiceNumberLinkFocusClass}`
                          : `font-semibold text-slate-900 ${invoiceNumberLinkFocusClass}`
                      }
                    >
                      {payment.invoiceNumber}
                    </Link>
                  }
                />
                <AltairTableCell
                  className={`whitespace-nowrap font-semibold tabular-nums ${
                    northStar ? "text-[#17130E]" : "text-slate-900"
                  }`}
                >
                  {formatCurrencyExact(payment.amount)}
                </AltairTableCell>
                <AltairTableCell>
                  <PaymentMethodCell payment={payment} northStar={northStar} />
                </AltairTableCell>
              </AltairTableRow>
            ))}
          </AltairTableBody>
        </AltairTable>
      </div>
    </>
  );
}
