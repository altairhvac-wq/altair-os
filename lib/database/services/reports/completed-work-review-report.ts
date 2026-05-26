import { listEstimates } from "@/lib/database/queries/estimates";
import { listExpenses } from "@/lib/database/queries/expenses";
import { listInvoices } from "@/lib/database/queries/invoices";
import { listJobMaterialsForCompany } from "@/lib/database/queries/job-materials";
import { listJobs } from "@/lib/database/queries/jobs";
import { listTimeEntries } from "@/lib/database/queries/time-entries";
import {
  daysSinceCompletion,
  resolveCompletedAt,
} from "@/lib/database/services/reports/completed-work-report";
import {
  computeJobProfitability,
  type JobProfitabilityInputs,
} from "@/shared/types/job-profitability";
import type { Estimate } from "@/shared/types/estimate";
import type { Expense } from "@/shared/types/expense";
import {
  type Invoice,
  type InvoiceStatus,
} from "@/shared/types/invoice";
import type { Job } from "@/shared/types/job";
import type { JobMaterial } from "@/shared/types/job-material";
import type { TimeEntry } from "@/shared/types/time-entry";
import {
  buildReportSectionMeta,
  countJobProfitabilityWarningFlags,
  jobRequiresCompletedWorkReview,
  resolveCompletedWorkReviewReasons,
  resolveCompletedWorkReviewSeverity,
  type CompletedWorkInvoiceStatusSnapshot,
  type CompletedWorkReviewEntry,
  type CompletedWorkReviewReport,
} from "@/shared/types/reports";

const EXCLUDED_INVOICE_STATUSES: ReadonlySet<InvoiceStatus> = new Set([
  "void",
  "cancelled",
]);

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

function isActiveInvoice(invoice: Invoice): boolean {
  return !EXCLUDED_INVOICE_STATUSES.has(invoice.status);
}

function buildInvoiceStatusSnapshot(
  invoices: Invoice[],
): CompletedWorkInvoiceStatusSnapshot {
  const activeInvoices = invoices.filter(isActiveInvoice);

  if (activeInvoices.length === 0) {
    return {
      activeInvoiceCount: 0,
      statuses: [],
      latestStatus: null,
    };
  }

  const statuses = [
    ...new Set(activeInvoices.map((invoice) => invoice.status)),
  ];

  const newest = [...activeInvoices].sort(
    (left, right) =>
      Date.parse(right.createdAt) - Date.parse(left.createdAt),
  )[0];

  return {
    activeInvoiceCount: activeInvoices.length,
    statuses,
    latestStatus: newest?.status ?? null,
  };
}

function toCompletedWorkReviewEntry(
  job: Job,
  snapshot: ReturnType<typeof computeJobProfitability>,
  invoices: Invoice[],
  reference: Date,
): CompletedWorkReviewEntry {
  const completedAt = resolveCompletedAt(job);
  const reviewReasons = resolveCompletedWorkReviewReasons(snapshot);

  return {
    jobId: job.id,
    jobNumber: job.jobNumber,
    customerName: job.customerName,
    completedAt: job.completedAt ?? null,
    assignedTechnician: job.assignedTechnician,
    daysSinceCompletion: daysSinceCompletion(completedAt, reference),
    reviewReasons,
    severity: resolveCompletedWorkReviewSeverity(reviewReasons),
    invoiceStatus: buildInvoiceStatusSnapshot(invoices),
    profitabilityWarningCount: countJobProfitabilityWarningFlags(snapshot),
  };
}

function compareReviewEntries(
  left: CompletedWorkReviewEntry,
  right: CompletedWorkReviewEntry,
): number {
  const severityOrder = { critical: 0, warning: 1 };
  const severityDiff =
    severityOrder[left.severity] - severityOrder[right.severity];
  if (severityDiff !== 0) {
    return severityDiff;
  }

  return right.daysSinceCompletion - left.daysSinceCompletion;
}

export async function getCompanyCompletedWorkReviewReport(
  companyId: string,
): Promise<CompletedWorkReviewReport> {
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

  const jobsRequiringReview = jobs
    .map((job) => {
      const jobInvoices = (invoicesByJob.get(job.id) ?? []) as Invoice[];
      const inputs: JobProfitabilityInputs = {
        invoices: jobInvoices,
        estimates: (estimatesByJob.get(job.id) ?? []) as Estimate[],
        expenses: (expensesByJob.get(job.id) ?? []) as Expense[],
        materials: (materialsByJob.get(job.id) ?? []) as JobMaterial[],
        laborEntries: (laborByJob.get(job.id) ?? []) as TimeEntry[],
      };

      const snapshot = computeJobProfitability(inputs);

      if (!jobRequiresCompletedWorkReview(job, snapshot)) {
        return null;
      }

      return toCompletedWorkReviewEntry(
        job,
        snapshot,
        jobInvoices,
        reference,
      );
    })
    .filter((entry): entry is CompletedWorkReviewEntry => entry != null)
    .sort(compareReviewEntries);

  const limitations = [
    "Heuristic review queue only — not an office approval workflow.",
    "Flags completed jobs with missing invoices, open labor, pending expenses, or profitability data gaps.",
    "Does not validate accounting readiness, payroll accuracy, or invoice correctness.",
    "No workflow locking, automated reminders, or notifications yet.",
    "Jobs without a completion timestamp use created date for days-since-completion.",
    "Read-only visibility — company-scoped from existing job, invoice, expense, and time records.",
  ];

  // TODO(office-review-workflow-v2): Formal office review queues with assignee and due dates.
  // TODO(office-review-workflow-v2): Approval states separating operational complete from admin-ready.
  // TODO(office-review-workflow-v2): Automated reminders for long-unreviewed completed jobs.
  // TODO(office-review-workflow-v2): AI-generated review summaries with human sign-off.

  return {
    summary: {
      count: jobsRequiringReview.length,
      jobs: jobsRequiringReview,
    },
    meta: buildReportSectionMeta({
      dateRange: "all",
      dateBounds: null,
      limitations,
    }),
  };
}

/** Exported for tests and shared detection rules. */
export {
  buildInvoiceStatusSnapshot,
  jobRequiresCompletedWorkReview,
  toCompletedWorkReviewEntry,
};
