import { listEstimatesForJob } from "@/lib/database/queries/estimates";
import { listExpensesForJob } from "@/lib/database/queries/expenses";
import { listInvoicesForJob } from "@/lib/database/queries/invoices";
import { listJobMaterialsForJob } from "@/lib/database/queries/job-materials";
import { listJobLaborEntriesForJob } from "@/lib/database/queries/time-entries";
import {
  computeJobProfitability,
  type JobProfitabilityInputs,
  type JobProfitabilitySnapshot,
} from "@/shared/types/job-profitability";

type JobProfitabilityPreloaded = Pick<
  JobProfitabilityInputs,
  "expenses" | "materials"
>;

export async function getJobProfitabilitySnapshot(
  companyId: string,
  jobId: string,
  preloaded?: JobProfitabilityPreloaded,
): Promise<JobProfitabilitySnapshot> {
  const [invoices, estimates, laborEntries, expenses, materials] =
    await Promise.all([
      listInvoicesForJob(companyId, jobId),
      listEstimatesForJob(companyId, jobId),
      listJobLaborEntriesForJob(companyId, jobId),
      preloaded?.expenses ?? listExpensesForJob(companyId, jobId),
      preloaded?.materials ?? listJobMaterialsForJob(companyId, jobId),
    ]);

  return computeJobProfitability({
    invoices,
    estimates,
    expenses,
    materials,
    laborEntries,
  });
}
