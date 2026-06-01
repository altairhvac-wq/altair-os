import { listEstimates } from "@/lib/database/queries/estimates";
import { listExpenses } from "@/lib/database/queries/expenses";
import { listInvoices } from "@/lib/database/queries/invoices";
import { listJobMaterialsForCompany } from "@/lib/database/queries/job-materials";
import { listJobs } from "@/lib/database/queries/jobs";
import { listCompanyJobLaborEntries } from "@/lib/database/queries/time-entries";
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
