import { computeCustomerFinancialSummary } from "@/shared/types/customer-financial";
import type { Customer } from "@/shared/types/customer";
import type { Invoice } from "@/shared/types/invoice";
import type { Job } from "@/shared/types/job";

export type CustomerOperationalStats = {
  totalJobs: number;
  totalRevenue: number;
  lastServiceDate?: string;
};

type JobCompletionFields = Pick<Job, "status" | "completedAt" | "scheduledDate">;

type CustomerOperationalInvoiceFields = Pick<
  Invoice,
  "status" | "total" | "amountPaid" | "balanceDue"
>;

function toDateOnly(value: string): string {
  return value.split("T")[0] ?? value;
}

export function resolveJobCompletionDate(
  job: JobCompletionFields,
): string | null {
  if (job.status !== "completed") {
    return null;
  }

  return job.completedAt ?? job.scheduledDate ?? null;
}

export function computeLastServiceDateFromJobs(
  jobs: JobCompletionFields[],
): string | undefined {
  const completionDates = jobs
    .map(resolveJobCompletionDate)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => right.localeCompare(left));

  const latest = completionDates[0];
  return latest ? toDateOnly(latest) : undefined;
}

export function computeCustomerOperationalStatsFromRecords(input: {
  jobCount: number;
  completedJobs: JobCompletionFields[];
  invoices: CustomerOperationalInvoiceFields[];
}): CustomerOperationalStats {
  const financial = computeCustomerFinancialSummary(
    input.invoices as Invoice[],
  );

  return {
    totalJobs: input.jobCount,
    totalRevenue: financial.totalCollected,
    lastServiceDate: computeLastServiceDateFromJobs(input.completedJobs),
  };
}

export function mergeCustomerOperationalStats(
  customer: Customer,
  stats: CustomerOperationalStats,
): Customer {
  return {
    ...customer,
    totalJobs: stats.totalJobs,
    totalRevenue: stats.totalRevenue,
    lastServiceDate: stats.lastServiceDate,
  };
}

export const EMPTY_CUSTOMER_OPERATIONAL_STATS: CustomerOperationalStats = {
  totalJobs: 0,
  totalRevenue: 0,
};
