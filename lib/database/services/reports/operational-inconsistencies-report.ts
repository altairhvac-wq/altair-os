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
