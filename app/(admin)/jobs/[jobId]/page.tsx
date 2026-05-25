import { notFound, redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listOperationalActivitiesForJob } from "@/lib/database/queries/operational-activities";
import { listExpensesForJob } from "@/lib/database/queries/expenses";
import { listJobAttachmentsForJob } from "@/lib/database/queries/job-attachments";
import { listCustomerEquipment } from "@/lib/database/queries/customer-equipment";
import { getJobById } from "@/lib/database/queries/jobs";
import { listTechnicians } from "@/lib/database/queries/technicians";
import { JobDetailPageView } from "@/shared/components/jobs/JobDetailPageView";

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

  const [technicians, activities, equipment, attachments, expenses] =
    await Promise.all([
    listTechnicians(companyContext.company.id),
    listOperationalActivitiesForJob(companyContext.company.id, jobId),
    listCustomerEquipment(companyContext.company.id, job.customerId),
    listJobAttachmentsForJob(companyContext.company.id, jobId),
    listExpensesForJob(companyContext.company.id, jobId),
  ]);

  return (
    <JobDetailPageView
      job={job}
      technicians={technicians}
      activities={activities}
      equipment={equipment}
      attachments={attachments}
      expenses={expenses}
      canUpdateStatus={
        companyContext.permissions.dispatchJobs ||
        (companyContext.permissions.viewAssignedJobs &&
          job.assignedTechnicianId === companyContext.user.id)
      }
      canAssignTechnician={companyContext.permissions.dispatchJobs}
    />
  );
}
