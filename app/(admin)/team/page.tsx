import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  canCorrectCompanyTimeEntries,
  canManageTeamMembers,
  canViewCompanyTimeEntries,
  canViewTechnicianRoster,
} from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  ensureTechnicianMemberShareCodes,
  listCompanyMembers,
} from "@/lib/database/queries/memberships";
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
import { TeamHubPageView } from "@/shared/components/team/TeamHubPageView";
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

const EMPTY_TIME_TRACKING = {
  shiftHoursToday: 0,
  openShiftCount: 0,
  staleOpenShifts: [] as const,
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

export const metadata: Metadata = {
  title: "Team",
};

export default async function TeamPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  const canTechnicians = canManageTeamMembers(companyContext);
  const canTimeClock = canViewCompanyTimeEntries(companyContext);

  if (!canTechnicians && !canTimeClock) {
    return (
      <UnauthorizedAccessView description="Team access is limited to owners, admins, and office roles that can review time." />
    );
  }

  const companyId = companyContext.company.id;
  const timeZone = companyContext.company.timezone;
  const userName =
    companyContext.profile.full_name?.trim() ||
    companyContext.user.email ||
    "You";
  const canListMembers = canManageTeamMembers(companyContext);

  const [
    membersResult,
    activeEntries,
    openEntryResult,
    recentEntries,
    openClockMapped,
    openClockEntries,
    todayTimeEntries,
    technicians,
  ] = await Promise.all([
    canListMembers
      ? listCompanyMembers(companyId, companyContext)
      : Promise.resolve({ members: [] as TeamMember[], error: null }),
    canTechnicians || canTimeClock
      ? listActiveTechnicianTimeEntries(companyId)
      : Promise.resolve([]),
    canTimeClock
      ? getOpenTimeClockEntryForUser(companyId, companyContext.user.id)
      : Promise.resolve({ entry: null }),
    canTimeClock
      ? listTimeClockEntries(companyId, {
          userId: canTimeClock ? undefined : companyContext.user.id,
          limit: 100,
        })
      : Promise.resolve([]),
    canTimeClock ? listOpenTimeClockEntries(companyId) : Promise.resolve([]),
    canTimeClock
      ? listOpenClockEntriesForCompany(companyId)
      : Promise.resolve([]),
    canTimeClock
      ? listTodayTimeEntriesForCompany(companyId, timeZone)
      : Promise.resolve([]),
    !canListMembers && canTimeClock && canViewTechnicianRoster(companyContext)
      ? listTechnicians(companyId, companyContext)
      : Promise.resolve([]),
  ]);

  const technicianMembersForRoster = canTechnicians
    ? membersResult.members.filter((member) => member.role === "technician")
    : [];
  const techniciansWithCodes =
    canTechnicians && !membersResult.error
      ? await ensureTechnicianMemberShareCodes(
          companyId,
          technicianMembersForRoster,
        )
      : technicianMembersForRoster;
  const techniciansRoster = canTechnicians
    ? attachTeamMemberTimeStates(techniciansWithCodes, activeEntries)
    : [];
  const technicianStatusCounts = canTechnicians
    ? countTechnicianTimeStates(techniciansRoster)
    : EMPTY_STATUS_COUNTS;

  const timeClockRosterMembers = canListMembers
    ? membersResult.members.filter((member) => member.role === "technician")
    : technicianRosterToTeamMembers(technicians);
  const showRosterCounts = canTimeClock && timeClockRosterMembers.length > 0;
  const timeClockStatusCounts = showRosterCounts
    ? countTechnicianTimeStates(
        attachTeamMemberTimeStates(timeClockRosterMembers, activeEntries),
      )
    : EMPTY_STATUS_COUNTS;

  const entries = canTimeClock
    ? Array.from(
        new Map(
          [...openClockMapped, ...recentEntries].map((entry) => [
            entry.id,
            entry,
          ]),
        ).values(),
      )
    : [];

  const timeTracking = canTimeClock
    ? buildShiftTimeTrackingSummary({
        openClockEntries,
        todayTimeEntries,
        timeZone,
      })
    : { ...EMPTY_TIME_TRACKING, staleOpenShifts: [] };

  return (
    <TeamHubPageView
      canTechnicians={canTechnicians}
      canTimeClock={canTimeClock}
      canManagePermissions={canTechnicians}
      technicians={techniciansRoster}
      technicianStatusCounts={technicianStatusCounts}
      techniciansLoadError={membersResult.error ?? undefined}
      initialOpenEntry={openEntryResult.entry}
      initialEntries={entries}
      activeEntries={activeEntries}
      timeClockStatusCounts={timeClockStatusCounts}
      timeTracking={timeTracking}
      showRosterCounts={showRosterCounts}
      currentUserId={companyContext.user.id}
      currentUserName={userName}
      canViewCompanyEntries={canTimeClock}
      canCorrectEntries={canCorrectCompanyTimeEntries(companyContext)}
    />
  );
}
