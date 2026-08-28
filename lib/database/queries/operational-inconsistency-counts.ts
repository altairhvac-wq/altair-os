import { createClient } from "@/lib/supabase/server";
import { captureMonitoredEvent } from "@/lib/operations/monitoring";
import type { Invoice, InvoiceStatus } from "@/shared/types/invoice";
import type { Job, JobStatus } from "@/shared/types/job";
import type { TimeEntry } from "@/shared/types/time-entry";
import {
  detectOperationalInconsistencies,
  type DispatchAssignmentSnapshot,
  type OperationalInconsistenciesSummary,
  type OperationalInconsistencyKind,
} from "@/shared/types/operational-inconsistencies";

/**
 * The data-integrity scan, from migration 172.
 *
 * ============================== THE SHAPE OF THIS ==============================
 * The database returns whole-tenant COUNTS plus a bounded page of the offending
 * jobs, each carrying the facts the rules need. Nothing here re-derives a rule:
 * the previewed jobs are turned back into the minimal inputs
 * detectOperationalInconsistencies already takes, and the SHIPPED detector runs
 * over them. Every detail string, severity, recovery-guidance line and the sort
 * come from that one implementation.
 *
 * Only the counting is duplicated, in SQL, and verify-integrity-scan-live holds
 * it to a full-data run of the same detector.
 */

export const INTEGRITY_SCAN_PREVIEW_LIMIT = 25;

type InconsistencyAggregateJob = {
  jobId: string;
  jobNumber: string | null;
  customerName: string | null;
  jobStatus: string;
  completedAt: string | null;
  assignedTechnicianId: string | null;
  assignedIsActiveMember: boolean;
  activeAssignmentId: string | null;
  activeAssignmentTechnicianId: string | null;
  openLaborCount: number;
  badInvoices: {
    id: string;
    invoiceNumber: string | null;
    status: string;
    total: number;
    amountPaid: number;
    balanceDue: number;
  }[];
};

type InconsistencyAggregate = {
  authorized: boolean;
  counts: {
    total: number;
    critical: number;
    warning: number;
    byKind: Partial<Record<OperationalInconsistencyKind, number>>;
    jobCount: number;
    criticalJobCount: number;
    multiKindJobCount: number;
  };
  jobs: InconsistencyAggregateJob[];
  hasMore: boolean;
};

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * The minimal inputs the detector reads, and nothing else.
 *
 * Fields it never touches are left off rather than filled with plausible
 * defaults — a cast is honest about "this is not a whole Job", where a
 * fabricated address or customer id would quietly become an input if a rule
 * ever started reading one.
 */
function toDetectorInput(jobs: InconsistencyAggregateJob[]) {
  const detectorJobs: Job[] = [];
  const assignments: DispatchAssignmentSnapshot[] = [];
  const laborEntries: TimeEntry[] = [];
  const invoices: Invoice[] = [];
  const activeMemberUserIds = new Set<string>();

  for (const row of jobs) {
    detectorJobs.push({
      id: row.jobId,
      jobNumber: row.jobNumber ?? "",
      customerName: row.customerName ?? "Unknown customer",
      status: row.jobStatus as JobStatus,
      completedAt: row.completedAt ?? undefined,
      assignedTechnicianId: row.assignedTechnicianId ?? undefined,
    } as unknown as Job);

    // The unique index dispatch_assignments_one_active_per_job_idx allows at
    // most one active assignment per job, so a single row reproduces the list
    // the detector would have received — including activeAssignments[0].
    if (row.activeAssignmentId && row.activeAssignmentTechnicianId) {
      assignments.push({
        id: row.activeAssignmentId,
        jobId: row.jobId,
        technicianId: row.activeAssignmentTechnicianId,
        status: "active",
      });
    }

    // indexOpenLaborByJobId counts entries with endedAt == null and a jobId,
    // and reads nothing else, so the count is the whole input.
    for (let index = 0; index < num(row.openLaborCount); index += 1) {
      laborEntries.push({
        id: `${row.jobId}-open-${index}`,
        jobId: row.jobId,
        endedAt: undefined,
      } as unknown as TimeEntry);
    }

    for (const invoice of row.badInvoices ?? []) {
      invoices.push({
        id: invoice.id,
        jobId: row.jobId,
        invoiceNumber: invoice.invoiceNumber ?? "",
        status: invoice.status as InvoiceStatus,
        total: num(invoice.total),
        amountPaid: num(invoice.amountPaid),
        balanceDue: num(invoice.balanceDue),
      } as unknown as Invoice);
    }

    // The detector only ever asks whether the job's own assigned technician is
    // an active member, so the set needs exactly that one answer per job.
    if (row.assignedTechnicianId && row.assignedIsActiveMember) {
      activeMemberUserIds.add(row.assignedTechnicianId);
    }
  }

  return {
    jobs: detectorJobs,
    assignments,
    laborEntries,
    invoices,
    activeMemberUserIds,
  };
}

export type InconsistencyScanResult = {
  summary: OperationalInconsistenciesSummary | null;
  ok: boolean;
  errorCode?: string;
};

export async function getCompanyInconsistencyScan(
  companyId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<InconsistencyScanResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_company_operational_inconsistencies",
    {
      p_company_id: companyId,
      p_limit: options.limit ?? INTEGRITY_SCAN_PREVIEW_LIMIT,
      p_offset: options.offset ?? 0,
    },
  );

  if (error) {
    console.error("[getCompanyInconsistencyScan] rpc failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    captureMonitoredEvent({
      event: "integrity_scan.rpc_failed",
      companyId,
      meta: {
        code: error.code,
        // A missing grant or a missing function means the code shipped ahead
        // of the migration, not that anything is wrong with the data.
        likelyDeploymentFault:
          error.code === "42501" || error.code === "PGRST202",
      },
    });
    return { summary: null, ok: false, errorCode: error.code };
  }

  const aggregate = data as unknown as InconsistencyAggregate | null;

  if (!aggregate?.authorized) {
    return { summary: null, ok: false, errorCode: "unauthorized" };
  }

  const detected = detectOperationalInconsistencies(
    toDetectorInput(aggregate.jobs ?? []),
  );

  return {
    ok: true,
    summary: {
      // Counts come from the database and describe the whole tenant. The
      // detector above only saw the previewed page, so its own totals would be
      // the size of the preview — which is exactly the mistake this replaces.
      totalCount: num(aggregate.counts.total),
      criticalCount: num(aggregate.counts.critical),
      warningCount: num(aggregate.counts.warning),
      byKind: aggregate.counts.byKind ?? {},
      jobCount: num(aggregate.counts.jobCount),
      criticalJobCount: num(aggregate.counts.criticalJobCount),
      multiKindJobCount: num(aggregate.counts.multiKindJobCount),
      entries: detected.entries,
      hasMore: aggregate.hasMore === true,
    },
  };
}
