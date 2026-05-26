import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listAssignedJobsForTechnician } from "@/lib/database/queries/technician-jobs";
import { getCurrentTimeState } from "@/lib/database/services/time-tracking";
import { TechnicianAssignedJobsView } from "@/shared/components/technician/TechnicianAssignedJobsView";

export default async function TechnicianPage() {
  const context = await getActiveCompanyContext();

  if (!context) {
    redirect("/setup");
  }

  const [jobs, timeState] = await Promise.all([
    listAssignedJobsForTechnician(context.company.id, context.user.id),
    getCurrentTimeState(context.company.id, context.user.id),
  ]);

  return <TechnicianAssignedJobsView jobs={jobs} timeState={timeState} />;
}
