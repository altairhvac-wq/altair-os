import type { Invoice } from "@/shared/types/invoice";
import type { Customer } from "@/shared/types/customer";
import type { Job } from "@/shared/types/job";
import {
  buildInvoiceSearchFields,
  rankAndSortRecords,
} from "@/shared/lib/search";

export function filterInvoicesByArchiveQuery(
  invoices: Invoice[],
  query: string,
  options?: {
    customersById?: Map<string, Customer>;
    jobsById?: Map<string, Job>;
  },
): Invoice[] {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) {
    return [];
  }

  return rankAndSortRecords(invoices, normalizedQuery, (invoice) => {
    const job = invoice.jobId
      ? options?.jobsById?.get(invoice.jobId)
      : undefined;
    return buildInvoiceSearchFields(
      invoice,
      options?.customersById?.get(invoice.customerId),
      job
        ? [job.serviceAddress, job.city, job.state, job.zip]
            .filter(Boolean)
            .join(", ")
        : undefined,
    );
  }).map((entry) => entry.record);
}
