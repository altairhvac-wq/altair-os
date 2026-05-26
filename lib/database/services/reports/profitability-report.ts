import { listEstimates } from "@/lib/database/queries/estimates";
import { listExpenses } from "@/lib/database/queries/expenses";
import { listInvoices } from "@/lib/database/queries/invoices";
import { listJobMaterialsForCompany } from "@/lib/database/queries/job-materials";
import { listJobs } from "@/lib/database/queries/jobs";
import { listTimeEntries } from "@/lib/database/queries/time-entries";
import {
  aggregateJobProfitabilitySnapshots,
  buildProfitabilityReportMeta,
  jobMatchesProfitabilityScheduledDateRange,
  resolveProfitabilityReportDateBounds,
  type ProfitabilityReport,
  type ProfitabilityReportDateRange,
} from "@/shared/types/reports";
import { computeJobProfitability } from "@/shared/types/job-profitability";
import type { Estimate } from "@/shared/types/estimate";
import type { Expense } from "@/shared/types/expense";
import type { Invoice } from "@/shared/types/invoice";
import type { JobMaterial } from "@/shared/types/job-material";
import type { Job } from "@/shared/types/job";
import type { TimeEntry } from "@/shared/types/time-entry";

type ProfitabilityReportOptions = {
  dateRange?: ProfitabilityReportDateRange;
};

function groupByJobId<T extends { jobId?: string }>(
  items: T[],
  jobIds: Set<string>,
): Map<string, T[]> {
  const map = new Map<string, T[]>();

  for (const item of items) {
    if (!item.jobId || !jobIds.has(item.jobId)) {
      continue;
    }

    const existing = map.get(item.jobId);
    if (existing) {
      existing.push(item);
    } else {
      map.set(item.jobId, [item]);
    }
  }

  return map;
}

export async function getCompanyProfitabilityReport(
  companyId: string,
  options: ProfitabilityReportOptions = {},
): Promise<ProfitabilityReport> {
  const dateRange = options.dateRange ?? "all";
  const dateBounds =
    dateRange === "all"
      ? null
      : resolveProfitabilityReportDateBounds(dateRange);

  const [jobs, invoices, estimates, expenses, laborEntries, materials] =
    await Promise.all([
      listJobs(companyId),
      listInvoices(companyId),
      listEstimates(companyId),
      listExpenses(companyId),
      listTimeEntries(companyId, { entryType: "job_labor" }),
      listJobMaterialsForCompany(companyId),
    ]);

  const scopedJobs: Job[] = dateBounds
    ? jobs.filter((job) =>
        jobMatchesProfitabilityScheduledDateRange(job, dateBounds),
      )
    : jobs;

  const jobIds = new Set(scopedJobs.map((job) => job.id));

  const invoicesByJob = groupByJobId(invoices, jobIds);
  const estimatesByJob = groupByJobId(estimates, jobIds);
  const expensesByJob = groupByJobId(expenses, jobIds);
  const laborByJob = groupByJobId(laborEntries, jobIds);
  const materialsByJob = groupByJobId(materials, jobIds);

  const snapshots = scopedJobs.map((job) =>
    computeJobProfitability({
      invoices: (invoicesByJob.get(job.id) ?? []) as Invoice[],
      estimates: (estimatesByJob.get(job.id) ?? []) as Estimate[],
      expenses: (expensesByJob.get(job.id) ?? []) as Expense[],
      materials: (materialsByJob.get(job.id) ?? []) as JobMaterial[],
      laborEntries: (laborByJob.get(job.id) ?? []) as TimeEntry[],
    }),
  );

  const summary = aggregateJobProfitabilitySnapshots(snapshots);

  return {
    summary,
    meta: buildProfitabilityReportMeta({
      dateRange,
      dateBounds,
      summary,
    }),
  };
}
