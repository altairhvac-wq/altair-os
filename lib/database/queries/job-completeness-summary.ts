import "server-only";

import { createClient } from "@/lib/supabase/server";
import { STALLED_JOB_INACTIVITY_DAYS } from "@/lib/database/services/reports/stalled-jobs-report";

/**
 * The dashboard's operations panel, counted in SQL (migration 168).
 *
 * ============================== THE SPLIT THAT MADE THIS SAFE ==============================
 * computeJobProfitability produces two kinds of output. The MONEY half —
 * revenue, COGS, margins — must never acquire a second definition, and has not.
 * The COMPLETENESS half is seven counts of rows matching a status test, with no
 * arithmetic on money anywhere in it.
 *
 * The dashboard's operations panel reads only the completeness half:
 * jobsWithWarnings, the completed-work review reasons and their severities, and
 * completed-work-awaiting-invoicing. Not one of those numbers touches a currency
 * field. So the expensive part — loading every job, invoice, estimate, expense,
 * labour entry and material to build twelve thousand snapshots — existed to
 * compute facts the database can count directly.
 *
 * ============================== THE DUPLICATION, AND WHAT KEEPS IT HONEST ==============================
 * Migration 168's aggregate does encode jobProfitabilityHasWarnings and the
 * review rules a second time, because a per-job round trip for twelve thousand
 * jobs is the problem rather than the solution.
 *
 * scripts/verify-job-completeness-live.mjs is what makes that defensible: it
 * pulls the seven raw counters per job, runs the SHIPPED TypeScript rules over
 * them, and asserts the SQL aggregate matches — for every job in the tenant.
 * It also checks it actually read every job, because its first version stopped
 * at PostgREST's 1,000-row ceiling and reported a confident mismatch of 6,301
 * against 517.
 */

export type JobCompletenessJob = {
  job_id: string;
  job_number: string | null;
  customer_name: string | null;
  completed_at: string | null;
  assigned_technician: string | null;
  days_since_completion?: number;
  reason_no_active_invoice?: boolean;
  reason_open_labor?: boolean;
  reason_pending_expenses?: boolean;
  reason_data_incomplete?: boolean;
  is_critical?: boolean;
};

export type JobCompletenessStalledJob = {
  job_id: string;
  job_number: string | null;
  customer_name: string | null;
  status: string;
  assigned_technician: string | null;
  last_activity_at: string;
  days_since_activity: number;
};

export type JobCompletenessSummary = {
  jobsWithWarnings: number;
  completedAwaitingInvoicingCount: number;
  completedAwaitingInvoicingJobs: JobCompletenessJob[];
  completedWorkReviewCount: number;
  criticalCompletedWorkReviewCount: number;
  completedWorkReviewJobs: JobCompletenessJob[];
  stalledCount: number;
  stalledJobs: JobCompletenessStalledJob[];
  /** False when the RPC failed and every figure above is a zero fallback. */
  ok: boolean;
};

export const EMPTY_JOB_COMPLETENESS_SUMMARY: JobCompletenessSummary = {
  jobsWithWarnings: 0,
  completedAwaitingInvoicingCount: 0,
  completedAwaitingInvoicingJobs: [],
  completedWorkReviewCount: 0,
  criticalCompletedWorkReviewCount: 0,
  completedWorkReviewJobs: [],
  stalledCount: 0,
  stalledJobs: [],
  ok: false,
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function list<T>(raw: unknown): T[] {
  return Array.isArray(raw) ? (raw as T[]) : [];
}

export async function getCompanyJobCompletenessSummary(
  companyId: string,
  options: { reference?: Date; limit: number },
): Promise<JobCompletenessSummary> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_company_job_completeness_summary",
    {
      p_company_id: companyId,
      p_reference: (options.reference ?? new Date()).toISOString(),
      // The threshold stays defined in TypeScript and is passed in, so the
      // dashboard and the report cannot disagree about what "stalled" means.
      p_stalled_days: STALLED_JOB_INACTIVITY_DAYS,
      p_limit: options.limit,
    },
  );

  if (error) {
    console.error("[getCompanyJobCompletenessSummary] rpc failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return EMPTY_JOB_COMPLETENESS_SUMMARY;
  }

  const payload = (data ?? {}) as Record<string, unknown>;

  return {
    jobsWithWarnings: toNumber(payload.jobsWithWarnings),
    completedAwaitingInvoicingCount: toNumber(
      payload.completedAwaitingInvoicingCount,
    ),
    completedAwaitingInvoicingJobs: list<JobCompletenessJob>(
      payload.completedAwaitingInvoicingJobs,
    ),
    completedWorkReviewCount: toNumber(payload.completedWorkReviewCount),
    criticalCompletedWorkReviewCount: toNumber(
      payload.criticalCompletedWorkReviewCount,
    ),
    completedWorkReviewJobs: list<JobCompletenessJob>(
      payload.completedWorkReviewJobs,
    ),
    stalledCount: toNumber(payload.stalledCount),
    stalledJobs: list<JobCompletenessStalledJob>(payload.stalledJobs),
    ok: true,
  };
}
