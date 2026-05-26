import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  listActiveTechnicianTimeEntries,
  listTimeEntries,
} from "@/lib/database/queries/time-entries";
import { AdminTimeTrackingView } from "@/shared/components/time-clock/AdminTimeTrackingView";

export default async function TimePage() {
  const context = await getActiveCompanyContext();

  if (!context) {
    redirect("/setup");
  }

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
    />
  );
}
