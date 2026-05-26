import { listEstimates } from "@/lib/database/queries/estimates";
import { listExpenses } from "@/lib/database/queries/expenses";
import { listInvoices } from "@/lib/database/queries/invoices";
import { listJobMaterialsForCompany } from "@/lib/database/queries/job-materials";
import { listJobs } from "@/lib/database/queries/jobs";
import { listTimeEntries } from "@/lib/database/queries/time-entries";
import {
  computeJobProfitability,
  type JobProfitabilityInputs,
} from "@/shared/types/job-profitability";
import type { Estimate } from "@/shared/types/estimate";
import type { Expense } from "@/shared/types/expense";
import type { Invoice } from "@/shared/types/invoice";
import type { Job, JobStatus } from "@/shared/types/job";
import type { JobMaterial } from "@/shared/types/job-material";
import type { TimeEntry } from "@/shared/types/time-entry";
import {
  buildReportSectionMeta,
  type CompletedWorkAwaitingInvoicingEntry,
  type CompletedWorkAwaitingInvoicingReport,
} from "@/shared/types/reports";

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

function daysSinceCompletion(
  completedAt: string,
  reference = new Date(),
): number {
  const elapsedMs = reference.getTime() - new Date(completedAt).getTime();
  return Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));
}

function resolveCompletedAt(job: Job): string {
  return job.completedAt ?? job.createdAt;
}

function toCompletedWorkEntry(
  job: Job,
  snapshot: ReturnType<typeof computeJobProfitability>,
  reference: Date,
): CompletedWorkAwaitingInvoicingEntry {
  const completedAt = resolveCompletedAt(job);

  return {
    jobId: job.id,
    jobNumber: job.jobNumber,
    customerName: job.customerName,
    completedAt: job.completedAt ?? null,
    assignedTechnician: job.assignedTechnician,
    approvedEstimateAmount: snapshot.projectedRevenue?.total ?? null,
    collectedRevenue: snapshot.revenue.collected,
    daysSinceCompletion: daysSinceCompletion(completedAt, reference),
  };
}

function isCompletedAwaitingInvoicing(
  job: Job,
  snapshot: ReturnType<typeof computeJobProfitability>,
): boolean {
  return (
    job.status === ("completed" satisfies JobStatus) &&
    snapshot.completeness.noActiveInvoices
  );
}

export async function getCompanyCompletedWorkReport(
  companyId: string,
): Promise<CompletedWorkAwaitingInvoicingReport> {
  const reference = new Date();

  const [jobs, invoices, estimates, expenses, laborEntries, materials] =
    await Promise.all([
      listJobs(companyId),
      listInvoices(companyId),
      listEstimates(companyId),
      listExpenses(companyId),
      listTimeEntries(companyId, { entryType: "job_labor" }),
      listJobMaterialsForCompany(companyId),
    ]);

  const jobIds = new Set(jobs.map((job) => job.id));
  const invoicesByJob = groupByJobId(invoices, jobIds);
  const estimatesByJob = groupByJobId(estimates, jobIds);
  const expensesByJob = groupByJobId(expenses, jobIds);
  const laborByJob = groupByJobId(laborEntries, jobIds);
  const materialsByJob = groupByJobId(materials, jobIds);

  const awaitingInvoicingJobs = jobs
    .map((job) => {
      const inputs: JobProfitabilityInputs = {
        invoices: (invoicesByJob.get(job.id) ?? []) as Invoice[],
        estimates: (estimatesByJob.get(job.id) ?? []) as Estimate[],
        expenses: (expensesByJob.get(job.id) ?? []) as Expense[],
        materials: (materialsByJob.get(job.id) ?? []) as JobMaterial[],
        laborEntries: (laborByJob.get(job.id) ?? []) as TimeEntry[],
      };

      const snapshot = computeJobProfitability(inputs);

      if (!isCompletedAwaitingInvoicing(job, snapshot)) {
        return null;
      }

      return toCompletedWorkEntry(job, snapshot, reference);
    })
    .filter((entry): entry is CompletedWorkAwaitingInvoicingEntry => entry != null)
    .sort((left, right) => right.daysSinceCompletion - left.daysSinceCompletion);

  const limitations = [
    "Detects completed jobs with no active (non-void, non-cancelled) invoices only.",
    "Does not generate invoices or verify accounting readiness.",
    "No scheduled reminders or automated notifications yet.",
    "Approved estimate amount reflects the newest approved estimate when available.",
    "Jobs without a completion timestamp use created date for days-since-completion.",
    "Read-only visibility — company-scoped from existing job and invoice records.",
  ];

  // TODO(billing-workflow-v2): Invoice creation shortcuts from this report.
  // TODO(billing-workflow-v2): Scheduled owner reminders for long-uninvoiced jobs.

  return {
    summary: {
      count: awaitingInvoicingJobs.length,
      jobs: awaitingInvoicingJobs,
    },
    meta: buildReportSectionMeta({
      dateRange: "all",
      dateBounds: null,
      limitations,
    }),
  };
}

/** Exported for tests and shared detection rules. */
export { isCompletedAwaitingInvoicing, daysSinceCompletion, resolveCompletedAt };
