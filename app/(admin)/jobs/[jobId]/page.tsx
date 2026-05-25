import { notFound, redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
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

  const [job, technicians] = await Promise.all([
    getJobById(companyContext.company.id, jobId),
    listTechnicians(companyContext.company.id),
  ]);

  if (!job) {
    notFound();
  }

  return (
    <JobDetailPageView
      job={job}
      technicians={technicians}
      canUpdateStatus={companyContext.permissions.dispatchJobs}
      canAssignTechnician={companyContext.permissions.dispatchJobs}
    />
  );
}
