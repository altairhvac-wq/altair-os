import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listDispatchJobsForToday } from "@/lib/database/queries/dispatch";
import { listTechnicians } from "@/lib/database/queries/technicians";
import { DispatchPageView } from "@/shared/components/dispatch/DispatchPageView";

export default async function DispatchPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  const jobs = await listDispatchJobsForToday(companyContext.company.id);
  const technicians = await listTechnicians(companyContext.company.id, jobs);

  return (
    <DispatchPageView
      initialJobs={jobs}
      technicians={technicians}
      canDispatchJobs={companyContext.permissions.dispatchJobs}
      canViewAssignedJobs={companyContext.permissions.viewAssignedJobs}
    />
  );
}
