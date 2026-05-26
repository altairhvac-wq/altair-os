import { redirect } from "next/navigation";
import {
  canAccessAdminNavItem,
  canManageTeamMembers,
} from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listCompanyMembers } from "@/lib/database/queries/memberships";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { SettingsPageView } from "@/shared/components/settings/SettingsPageView";
import type { CompanyProfileSummary } from "@/shared/types/team-member";

export default async function SettingsPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canAccessAdminNavItem(companyContext, "/settings")) {
    return (
      <UnauthorizedAccessView description="Company settings are limited to owner and admin roles." />
    );
  }

  const { members, error: membersError } = await listCompanyMembers(
    companyContext.company.id,
  );

  const companyProfile: CompanyProfileSummary = {
    id: companyContext.company.id,
    name: companyContext.company.name,
    status: companyContext.company.status,
    timezone: companyContext.company.timezone,
    email: companyContext.company.email,
    phone: companyContext.company.phone,
    city: companyContext.company.city,
    state: companyContext.company.state,
    memberCount: members.length,
    currentUserRole: companyContext.role,
  };

  return (
    <SettingsPageView
      companyProfile={companyProfile}
      initialMembers={members}
      currentUserId={companyContext.user.id}
      currentUserRole={companyContext.role}
      canManageTeam={canManageTeamMembers(companyContext)}
      membersLoadError={membersError}
    />
  );
}
