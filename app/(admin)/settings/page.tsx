import { redirect } from "next/navigation";
import {
  canAccessSystemCheck,
  canManageTeamMembers,
} from "@/lib/database/access-control";
import { getCurrentProfile, getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  listCompanyMembers,
  listPendingInvitesForUserEmail,
  resolveUserEmailForInvite,
} from "@/lib/database/queries/memberships";
import { getOnboardingSnapshot } from "@/lib/database/queries/onboarding-snapshot";
import { buildOnboardingChecklist } from "@/shared/lib/onboarding-checklist";
import { PendingInvitesCard } from "@/shared/components/settings/PendingInvitesCard";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { SettingsPageView } from "@/shared/components/settings/SettingsPageView";
import type { CompanyProfileSummary } from "@/shared/types/team-member";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  const profile = await getCurrentProfile();
  const emailResolution = resolveUserEmailForInvite(
    profile?.email,
    user?.email ?? undefined,
  );

  const [{ members, error: membersError }, pendingInvitesResult, onboardingSnapshot] =
    await Promise.all([
      listCompanyMembers(companyContext.company.id),
      emailResolution.email
        ? listPendingInvitesForUserEmail(emailResolution.email)
        : Promise.resolve({ invites: [], error: undefined }),
      getOnboardingSnapshot(companyContext.company.id),
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

  const onboardingChecklist = buildOnboardingChecklist(onboardingSnapshot);

  return (
    <div className="min-w-0 max-w-full space-y-6">
      {emailResolution.mismatch ? (
        <SettingsAlertBanner tone="warning">
          Your profile email and sign-in email do not match. Update them to the
          same address before you can view or accept team invitations.
        </SettingsAlertBanner>
      ) : null}

      {pendingInvitesResult.error ? (
        <SettingsAlertBanner tone="error">
          {pendingInvitesResult.error}
        </SettingsAlertBanner>
      ) : null}

      <PendingInvitesCard invites={pendingInvites} variant="settings" />

      <SettingsPageView
        companyProfile={companyProfile}
        initialMembers={members}
        currentUserId={companyContext.user.id}
        currentUserRole={companyContext.role}
        canManageTeam={canManageTeamMembers(companyContext)}
        showSystemCheckLink={canAccessSystemCheck(companyContext)}
        membersLoadError={membersError}
        onboardingChecklist={onboardingChecklist}
      />
    </div>
  );
}
