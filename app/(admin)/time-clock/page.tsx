import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  getOpenTimeClockEntryForUser,
  listTimeClockEntries,
} from "@/lib/database/queries/time-clock";
import { TimeClockFoundationView } from "@/shared/components/time-clock/TimeClockFoundationView";
import { canViewCompanyTimeClockEntries } from "@/shared/types/time-clock";

export default async function TimeClockPage() {
  const context = await getActiveCompanyContext();

  if (!context) {
    redirect("/setup");
  }

  const canViewCompanyEntries = canViewCompanyTimeClockEntries(context.role);
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
