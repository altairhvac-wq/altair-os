import { listInvoicePayments } from "@/lib/database/queries/invoice-payments";
import { listInvoices } from "@/lib/database/queries/invoices";
import { roundCurrency, type Invoice, type InvoiceStatus } from "@/shared/types/invoice";
import {
  buildReportSectionMeta,
  isDateWithinReportBounds,
  type ProfitabilityReportDateRange,
  type RevenueReport,
  resolveReportDateBounds,
} from "@/shared/types/reports";

const EXCLUDED_INVOICE_STATUSES: ReadonlySet<InvoiceStatus> = new Set([
  "void",
  "cancelled",
]);

function isActiveInvoice(invoice: Invoice): boolean {
  return !EXCLUDED_INVOICE_STATUSES.has(invoice.status);
}

type RevenueReportOptions = {
  dateRange?: ProfitabilityReportDateRange;
};

export async function getCompanyRevenueReport(
  companyId: string,
  options: RevenueReportOptions = {},
): Promise<RevenueReport> {
  const dateRange = options.dateRange ?? "30d";
  const dateBounds = resolveReportDateBounds(dateRange);
  const limitations: string[] = [];

  const [invoices, payments] = await Promise.all([
    listInvoices(companyId),
    listInvoicePayments(companyId),
  ]);

  const activeInvoices = invoices.filter(isActiveInvoice);

  const scopedPayments = dateBounds
    ? payments.filter((payment) =>
        isDateWithinReportBounds(payment.paymentDate, dateBounds),
      )
    : payments;

  const scopedInvoices = dateBounds
    ? activeInvoices.filter((invoice) =>
        isDateWithinReportBounds(invoice.issueDate, dateBounds),
      )
    : activeInvoices;

  const collectedRevenue = roundCurrency(
    scopedPayments.reduce((sum, payment) => sum + payment.amount, 0),
  );

  const invoicedRevenue = roundCurrency(
    scopedInvoices.reduce((sum, invoice) => sum + invoice.total, 0),
  );

  const outstandingRevenue = roundCurrency(
    activeInvoices
      .filter((invoice) => invoice.balanceDue > 0)
      .reduce((sum, invoice) => sum + invoice.balanceDue, 0),
  );

  if (dateBounds) {
    limitations.push(
      "Outstanding revenue reflects current unpaid balances across all invoices, not limited to the selected period.",
    );
  }

  return {
    summary: {
      collectedRevenue,
      invoicedRevenue,
      outstandingRevenue,
      paymentCount: scopedPayments.length,
    },
    meta: buildReportSectionMeta({
      dateRange,
      dateBounds,
      limitations,
    }),
  };
}
