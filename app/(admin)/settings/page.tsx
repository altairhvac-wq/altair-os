import { redirect } from "next/navigation";
import {
  canAccessAdminNavItem,
  canManageTeamMembers,
} from "@/lib/database/access-control";
import { getCurrentProfile, getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  listCompanyMembers,
  listPendingInvitesForUserEmail,
  resolveUserEmailForInvite,
} from "@/lib/database/queries/memberships";
import { hasCompanyRole } from "@/lib/database/types/roles";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { PendingInvitesCard } from "@/shared/components/settings/PendingInvitesCard";
import { SettingsPageView } from "@/shared/components/settings/SettingsPageView";
import type { CompanyProfileSummary } from "@/shared/types/team-member";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canAccessAdminNavItem(companyContext, "/settings")) {
    return (
      <UnauthorizedAccessView description="Company settings are limited to owner and admin roles." />
    );
  }

  const profile = await getCurrentProfile();
  const emailResolution = resolveUserEmailForInvite(
    profile?.email,
    user?.email ?? undefined,
  );

  const [{ members, error: membersError }, pendingInvitesResult] =
    await Promise.all([
      listCompanyMembers(companyContext.company.id),
      emailResolution.email
        ? listPendingInvitesForUserEmail(emailResolution.email)
        : Promise.resolve({ invites: [], error: undefined }),
    ]);

  const pendingInvites = pendingInvitesResult.invites.filter(
    (invite) => invite.companyId !== companyContext.company.id,
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
    <div className="space-y-6">
      {emailResolution.mismatch ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your profile email and sign-in email do not match. Update them to the
          same address before you can view or accept team invitations.
        </div>
      ) : null}

      {pendingInvitesResult.error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {pendingInvitesResult.error}
        </div>
      ) : null}

      <PendingInvitesCard invites={pendingInvites} variant="settings" />

      <SettingsPageView
        companyProfile={companyProfile}
        initialMembers={members}
        currentUserId={companyContext.user.id}
        currentUserRole={companyContext.role}
        canManageTeam={canManageTeamMembers(companyContext)}
        showSystemCheckLink={hasCompanyRole(companyContext.role, ["owner"])}
        membersLoadError={membersError}
      />
    </div>
  );
}
