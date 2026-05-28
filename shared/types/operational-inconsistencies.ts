import {
  isActiveInvoice,
  isInvoiceBalanceConsistent,
  type Invoice,
  type InvoiceStatus,
} from "@/shared/types/invoice";
import type { Job, JobStatus } from "@/shared/types/job";
import type { TimeEntry } from "@/shared/types/time-entry";
import { buildReportSectionMeta, type ReportSectionMeta } from "@/shared/types/reports";

/**
 * Deterministic read-only operational data-integrity signals.
 * Complements profitability completeness flags — does not replace them.
 */

export type OperationalInconsistencyKind =
  | "completed_missing_completed_at"
  | "completed_at_status_mismatch"
  | "stale_active_dispatch_on_terminal_job"
  | "job_assigned_without_active_dispatch"
  | "active_dispatch_without_job_assignment"
  | "dispatch_technician_mismatch"
  | "open_labor_on_cancelled_job"
  | "invoice_balance_mismatch"
  | "invalid_assigned_technician";

export type OperationalInconsistencySeverity = "warning" | "critical";

export type OperationalInconsistencyEntry = {
  kind: OperationalInconsistencyKind;
  severity: OperationalInconsistencySeverity;
  jobId: string;
  jobNumber: string;
  customerName: string;
  jobStatus: JobStatus;
  detail: string;
  recoveryGuidance: string;
  /** Related invoice when kind is invoice_balance_mismatch. */
  invoiceId?: string;
  invoiceNumber?: string;
};

export type OperationalInconsistenciesSummary = {
  totalCount: number;
  criticalCount: number;
  warningCount: number;
  byKind: Partial<Record<OperationalInconsistencyKind, number>>;
  entries: OperationalInconsistencyEntry[];
};

export type OperationalInconsistenciesReport = {
  summary: OperationalInconsistenciesSummary;
  meta: ReportSectionMeta;
};

export type DispatchAssignmentSnapshot = {
  id: string;
  jobId: string;
  technicianId: string;
  status: "active" | "completed" | "cancelled" | "unassigned";
};

export type OperationalInconsistencyDetectionInput = {
  jobs: Job[];
  assignments: DispatchAssignmentSnapshot[];
  laborEntries: TimeEntry[];
  invoices: Invoice[];
  activeMemberUserIds: Set<string>;
};

const TERMINAL_JOB_STATUSES: ReadonlySet<JobStatus> = new Set([
  "completed",
  "cancelled",
]);

const BALANCE_CHECK_INVOICE_STATUSES: ReadonlySet<InvoiceStatus> = new Set([
  "sent",
  "partially_paid",
  "paid",
  "overdue",
]);

const KIND_LABELS: Record<OperationalInconsistencyKind, string> = {
  completed_missing_completed_at: "Missing completion timestamp",
  completed_at_status_mismatch: "Completion timestamp on non-completed job",
  stale_active_dispatch_on_terminal_job: "Active dispatch on closed job",
  job_assigned_without_active_dispatch: "Technician assigned without dispatch row",
  active_dispatch_without_job_assignment: "Active dispatch without job assignment",
  dispatch_technician_mismatch: "Dispatch technician mismatch",
  open_labor_on_cancelled_job: "Open labor on cancelled job",
  invoice_balance_mismatch: "Invoice balance mismatch",
  invalid_assigned_technician: "Invalid assigned technician",
};

const RECOVERY_GUIDANCE: Record<OperationalInconsistencyKind, string> = {
  completed_missing_completed_at:
    "Open the job and confirm completion. Re-saving workflow status should backfill completed_at; if the job was completed before that field existed, note the actual completion date for records.",
  completed_at_status_mismatch:
    "Open the job and align status with completion data — either complete the job properly or clear the stale completion timestamp via reopen/cancel workflow.",
  stale_active_dispatch_on_terminal_job:
    "Open dispatch or the job record. Completing or cancelling a job should finalize active assignments — if this persists, unassign/reassign or re-run job completion to sync dispatch rows.",
  job_assigned_without_active_dispatch:
    "Open dispatch and assign the technician again, or clear the job assignment if the job should be unassigned.",
  active_dispatch_without_job_assignment:
    "Open the job and assign the technician to match the active dispatch row, or unassign from dispatch to clear the orphan assignment.",
  dispatch_technician_mismatch:
    "Open dispatch and reassign so the job technician matches the active dispatch assignment.",
  open_labor_on_cancelled_job:
    "Open time tracking for this job and close any open labor clocks left after cancellation.",
  invoice_balance_mismatch:
    "Open the invoice and verify payments and line totals. Recording or adjusting payments is blocked until amount paid + balance due equals the invoice total.",
  invalid_assigned_technician:
    "Open dispatch and assign an active company technician, or clear the assignment if the prior technician was removed from the company.",
};

const CRITICAL_KINDS: ReadonlySet<OperationalInconsistencyKind> = new Set([
  "stale_active_dispatch_on_terminal_job",
  "invoice_balance_mismatch",
  "dispatch_technician_mismatch",
]);

export function formatOperationalInconsistencyKind(
  kind: OperationalInconsistencyKind,
): string {
  return KIND_LABELS[kind];
}

export function getOperationalInconsistencyRecoveryGuidance(
  kind: OperationalInconsistencyKind,
): string {
  return RECOVERY_GUIDANCE[kind];
}

export function resolveOperationalInconsistencySeverity(
  kind: OperationalInconsistencyKind,
): OperationalInconsistencySeverity {
  return CRITICAL_KINDS.has(kind) ? "critical" : "warning";
}

function pushEntry(
  entries: OperationalInconsistencyEntry[],
  entry: OperationalInconsistencyEntry,
): void {
  entries.push(entry);
}

function buildEntry(
  job: Job,
  kind: OperationalInconsistencyKind,
  detail: string,
  extra?: Pick<OperationalInconsistencyEntry, "invoiceId" | "invoiceNumber">,
): OperationalInconsistencyEntry {
  return {
    kind,
    severity: resolveOperationalInconsistencySeverity(kind),
    jobId: job.id,
    jobNumber: job.jobNumber,
    customerName: job.customerName,
    jobStatus: job.status,
    detail,
    recoveryGuidance: RECOVERY_GUIDANCE[kind],
    ...extra,
  };
}

function indexActiveAssignmentsByJobId(
  assignments: DispatchAssignmentSnapshot[],
): Map<string, DispatchAssignmentSnapshot[]> {
  const map = new Map<string, DispatchAssignmentSnapshot[]>();

  for (const assignment of assignments) {
    if (assignment.status !== "active") {
      continue;
    }

    const existing = map.get(assignment.jobId);
    if (existing) {
      existing.push(assignment);
    } else {
      map.set(assignment.jobId, [assignment]);
    }
  }

  return map;
}

function indexOpenLaborByJobId(
  laborEntries: TimeEntry[],
): Map<string, number> {
  const map = new Map<string, number>();

  for (const entry of laborEntries) {
    if (entry.endedAt != null) {
      continue;
    }

    if (!entry.jobId) {
      continue;
    }

    map.set(entry.jobId, (map.get(entry.jobId) ?? 0) + 1);
  }

  return map;
}

/**
 * Pure detector — company-scoped inputs only, no side effects.
 */
export function detectOperationalInconsistencies(
  input: OperationalInconsistencyDetectionInput,
): OperationalInconsistenciesSummary {
  const entries: OperationalInconsistencyEntry[] = [];
  const jobIds = new Set(input.jobs.map((job) => job.id));
  const activeByJob = indexActiveAssignmentsByJobId(input.assignments);
  const openLaborByJob = indexOpenLaborByJobId(input.laborEntries);

  for (const job of input.jobs) {
    const activeAssignments = activeByJob.get(job.id) ?? [];

    if (job.status === "completed" && !job.completedAt) {
      pushEntry(
        entries,
        buildEntry(
          job,
          "completed_missing_completed_at",
          "Job is completed but completed_at is not recorded",
        ),
      );
    }

    if (
      job.completedAt &&
      job.status !== "completed" &&
      job.status !== "cancelled"
    ) {
      pushEntry(
        entries,
        buildEntry(
          job,
          "completed_at_status_mismatch",
          `Job status is ${job.status.replaceAll("_", " ")} but completed_at is set`,
        ),
      );
    }

    if (TERMINAL_JOB_STATUSES.has(job.status) && activeAssignments.length > 0) {
      pushEntry(
        entries,
        buildEntry(
          job,
          "stale_active_dispatch_on_terminal_job",
          `${activeAssignments.length} active dispatch assignment${activeAssignments.length === 1 ? "" : "s"} on ${job.status} job`,
        ),
      );
    }

    if (
      !TERMINAL_JOB_STATUSES.has(job.status) &&
      job.assignedTechnicianId &&
      activeAssignments.length === 0
    ) {
      pushEntry(
        entries,
        buildEntry(
          job,
          "job_assigned_without_active_dispatch",
          "Job has an assigned technician but no active dispatch assignment",
        ),
      );
    }

    if (
      !TERMINAL_JOB_STATUSES.has(job.status) &&
      !job.assignedTechnicianId &&
      activeAssignments.length > 0
    ) {
      pushEntry(
        entries,
        buildEntry(
          job,
          "active_dispatch_without_job_assignment",
          "Active dispatch assignment exists but the job has no assigned technician",
        ),
      );
    }

    const primaryActive = activeAssignments[0];
    if (
      primaryActive &&
      job.assignedTechnicianId &&
      primaryActive.technicianId !== job.assignedTechnicianId
    ) {
      pushEntry(
        entries,
        buildEntry(
          job,
          "dispatch_technician_mismatch",
          "Assigned technician on the job does not match the active dispatch assignment",
        ),
      );
    }

    if (activeAssignments.length > 1) {
      pushEntry(
        entries,
        buildEntry(
          job,
          "stale_active_dispatch_on_terminal_job",
          `${activeAssignments.length} concurrent active dispatch assignments (expected at most one)`,
        ),
      );
    }

    if (
      job.status === "cancelled" &&
      (openLaborByJob.get(job.id) ?? 0) > 0
    ) {
      const count = openLaborByJob.get(job.id) ?? 0;
      pushEntry(
        entries,
        buildEntry(
          job,
          "open_labor_on_cancelled_job",
          `${count} open labor entr${count === 1 ? "y" : "ies"} on cancelled job`,
        ),
      );
    }

    if (
      job.assignedTechnicianId &&
      !input.activeMemberUserIds.has(job.assignedTechnicianId)
    ) {
      pushEntry(
        entries,
        buildEntry(
          job,
          "invalid_assigned_technician",
          "Assigned technician is not an active company member",
        ),
      );
    }
  }

  for (const invoice of input.invoices) {
    if (!invoice.jobId || !jobIds.has(invoice.jobId)) {
      continue;
    }

    if (!isActiveInvoice(invoice)) {
      continue;
    }

    if (!BALANCE_CHECK_INVOICE_STATUSES.has(invoice.status)) {
      continue;
    }

    if (isInvoiceBalanceConsistent(invoice)) {
      continue;
    }

    const job = input.jobs.find((row) => row.id === invoice.jobId);
    if (!job) {
      continue;
    }

    pushEntry(
      entries,
      buildEntry(
        job,
        "invoice_balance_mismatch",
        `Invoice ${invoice.invoiceNumber}: amount paid + balance due does not equal total`,
        { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
      ),
    );
  }

  const byKind: Partial<Record<OperationalInconsistencyKind, number>> = {};
  let criticalCount = 0;
  let warningCount = 0;

  for (const entry of entries) {
    byKind[entry.kind] = (byKind[entry.kind] ?? 0) + 1;
    if (entry.severity === "critical") {
      criticalCount += 1;
    } else {
      warningCount += 1;
    }
  }

  entries.sort((left, right) => {
    if (left.severity !== right.severity) {
      return left.severity === "critical" ? -1 : 1;
    }

    return left.jobNumber.localeCompare(right.jobNumber, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  return {
    totalCount: entries.length,
    criticalCount,
    warningCount,
    byKind,
    entries,
  };
}

export function detectOperationalInconsistenciesForJob(
  job: Job,
  input: Omit<OperationalInconsistencyDetectionInput, "jobs">,
): OperationalInconsistencyEntry[] {
  return detectOperationalInconsistencies({
    jobs: [job],
    ...input,
  }).entries;
}

const REPORT_LIMITATIONS: readonly string[] = [
  "Read-only integrity scan — no automatic repairs or writes.",
  "Company-scoped from existing jobs, dispatch assignments, labor, and invoice records.",
  "Open labor on completed jobs is surfaced via completed-work review — only cancelled-job open labor is flagged here.",
  "Invoice balance checks apply to sent, partially paid, paid, and overdue invoices only (not draft).",
  "Technician validity uses active company memberships — suspended or removed members trigger invalid assignment.",
];

export function buildOperationalInconsistenciesReport(
  summary: OperationalInconsistenciesSummary,
): OperationalInconsistenciesReport {
  return {
    summary,
    meta: buildReportSectionMeta({
      dateRange: "all",
      dateBounds: null,
      limitations: [...REPORT_LIMITATIONS],
    }),
  };
}

export function formatOperationalInconsistencyKinds(
  kinds: OperationalInconsistencyKind[],
): string {
  return kinds.map(formatOperationalInconsistencyKind).join(" · ");
}
