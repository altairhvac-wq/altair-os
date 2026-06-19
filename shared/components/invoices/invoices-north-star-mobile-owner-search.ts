import { formatCurrency } from "@/shared/types/customer";
import { formatInvoiceStatus, type Invoice } from "@/shared/types/invoice";

export function filterInvoicesByArchiveQuery(
  invoices: Invoice[],
  query: string,
): Invoice[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 2) {
    return [];
  }

  return invoices.filter((invoice) => {
    const haystack = [
      invoice.invoiceNumber,
      invoice.customerName,
      formatInvoiceStatus(invoice.status),
      invoice.status,
      formatCurrency(invoice.total),
      String(invoice.total),
      formatCurrency(invoice.balanceDue),
      String(invoice.balanceDue),
      invoice.jobNumber ?? "",
      invoice.estimateNumber ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}
