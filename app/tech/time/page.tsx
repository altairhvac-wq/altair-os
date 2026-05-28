import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  getCurrentTimeState,
  getTodayTimeEntries,
} from "@/lib/database/services/time-tracking";
import { TechnicianTimeView } from "@/shared/components/technician/TechnicianTimeView";

export default async function TechnicianTimePage() {
  const context = await getActiveCompanyContext();

  if (!context) {
    redirect("/setup");
  }

  const state = await getCurrentTimeState(context.company.id, context.user.id);
  const { entries, summary } = await getTodayTimeEntries(
    context.company.id,
    context.user.id,
    context.company.timezone,
  );

  return (
    <TechnicianTimeView
      initialState={state}
      initialEntries={entries}
      initialSummary={summary}
      technicianName={
        context.profile.full_name?.trim() ||
        context.user.email ||
        "Technician"
      }
    />
  );
}
