import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listExpensesForTechnician } from "@/lib/database/queries/expenses";
import { listAssignedJobsForTechnician } from "@/lib/database/queries/technician-jobs";
import { TechnicianReceiptsView } from "@/shared/components/technician/TechnicianReceiptsView";
import { isTerminalJobStatus } from "@/shared/types/job-workflow";

type TechnicianReceiptsPageProps = {
  searchParams: Promise<{ selected?: string }>;
};

export const metadata: Metadata = {
  title: "Receipts",
};

export default async function TechnicianReceiptsPage({
  searchParams,
}: TechnicianReceiptsPageProps) {
  const context = await getActiveCompanyContext();

  if (!context) {
    redirect("/setup");
  }

  const { selected } = await searchParams;

  // The same jobs the Schedule tab shows this person, so a receipt added here
  // can go on any job they could have opened and added it from.
  const [expenses, assignedJobs] = await Promise.all([
    listExpensesForTechnician(context.company.id, context.user.id),
    listAssignedJobsForTechnician(context.company.id, context.user.id, {
      timeZone: context.company.timezone,
      scope: "operational_week",
    }),
  ]);

  // createExpenseAction refuses completed and cancelled jobs; do not offer them.
  const jobOptions = assignedJobs
    .filter((job) => !isTerminalJobStatus(job.status))
    .map((job) => ({
      id: job.id,
      jobNumber: job.jobNumber,
      label: `${job.jobNumber} · ${job.customerName}`,
    }));

  return (
    <TechnicianReceiptsView
      expenses={expenses}
      currentUserId={context.user.id}
      canManageBilling={context.permissions.manageBilling}
      canDispatchJobs={context.permissions.dispatchJobs}
      jobOptions={jobOptions}
      initialSelectedId={selected ?? null}
    />
  );
}
