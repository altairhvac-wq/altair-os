import type { Job } from "@/shared/types/job";
import type { Customer } from "@/shared/types/customer";
import type { JobBillingSummariesByJobId } from "@/shared/lib/job-next-business-action";
import {
  buildJobSearchFields,
  rankAndSortRecords,
} from "@/shared/lib/search";

export function filterJobsByArchiveQuery(
  jobs: Job[],
  query: string,
  options?: {
    customersById?: Map<string, Customer>;
    billingSummaries?: JobBillingSummariesByJobId;
  },
): Job[] {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) {
    return [];
  }

  return rankAndSortRecords(jobs, normalizedQuery, (job) =>
    buildJobSearchFields(
      job,
      options?.customersById?.get(job.customerId),
      {
        estimateNumbers: (
          options?.billingSummaries?.estimatesByJobId[job.id] ?? []
        ).map((estimate) => estimate.estimateNumber),
        invoiceNumbers: (
          options?.billingSummaries?.invoicesByJobId[job.id] ?? []
        ).map((invoice) => invoice.invoiceNumber),
      },
    ),
  ).map((entry) => entry.record);
}
