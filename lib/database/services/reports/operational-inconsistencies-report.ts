import { cache } from "react";
import {
  listDispatchAssignmentsForCompany,
  listDispatchAssignmentsForJob,
} from "@/lib/database/queries/dispatch";
import { listInvoices, listInvoicesForJob } from "@/lib/database/queries/invoices";
import { listJobs } from "@/lib/database/queries/jobs";
import {
  listCompanyJobLaborEntries,
  listTimeEntries,
} from "@/lib/database/queries/time-entries";
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
 * ============================== THIS IS THE DASHBOARD'S REMAINING COST ==============================
 * Measured by instrumenting the dashboard's own fan-out on the scale-seeded
 * scratch tenant (12,000 jobs / 10,000 invoices / 7,857 payments / 5,687 labour
 * entries), with ALTAIR_DASHBOARD_AGGREGATES=on -- so the aggregate path, not
 * the legacy arrays. Three consecutive renders, times in ms:
 *
 *   officeReview   7018  6878  6901     <- awaits this report
 *   opsSummary     6595  6486  6505     <- awaits this report
 *   leads          1786  1681  1479
 *   customers      1711  1571  1608
 *   ...every other loader below 1200
 *
 * The two leaders are the same work. getDailyOperationsSummary and
 * getCompanyOfficeReviewQueueReport both await this function; React cache()
 * collapses it to one call, and that one call is ~6.5 s of a 9.1 s page. It is
 * what is left after migrations 166, 167 and 168 removed the rest.
 *
 * ============================== AND IT IS ALSO WRONG ==============================
 * listJobs and listInvoices are capped at 1,000 rows by PostgREST. This is an
 * INTEGRITY SCAN, so a scan that reads 8% of the jobs and reports no problems in
 * the other 92% is worse than no scan. On the seeded tenant the full data holds
 * 4,451 inconsistencies and this reports roughly 371 of them -- and because
 * listJobs orders scheduled_at desc, the ones it drops are the oldest, which is
 * where unresolved integrity problems accumulate.
 *
 * ============================== WHY IT WAS NOT FIXED HERE ==============================
 * The obvious move -- narrow to candidate jobs in SQL and run the unchanged
 * detector over them -- fixes the reads but not the shape: the entry list has no
 * cap at all, so on the seeded tenant a correct version would ship 4,451 entries
 * into the RSC payload and into the office review queue. Making it correct makes
 * the payload worse.
 *
 * So it needs the same treatment as migrations 167 and 169: exact counts for the
 * whole tenant plus a bounded, severity-ordered slice of entries. That in turn
 * means buildOfficeReviewQueueReport must take its summary counts from those
 * counts rather than from `items.length`, which is the part that makes this a
 * piece of work rather than a patch. Its counts are already wrong today for the
 * same truncation reason, so that is a fix and not a regression -- but it is a
 * user-visible change to a queue and deserves its own differential rather than
 * being tacked onto something else.
 *
 * detectOperationalInconsistencies itself should not move to SQL. Every rule is
 * a structural predicate over one job and its assignments, labour and invoices,
 * and the detail strings embed counts -- so SQL should return the offending
 * jobs and their counts, and buildEntry should keep producing the messages.
 */
export const getCompanyOperationalInconsistenciesReport = cache(
  async function getCompanyOperationalInconsistenciesReport(
    companyId: string,
  ): Promise<OperationalInconsistenciesReport> {
  const [jobs, assignments, laborEntries, invoices, activeMemberUserIds] =
    await Promise.all([
      listJobs(companyId),
      listDispatchAssignmentsForCompany(companyId),
      listCompanyJobLaborEntries(companyId),
      listInvoices(companyId),
      listActiveCompanyMemberUserIds(companyId),
    ]);

  const summary = detectOperationalInconsistencies({
    jobs,
    assignments,
    laborEntries,
    invoices,
    activeMemberUserIds,
  });

  return buildOperationalInconsistenciesReport(summary);
  },
);

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
