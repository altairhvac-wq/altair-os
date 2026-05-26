import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getJobById } from "@/lib/database/queries/jobs";
import {
  listActiveTechnicianTimeEntries,
  listTimeEntries,
} from "@/lib/database/queries/time-entries";
import { AdminTimeTrackingView } from "@/shared/components/time-clock/AdminTimeTrackingView";

type TimePageProps = {
  searchParams: Promise<{ jobId?: string }>;
};

export default async function TimePage({ searchParams }: TimePageProps) {
  const context = await getActiveCompanyContext();

  if (!context) {
    redirect("/setup");
  }

  const { jobId } = await searchParams;
  const job = jobId ? await getJobById(context.company.id, jobId) : null;

  const canViewAll =
    context.permissions.manageBilling ||
    context.permissions.dispatchJobs ||
    context.permissions.manageCompany;

  const [entries, activeEntries] = canViewAll
    ? await Promise.all([
        listTimeEntries(context.company.id, { limit: 100 }),
        listActiveTechnicianTimeEntries(context.company.id),
      ])
    : [[], []];

  return (
    <AdminTimeTrackingView
      entries={entries}
      activeEntries={activeEntries}
      canViewAll={canViewAll}
      initialJobId={job?.id}
      initialJobLabel={job?.jobNumber}
    />
  );
}
