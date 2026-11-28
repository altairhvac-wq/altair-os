import { notFound, redirect } from "next/navigation";
import { isAiFeaturesEnabled } from "@/lib/ai/env";
import {
  canManageBusinessNumbers,
  canViewBilling,
  canViewJob,
  canViewJobFinancials,
  getCompanyAccessScope,
} from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listCustomers } from "@/lib/database/queries/customers";
import { listOperationalActivitiesForJob } from "@/lib/database/queries/operational-activities";
import { listExpensesForJob } from "@/lib/database/queries/expenses";
import { listJobAttachmentsForJob } from "@/lib/database/queries/job-attachments";
import { listJobMaterialsForJob } from "@/lib/database/queries/job-materials";
import { listActiveServiceItems } from "@/lib/database/queries/service-items";
import { listCustomerEquipment } from "@/lib/database/queries/customer-equipment";
import { getJobById, getJobDeleteDependencies } from "@/lib/database/queries/jobs";
import { listJobBillingSummariesForJob } from "@/lib/database/queries/job-billing-summaries";
import { listTechnicians } from "@/lib/database/queries/technicians";
import { getTechnicianLaborCostRate } from "@/lib/database/queries/team-member-profile";
import { listJobLaborEntriesForJob } from "@/lib/database/queries/time-entries";
import { getCompanyBusinessNumbers } from "@/lib/database/queries/business-numbers";
import { getJobProfitabilitySnapshot } from "@/lib/database/services/job-profitability";
import { deriveBusinessNumbers } from "@/shared/lib/business-numbers/derive";
import { computeJobProfitAfterLabor } from "@/shared/lib/business-numbers/job-profit";
import { getJobOperationalInconsistencies } from "@/lib/database/services/reports/operational-inconsistencies-report";
import { JobDetailPageView } from "@/shared/components/jobs/JobDetailPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { computeJobProfitability } from "@/shared/types/job-profitability";

type JobDetailPageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function WorkJobDetailPage({ params }: JobDetailPageProps) {
  const { jobId } = await params;
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  const job = await getJobById(companyContext.company.id, jobId);

  if (!job) {
    notFound();
  }

  if (!canViewJob(companyContext, job)) {
    return (
      <UnauthorizedAccessView description="You can only open jobs assigned to you." />
    );
  }

  const canViewFinancials = canViewJobFinancials(companyContext);
  const canViewBillingData = canViewBilling(companyContext);
  const canEditJob = companyContext.permissions.dispatchJobs;
  const access = getCompanyAccessScope(companyContext);

  const [
    technicians,
    activities,
    equipment,
    attachments,
    expenses,
    materials,
    serviceItems,
    customers,
  ] = await Promise.all([
    access.canViewTechnicianRoster
      ? listTechnicians(companyContext.company.id, companyContext)
      : Promise.resolve([]),
    listOperationalActivitiesForJob(companyContext.company.id, jobId, {
      includeBillingActivities: canViewBillingData,
    }),
    listCustomerEquipment(companyContext.company.id, job.customerId),
    listJobAttachmentsForJob(companyContext.company.id, jobId),
    listExpensesForJob(companyContext.company.id, jobId),
    listJobMaterialsForJob(companyContext.company.id, jobId),
    listActiveServiceItems(companyContext.company.id),
    canEditJob
      ? listCustomers(companyContext.company.id)
      : Promise.resolve([]),
  ]);

  const deleteDependencies = await getJobDeleteDependencies(
    companyContext.company.id,
    jobId,
  );

  const [
    profitability,
    operationalInconsistencies,
    billingContext,
    laborCostRate,
    laborEntries,
    businessNumbers,
  ] = await Promise.all([
    canViewFinancials
      ? getJobProfitabilitySnapshot(companyContext.company.id, jobId, {
          expenses,
          materials,
        })
      : Promise.resolve(null),
    access.canViewOperationalReports
      ? getJobOperationalInconsistencies(companyContext.company.id, job)
      : Promise.resolve([]),
    canViewBillingData || companyContext.permissions.createFieldEstimates
      ? listJobBillingSummariesForJob(companyContext.company.id, jobId, {
          includeInvoices: canViewBillingData,
        })
      : Promise.resolve(null),
    canViewFinancials && job.assignedTechnicianId
      ? getTechnicianLaborCostRate(
          companyContext.company.id,
          job.assignedTechnicianId,
        )
      : Promise.resolve(null),
    listJobLaborEntriesForJob(companyContext.company.id, jobId),
    // For "profit after labor and shop costs", below. Owner and admin only;
    // read alongside the rest so the page does not wait for it separately.
    canViewFinancials && canManageBusinessNumbers(companyContext)
      ? getCompanyBusinessNumbers(companyContext)
      : Promise.resolve(null),
  ]);

  // Profit after labor and shop costs: a second line beside gross profit, for
  // an owner or admin, from what an hour costs the company (Settings >
  // Numbers). The read is under row level security and returns blanks for
  // anyone else; where business numbers do not exist yet nothing is added.
  let jobProfitability = profitability;
  if (profitability && businessNumbers) {
    const numbers = businessNumbers;
    if (numbers.available && !numbers.error) {
      jobProfitability = {
        ...profitability,
        afterLabor: computeJobProfitAfterLabor(
          {
            grossProfit: profitability.grossProfit,
            collected: profitability.revenue.collected,
            laborHours: profitability.labor.totalHours,
          },
          deriveBusinessNumbers(numbers.record.numbers),
        ),
      };
    }
  }

  const laborSummary =
    profitability?.labor ??
    computeJobProfitability({
      invoices: [],
      estimates: [],
      expenses: [],
      materials: [],
      laborEntries,
    }).labor;

  return (
    <JobDetailPageView
      job={job}
      customers={customers}
      technicians={technicians}
      activities={activities}
      equipment={equipment}
      attachments={attachments}
      expenses={expenses}
      materials={materials}
      laborEntries={laborEntries}
      profitability={jobProfitability}
      laborSummary={laborSummary}
      laborCostRate={laborCostRate}
      serviceItems={serviceItems}
      canUpdateStatus={
        companyContext.permissions.dispatchJobs ||
        (companyContext.permissions.viewAssignedJobs &&
          job.assignedTechnicianId === companyContext.user.id)
      }
      canAssignTechnician={companyContext.permissions.dispatchJobs}
      canEditJob={canEditJob}
      deleteDependencies={deleteDependencies}
      canLogMaterials={
        companyContext.permissions.dispatchJobs ||
        companyContext.permissions.manageBilling ||
        (companyContext.permissions.viewAssignedJobs &&
          job.assignedTechnicianId === companyContext.user.id)
      }
      canViewFinancials={canViewFinancials}
      canViewBilling={canViewBillingData}
      canManageCustomers={access.canManageCustomers}
      operationalInconsistencies={operationalInconsistencies}
      billingContext={billingContext ?? undefined}
      aiFeaturesEnabled={isAiFeaturesEnabled()}
    />
  );
}
