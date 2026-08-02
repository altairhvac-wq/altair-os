import {
  countInvoicesForWorkQueue,
  filterInvoicesForWorkQueue,
  INVOICE_WORK_QUEUE_LABELS,
  INVOICE_WORK_QUEUE_ORDER,
  sumBalanceDueForWorkQueue,
  type InvoiceWorkQueue,
} from "@/shared/components/invoices/invoice-work-queues";
import { formatCurrency } from "@/shared/types/customer";
import { roundCurrency, type Invoice } from "@/shared/types/invoice";
import type { InvoicePayment } from "@/shared/types/invoice-payment";

/** Payment-ledger total (invoice_payments), not invoice.amountPaid / total. */
function sumCollectedFromPayments(
  payments: ReadonlyArray<InvoicePayment>,
): number {
  return roundCurrency(
    payments.reduce(
      (sum, payment) =>
        sum + (Number.isFinite(payment.amount) ? payment.amount : 0),
      0,
    ),
  );
}

export type InvoicesGlanceStat = {
  id: string;
  label: string;
  value: string;
  /** Omitted for Past (count only). */
  amount?: string;
  detail: string;
  /** When set, clicking the stat activates this list filter. */
  filterQueue?: InvoiceWorkQueue;
};

const FILTER_DETAILS: Record<InvoiceWorkQueue, string> = {
  draft: "Active drafts waiting to finish or send",
  sent: "Active sent invoices awaiting payment",
  partially_paid: "Active invoices with a partial payment on file",
  overdue: "Active past-due invoices needing follow-up",
  paid: "Active paid invoices · collected from payment ledger",
  past: "Active void or cancelled invoices",
};

/**
 * Builds compact glance stats for the Invoices list header.
 * Owed queues use sum(balanceDue); Paid uses invoice_payments ledger sum.
 * Past is count-only.
 */
export function buildInvoicesGlanceStats(input: {
  invoices: ReadonlyArray<Invoice>;
  payments: ReadonlyArray<InvoicePayment>;
}): InvoicesGlanceStat[] {
  const invoices = [...input.invoices];
  const payments = [...input.payments];

  return INVOICE_WORK_QUEUE_ORDER.map((queue) => {
    const count = countInvoicesForWorkQueue(invoices, queue);
    const label = INVOICE_WORK_QUEUE_LABELS[queue];

    if (queue === "past") {
      return {
        id: queue,
        label,
        value: String(count),
        detail:
          count === 0
            ? "No void or cancelled invoices"
            : FILTER_DETAILS.past,
        filterQueue: queue,
      };
    }

    if (queue === "paid") {
      const paidInvoices = filterInvoicesForWorkQueue(invoices, "paid");
      const paidIds = new Set(paidInvoices.map((invoice) => invoice.id));
      const paidPayments = payments.filter((payment) =>
        paidIds.has(payment.invoiceId),
      );
      const collected = sumCollectedFromPayments(paidPayments);

      return {
        id: queue,
        label,
        value: String(count),
        amount: formatCurrency(collected),
        detail:
          count === 0
            ? "No paid invoices"
            : `${FILTER_DETAILS.paid} · ${formatCurrency(collected)}`,
        filterQueue: queue,
      };
    }

    const balanceDue = sumBalanceDueForWorkQueue(invoices, queue);

    return {
      id: queue,
      label,
      value: String(count),
      amount: formatCurrency(balanceDue),
      detail:
        count === 0
          ? `No ${label.toLowerCase()} invoices`
          : `${FILTER_DETAILS[queue]} · ${formatCurrency(balanceDue)} owed`,
      filterQueue: queue,
    };
  });
}
