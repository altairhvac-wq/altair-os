import { notFound, redirect } from "next/navigation";
import { canViewJob, canViewJobFinancials, getCompanyAccessScope } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listCustomers } from "@/lib/database/queries/customers";
import { listOperationalActivitiesForJob } from "@/lib/database/queries/operational-activities";
import { listExpensesForJob } from "@/lib/database/queries/expenses";
import { listJobAttachmentsForJob } from "@/lib/database/queries/job-attachments";
import { listJobMaterialsForJob } from "@/lib/database/queries/job-materials";
import { listActiveServiceItems } from "@/lib/database/queries/service-items";
import { listCustomerEquipment } from "@/lib/database/queries/customer-equipment";
import { getJobById } from "@/lib/database/queries/jobs";
import { listTechnicians } from "@/lib/database/queries/technicians";
import { getJobProfitabilitySnapshot } from "@/lib/database/services/job-profitability";
import { JobDetailPageView } from "@/shared/components/jobs/JobDetailPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";

type JobDetailPageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function JobDetailPage({ params }: JobDetailPageProps) {
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
    listOperationalActivitiesForJob(companyContext.company.id, jobId),
    listCustomerEquipment(companyContext.company.id, job.customerId),
    listJobAttachmentsForJob(companyContext.company.id, jobId),
    listExpensesForJob(companyContext.company.id, jobId),
    listJobMaterialsForJob(companyContext.company.id, jobId),
    listActiveServiceItems(companyContext.company.id),
    canEditJob
      ? listCustomers(companyContext.company.id)
      : Promise.resolve([]),
  ]);

  const profitability = canViewFinancials
    ? await getJobProfitabilitySnapshot(
        companyContext.company.id,
        jobId,
        { expenses, materials },
      )
    : null;

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
      profitability={profitability}
      serviceItems={serviceItems}
      canUpdateStatus={
        companyContext.permissions.dispatchJobs ||
        (companyContext.permissions.viewAssignedJobs &&
          job.assignedTechnicianId === companyContext.user.id)
      }
      canAssignTechnician={companyContext.permissions.dispatchJobs}
      canEditJob={canEditJob}
      canLogMaterials={
        companyContext.permissions.dispatchJobs ||
        companyContext.permissions.manageBilling ||
        (companyContext.permissions.viewAssignedJobs &&
          job.assignedTechnicianId === companyContext.user.id)
      }
      canViewFinancials={canViewFinancials}
    />
  );
}
