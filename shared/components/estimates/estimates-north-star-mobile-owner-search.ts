import type { Estimate } from "@/shared/types/estimate";
import type { Customer } from "@/shared/types/customer";
import type { Job } from "@/shared/types/job";
import {
  buildEstimateSearchFields,
  rankAndSortRecords,
} from "@/shared/lib/search";

export function filterEstimatesByArchiveQuery(
  estimates: Estimate[],
  query: string,
  options?: {
    customersById?: Map<string, Customer>;
    jobsById?: Map<string, Job>;
    invoicesByEstimateId?: Map<string, string[]>;
  },
): Estimate[] {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) {
    return [];
  }

  return rankAndSortRecords(estimates, normalizedQuery, (estimate) => {
    const job = estimate.jobId
      ? options?.jobsById?.get(estimate.jobId)
      : undefined;
    return buildEstimateSearchFields(
      estimate,
      options?.customersById?.get(estimate.customerId),
      {
        invoiceNumbers: options?.invoicesByEstimateId?.get(estimate.id),
        serviceAddress: job
          ? [job.serviceAddress, job.city, job.state, job.zip]
              .filter(Boolean)
              .join(", ")
          : undefined,
      },
    );
  }).map((entry) => entry.record);
}
