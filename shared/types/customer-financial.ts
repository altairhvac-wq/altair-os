import {
  isActiveInvoice,
  roundCurrency,
  type Invoice,
} from "@/shared/types/invoice";

export type CustomerFinancialSummary = {
  totalInvoiced: number;
  totalCollected: number;
  outstandingBalance: number;
  invoiceCount: number;
  paidInvoiceCount: number;
};

function normalizeAmount(value: number): number {
  return Number.isFinite(value) ? roundCurrency(value) : 0;
}

/**
 * Customer-level billing totals from invoice records.
 *
 * Invoiced/collected/outstanding follow the same rules as job profitability and
 * company revenue reports: void/cancelled invoices are excluded; draft invoices
 * count toward invoiced totals.
 */
export function computeCustomerFinancialSummary(
  invoices: Invoice[],
): CustomerFinancialSummary {
  const activeInvoices = invoices.filter(isActiveInvoice);

  const totalInvoiced = roundCurrency(
    activeInvoices.reduce(
      (sum, invoice) => sum + normalizeAmount(invoice.total),
      0,
    ),
  );

  const totalCollected = roundCurrency(
    activeInvoices.reduce(
      (sum, invoice) => sum + normalizeAmount(invoice.amountPaid),
      0,
    ),
  );

  const outstandingBalance = roundCurrency(
    activeInvoices
      .filter((invoice) => invoice.balanceDue > 0)
      .reduce((sum, invoice) => sum + normalizeAmount(invoice.balanceDue), 0),
  );

  return {
    totalInvoiced,
    totalCollected,
    outstandingBalance,
    invoiceCount: activeInvoices.length,
    paidInvoiceCount: activeInvoices.filter(
      (invoice) => invoice.status === "paid",
    ).length,
  };
}

export const EMPTY_CUSTOMER_FINANCIAL_SUMMARY: CustomerFinancialSummary = {
  totalInvoiced: 0,
  totalCollected: 0,
  outstandingBalance: 0,
  invoiceCount: 0,
  paidInvoiceCount: 0,
};
