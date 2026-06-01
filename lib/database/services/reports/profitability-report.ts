import {
  loadCompanyOperationalDatasets,
  type CompanyOperationalDatasets,
} from "@/lib/database/services/operations/company-operational-datasets";
import {
  aggregateJobProfitabilitySnapshots,
  buildProfitabilityReportMeta,
  jobMatchesProfitabilityScheduledDateRange,
  resolveProfitabilityReportDateBounds,
  type ProfitabilityReport,
  type ProfitabilityReportDateRange,
} from "@/shared/types/reports";
import {
  computeJobProfitability,
  jobMaterialCostExceedsCollectedRevenue,
} from "@/shared/types/job-profitability";
import type { Estimate } from "@/shared/types/estimate";
import type { Expense } from "@/shared/types/expense";
import type { Invoice } from "@/shared/types/invoice";
import type { JobMaterial } from "@/shared/types/job-material";
import type { Job } from "@/shared/types/job";
import type { TimeEntry } from "@/shared/types/time-entry";

type ProfitabilityReportOptions = {
  dateRange?: ProfitabilityReportDateRange;
  /** When set, skips reloading the shared job-level operational datasets. */
  datasets?: CompanyOperationalDatasets;
};

export type ProfitabilityReportWithOperationalCounts = {
  report: ProfitabilityReport;
  materialCostExceedsCollectedCount: number;
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
  const { report } = await getCompanyProfitabilityReportWithOperationalCounts(
    companyId,
    options,
  );
  return report;
}

export async function getCompanyProfitabilityReportWithOperationalCounts(
  companyId: string,
  options: ProfitabilityReportOptions = {},
): Promise<ProfitabilityReportWithOperationalCounts> {
  const dateRange = options.dateRange ?? "all";
  const dateBounds =
    dateRange === "all"
      ? null
      : resolveProfitabilityReportDateBounds(dateRange);

  const { jobs, invoices, estimates, expenses, laborEntries, materials } =
    options.datasets ?? (await loadCompanyOperationalDatasets(companyId));

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

  let materialCostExceedsCollectedCount = 0;

  const snapshots = scopedJobs.map((job) => {
    const snapshot = computeJobProfitability({
      invoices: (invoicesByJob.get(job.id) ?? []) as Invoice[],
      estimates: (estimatesByJob.get(job.id) ?? []) as Estimate[],
      expenses: (expensesByJob.get(job.id) ?? []) as Expense[],
      materials: (materialsByJob.get(job.id) ?? []) as JobMaterial[],
      laborEntries: (laborByJob.get(job.id) ?? []) as TimeEntry[],
    });

    if (
      job.status !== "cancelled" &&
      jobMaterialCostExceedsCollectedRevenue(snapshot)
    ) {
      materialCostExceedsCollectedCount += 1;
    }

    return {
      jobStatus: job.status,
      snapshot,
    };
  });

  const summary = aggregateJobProfitabilitySnapshots(snapshots);

  return {
    report: {
      summary,
      meta: buildProfitabilityReportMeta({
        dateRange,
        dateBounds,
        summary,
      }),
    },
    materialCostExceedsCollectedCount,
  };
}
