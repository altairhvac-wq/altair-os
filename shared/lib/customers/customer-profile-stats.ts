import {
  averageTicket,
  sumCollectedRevenue,
} from "@/shared/lib/reports/report-metrics";
import { formatCurrency, formatDate, type Customer } from "@/shared/types/customer";
import type { InvoicePayment } from "@/shared/types/invoice-payment";
import type { Job } from "@/shared/types/job";

export type CustomerProfileStat = {
  id: "total-spent" | "jobs-completed" | "avg-ticket" | "last-service";
  label: string;
  value: string;
};

/**
 * Customer Profile stat row — payment-ledger Total Spent / Avg. Ticket,
 * completed-job count, and established last-service date.
 */
export function buildCustomerProfileStats(input: {
  payments: InvoicePayment[];
  jobs: Job[];
  lastServiceDate?: Customer["lastServiceDate"];
  canViewBilling: boolean;
}): CustomerProfileStat[] {
  const jobsCompleted = input.jobs.filter(
    (job) => job.status === "completed",
  ).length;
  const lastService = input.lastServiceDate
    ? formatDate(input.lastServiceDate)
    : "—";

  const stats: CustomerProfileStat[] = [];

  if (input.canViewBilling) {
    stats.push({
      id: "total-spent",
      label: "Total Spent",
      value: formatCurrency(sumCollectedRevenue(input.payments)),
    });
  }

  stats.push({
    id: "jobs-completed",
    label: "Jobs Completed",
    value: String(jobsCompleted),
  });

  if (input.canViewBilling) {
    const avgTicket = averageTicket(input.payments);
    stats.push({
      id: "avg-ticket",
      label: "Avg. Ticket",
      value: avgTicket == null ? "—" : formatCurrency(avgTicket),
    });
  }

  stats.push({
    id: "last-service",
    label: "Last Service",
    value: lastService,
  });

  return stats;
}
