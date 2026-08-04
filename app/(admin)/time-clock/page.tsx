import { redirect } from "next/navigation";
import {
  canCorrectCompanyTimeEntries,
  canManageTeamMembers,
  canViewCompanyTimeEntries,
  canViewTechnicianRoster,
} from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listCompanyMembers } from "@/lib/database/queries/memberships";
import { listTechnicians } from "@/lib/database/queries/technicians";
import {
  getOpenTimeClockEntryForUser,
  listOpenTimeClockEntries,
  listTimeClockEntries,
} from "@/lib/database/queries/time-clock";
import {
  listActiveTechnicianTimeEntries,
  listOpenClockEntriesForCompany,
  listTodayTimeEntriesForCompany,
} from "@/lib/database/queries/time-entries";
import { COMPANY_ROLE_LABELS } from "@/lib/database/types/roles";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { TimeClockFoundationView } from "@/shared/components/time-clock/TimeClockFoundationView";
import {
  attachTeamMemberTimeStates,
  countTechnicianTimeStates,
  type TechnicianTimeStatusCounts,
} from "@/shared/lib/technicians/technician-roster-time-status";
import { buildShiftTimeTrackingSummary } from "@/shared/lib/time-tracking/shift-time-tracking-summary";
import type { TeamMember } from "@/shared/types/team-member";

const EMPTY_STATUS_COUNTS: TechnicianTimeStatusCounts = {
  clocked_in: 0,
  working_job: 0,
  on_break: 0,
  off_clock: 0,
};

function technicianRosterToTeamMembers(
  technicians: Awaited<ReturnType<typeof listTechnicians>>,
): TeamMember[] {
  return technicians
    .filter((technician) => technician.role === COMPANY_ROLE_LABELS.technician)
    .map((technician) => ({
      id: technician.id,
      userId: technician.id,
      name: technician.name,
      email: "",
      role: "technician" as const,
      status: "active" as const,
      joinedAt: null,
      createdAt: "",
      reportsToMemberId: null,
      technicianSpecialties: technician.specialties,
      memberShareCode: null,
    }));
}

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

  const companyId = context.company.id;
  const timeZone = context.company.timezone;
  const canViewCompanyEntries = canViewCompanyTimeEntries(context);
  const userName =
    context.profile.full_name?.trim() || context.user.email || "You";

  const [
    { entry: openEntry },
    recentEntries,
    openClockMapped,
    openClockEntries,
    todayTimeEntries,
    activeEntries,
    membersResult,
    technicians,
  ] = await Promise.all([
    getOpenTimeClockEntryForUser(companyId, context.user.id),
    listTimeClockEntries(companyId, {
      userId: canViewCompanyEntries ? undefined : context.user.id,
      limit: 100,
    }),
    listOpenTimeClockEntries(companyId),
    listOpenClockEntriesForCompany(companyId),
    listTodayTimeEntriesForCompany(companyId, timeZone),
    listActiveTechnicianTimeEntries(companyId),
    canManageTeamMembers(context)
      ? listCompanyMembers(companyId, context)
      : Promise.resolve({ members: [] as TeamMember[], error: null }),
    !canManageTeamMembers(context) && canViewTechnicianRoster(context)
      ? listTechnicians(companyId, context)
      : Promise.resolve([]),
  ]);

  const entries = Array.from(
    new Map(
      [...openClockMapped, ...recentEntries].map((entry) => [entry.id, entry]),
    ).values(),
  );

  const technicianMembers = canManageTeamMembers(context)
    ? membersResult.members.filter((member) => member.role === "technician")
    : technicianRosterToTeamMembers(technicians);

  const showRosterCounts = technicianMembers.length > 0;
  const statusCounts = showRosterCounts
    ? countTechnicianTimeStates(
        attachTeamMemberTimeStates(technicianMembers, activeEntries),
      )
    : EMPTY_STATUS_COUNTS;

  const timeTracking = buildShiftTimeTrackingSummary({
    openClockEntries,
    todayTimeEntries,
    timeZone,
  });

  return (
    <TimeClockFoundationView
      initialOpenEntry={openEntry}
      initialEntries={entries}
      activeEntries={activeEntries}
      statusCounts={statusCounts}
      timeTracking={timeTracking}
      showRosterCounts={showRosterCounts}
      currentUserId={context.user.id}
      currentUserName={userName}
      canViewCompanyEntries={canViewCompanyEntries}
      canCorrectEntries={canCorrectCompanyTimeEntries(context)}
    />
  );
}
