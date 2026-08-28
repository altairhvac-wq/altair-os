import { cache } from "react";
import { listDispatchAssignmentsForJob } from "@/lib/database/queries/dispatch";
import { listInvoicesForJob } from "@/lib/database/queries/invoices";
import { listTimeEntries } from "@/lib/database/queries/time-entries";
import {
  getCompanyInconsistencyScan,
  INTEGRITY_SCAN_PREVIEW_LIMIT,
} from "@/lib/database/queries/operational-inconsistency-counts";
import { createClient } from "@/lib/supabase/server";
import {
  buildOperationalInconsistenciesReport,
  detectOperationalInconsistencies,
  type OperationalInconsistenciesReport,
  type OperationalInconsistencyEntry,
} from "@/shared/types/operational-inconsistencies";
import type { Job } from "@/shared/types/job";

async function listActiveCompanyMemberUserIds(
  companyId: string,
): Promise<Set<string>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_memberships")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("status", "active")
    .not("user_id", "is", null);

  if (error) {
    console.error("[listActiveCompanyMemberUserIds] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return new Set();
  }

  return new Set(
    (data ?? [])
      .map((row) => row.user_id)
      .filter((userId): userId is string => typeof userId === "string"),
  );
}

/**
 * The company-wide data-integrity scan.
 *
 * ============================== WHAT THIS REPLACED ==============================
 * It loaded listJobs and listInvoices -- every job and every invoice with their
 * joins -- plus every dispatch assignment and every job-labor entry, and ran
 * nine structural rules over them in Node.
 *
 * PostgREST caps each of those reads at 1,000 rows. On the scale-seeded tenant
 * that meant scanning 1,000 of 12,000 jobs and reporting a clean bill of health
 * for the other 11,000 -- and because listJobs orders scheduled_at desc, the
 * rows it dropped were the OLDEST, which is where unresolved integrity problems
 * accumulate. An integrity scan that misses the old problems is missing the
 * only ones it exists to find.
 *
 * It was also the dashboard's largest single cost: about 6.5 s of a 9.1 s page,
 * awaited by both getDailyOperationsSummary and getCompanyOfficeReviewQueueReport.
 *
 * ============================== WHAT IT DOES NOW ==============================
 * Migration 172 counts the whole tenant and returns a bounded, severity-ordered
 * page of the offending JOBS. The counts on the summary are exact; `entries` is
 * a preview of at most INTEGRITY_SCAN_PREVIEW_LIMIT jobs' worth, and `hasMore`
 * says whether there are more. Nothing may treat `entries.length` as a total --
 * the summary carries jobCount, criticalJobCount and multiKindJobCount for
 * exactly that reason.
 *
 * The entries themselves are still produced by the shipped detector, run over
 * the previewed jobs. No rule, detail string, severity or guidance line is
 * duplicated.
 */
export const getCompanyOperationalInconsistenciesReport = cache(
  async function getCompanyOperationalInconsistenciesReport(
    companyId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<OperationalInconsistenciesReport> {
    const scan = await getCompanyInconsistencyScan(companyId, {
      limit: options?.limit ?? INTEGRITY_SCAN_PREVIEW_LIMIT,
      offset: options?.offset ?? 0,
    });

    if (!scan.ok || !scan.summary) {
      // A failed scan must not read as a clean company. Every count is zero,
      // and zero is what a healthy tenant looks like -- so `unavailable` is
      // what tells the difference, and the dashboard says "could not check"
      // rather than "clear".
      return buildOperationalInconsistenciesReport({
        totalCount: 0,
        criticalCount: 0,
        warningCount: 0,
        byKind: {},
        jobCount: 0,
        criticalJobCount: 0,
        multiKindJobCount: 0,
        entries: [],
        hasMore: true,
        unavailable: true,
      });
    }

    return buildOperationalInconsistenciesReport(scan.summary);
  },
);

/**
 * One job's inconsistencies, for the job detail page.
 *
 * Unchanged: every read here is already scoped to a single job, so none of them
 * can be truncated by the row ceiling.
 */
export async function getJobOperationalInconsistencies(
  companyId: string,
  job: Job,
): Promise<OperationalInconsistencyEntry[]> {
  const [assignments, laborEntries, invoices, activeMemberUserIds] =
    await Promise.all([
      listDispatchAssignmentsForJob(companyId, job.id),
      listTimeEntries(companyId, { jobId: job.id, entryType: "job_labor" }),
      listInvoicesForJob(companyId, job.id),
      listActiveCompanyMemberUserIds(companyId),
    ]);

  return detectOperationalInconsistencies({
    jobs: [job],
    assignments,
    laborEntries,
    invoices,
    activeMemberUserIds,
  }).entries;
}
