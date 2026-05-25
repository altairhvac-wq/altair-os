import { notFound, redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listJobActivitiesForJob } from "@/lib/database/queries/job-activities";
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

  const [job, technicians, activities] = await Promise.all([
    getJobById(companyContext.company.id, jobId),
    listTechnicians(companyContext.company.id),
    listJobActivitiesForJob(companyContext.company.id, jobId),
  ]);

  if (!job) {
    notFound();
  }

  return (
    <JobDetailPageView
      job={job}
      technicians={technicians}
      activities={activities}
      canUpdateStatus={companyContext.permissions.dispatchJobs}
      canAssignTechnician={companyContext.permissions.dispatchJobs}
    />
  );
}
