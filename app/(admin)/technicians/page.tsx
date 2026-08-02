import { redirect } from "next/navigation";
import {
  canManageTeamMembers,
  canViewCompanyTimeEntries,
} from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  ensureTechnicianMemberShareCodes,
  listCompanyMembers,
} from "@/lib/database/queries/memberships";
import { listActiveTechnicianTimeEntries } from "@/lib/database/queries/time-entries";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { TechniciansPageView } from "@/shared/components/technicians/TechniciansPageView";
import {
  attachTeamMemberTimeStates,
  countTechnicianTimeStates,
} from "@/shared/lib/technicians/technician-roster-time-status";

export default async function TechniciansPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canManageTeamMembers(companyContext)) {
    return (
      <UnauthorizedAccessView description="Technician roster access is limited to owners and admins." />
    );
  }

  const companyId = companyContext.company.id;
  const [{ members, error: membersError }, activeEntries] = await Promise.all([
    listCompanyMembers(companyId, companyContext),
    canViewCompanyTimeEntries(companyContext)
      ? listActiveTechnicianTimeEntries(companyId)
      : Promise.resolve([]),
  ]);

  const technicianMembers = members.filter(
    (member) => member.role === "technician",
  );
  const techniciansWithCodes = membersError
    ? technicianMembers
    : await ensureTechnicianMemberShareCodes(companyId, technicianMembers);
  const technicians = attachTeamMemberTimeStates(
    techniciansWithCodes,
    activeEntries,
  );
  const statusCounts = countTechnicianTimeStates(technicians);

  return (
    <TechniciansPageView
      technicians={technicians}
      statusCounts={statusCounts}
      loadError={membersError}
    />
  );
}
