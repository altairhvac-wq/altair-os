import { redirect } from "next/navigation";
import { canViewCompanyTimeEntries } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  getOpenTimeClockEntryForUser,
  listTimeClockEntries,
} from "@/lib/database/queries/time-clock";
import { TimeClockFoundationView } from "@/shared/components/time-clock/TimeClockFoundationView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";

export default async function TimeClockPage() {
  const context = await getActiveCompanyContext();

  if (!context) {
    redirect("/setup");
  }

  if (!canViewCompanyTimeEntries(context)) {
    return (
      <UnauthorizedAccessView description="Time review is for office and admin roles. Technicians track time through Start work and Complete work on assigned jobs." />
    );
  }

  const canViewCompanyEntries = canViewCompanyTimeEntries(context);
  const userName =
    context.profile.full_name?.trim() || context.user.email || "You";

  const [{ entry: openEntry }, entries] = await Promise.all([
    getOpenTimeClockEntryForUser(context.company.id, context.user.id),
    listTimeClockEntries(context.company.id, {
      userId: canViewCompanyEntries ? undefined : context.user.id,
      limit: 100,
    }),
  ]);

  return (
    <TimeClockFoundationView
      initialOpenEntry={openEntry}
      initialEntries={entries}
      currentUserId={context.user.id}
      currentUserName={userName}
      canViewCompanyEntries={canViewCompanyEntries}
    />
  );
}
