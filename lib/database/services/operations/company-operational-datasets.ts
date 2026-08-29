import {
  listEstimates,
  listEstimatesByJobIds,
} from "@/lib/database/queries/estimates";
import {
  listExpenses,
  listExpensesByJobIds,
} from "@/lib/database/queries/expenses";
import {
  listInvoices,
  listInvoicesByJobIds,
} from "@/lib/database/queries/invoices";
import {
  listAllJobMaterialsForCompany,
  listJobMaterialsForCompany,
} from "@/lib/database/queries/job-materials";
import { listJobs, listJobsByIds } from "@/lib/database/queries/jobs";
import {
  listCompanyJobLaborEntries,
  listJobLaborEntriesByJobIds,
} from "@/lib/database/queries/time-entries";
import type { Estimate } from "@/shared/types/estimate";
import type { Expense } from "@/shared/types/expense";
import type { Invoice } from "@/shared/types/invoice";
import type { Job } from "@/shared/types/job";
import type { JobMaterial } from "@/shared/types/job-material";
import type { TimeEntry } from "@/shared/types/time-entry";

/** Shared job-level inputs used by profitability and completed-work reports. */
export type CompanyOperationalDatasets = {
  jobs: Job[];
  invoices: Invoice[];
  estimates: Estimate[];
  expenses: Expense[];
  laborEntries: TimeEntry[];
  materials: JobMaterial[];
};

export async function loadCompanyOperationalDatasets(
  companyId: string,
): Promise<CompanyOperationalDatasets> {
  const [jobs, invoices, estimates, expenses, laborEntries, materials] =
    await Promise.all([
      listJobs(companyId),
      listInvoices(companyId),
      listEstimates(companyId),
      listExpenses(companyId),
      listCompanyJobLaborEntries(companyId),
      listJobMaterialsForCompany(companyId),
    ]);

  return {
    jobs,
    invoices,
    estimates,
    expenses,
    laborEntries,
    materials,
  };
}

/**
 * The same datasets, restricted to the jobs that can possibly qualify for a
 * material-cost warning.
 *
 * ===================== WHY THIS EXISTS =====================
 * loadCompanyOperationalDatasets loads six whole books. The dashboard reaches
 * it for exactly one number — materialCostExceedsCollectedCount — and that
 * number feeds a dashboard attention card whose SEVERITY it decides:
 * `materialCostExceedsCollectedCount > 0 ? "critical" : "warning"`, and whose
 * existence it can decide outright, since the card is hidden when both counts
 * are zero.
 *
 * So truncation there is not a slow page. Past a thousand jobs, invoices or
 * expenses the count comes back understated, and a critical profitability
 * warning can be shown as a warning or not shown at all.
 *
 * ===================== WHY NARROWING IS SAFE =====================
 * It does not restate the rule. jobMaterialCostExceedsCollectedRevenue reads
 * `materialCogs`, and computeJobProfitability sums materialCogs from
 * inputs.materials alone — so a job with no material rows has a materialCogs of
 * zero and the predicate is false before it looks at revenue. Jobs absent from
 * job_materials cannot qualify, whatever their invoices say.
 *
 * That is the same argument the previous code made in a comment while still
 * loading every job and filtering in Node. This applies it to the query.
 *
 * The one full-table read left is job_materials, and it is PAGED — seeding a
 * bounded read from a truncated list would narrow the job set to whatever fit
 * in one page and call the result complete, which is the original defect with
 * extra steps.
 */
export async function loadMaterialTrackedJobDatasets(
  companyId: string,
): Promise<CompanyOperationalDatasets> {
  const materials = await listAllJobMaterialsForCompany(companyId);

  const jobIds = [
    ...new Set(
      materials
        .map((material) => material.jobId)
        .filter((jobId): jobId is string => Boolean(jobId)),
    ),
  ];

  if (jobIds.length === 0) {
    return {
      jobs: [],
      invoices: [],
      estimates: [],
      expenses: [],
      laborEntries: [],
      materials: [],
    };
  }

  const [jobs, invoices, estimates, expenses, laborEntries] = await Promise.all([
    listJobsByIds(companyId, jobIds),
    listInvoicesByJobIds(companyId, jobIds),
    listEstimatesByJobIds(companyId, jobIds),
    listExpensesByJobIds(companyId, jobIds),
    listJobLaborEntriesByJobIds(companyId, jobIds),
  ]);

  return { jobs, invoices, estimates, expenses, laborEntries, materials };
}
