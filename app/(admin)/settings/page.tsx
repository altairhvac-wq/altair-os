import { redirect } from "next/navigation";
import {
  canAccessCompanySettings,
  canAccessSystemCheck,
  canManageDemoData,
  canManageTeamMembers,
} from "@/lib/database/access-control";
import { getCompanyBillingDefaultsFromRow } from "@/lib/database/queries/companies";
import { getCurrentProfile, getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  listCompanyMembers,
  listPendingInvitesForUserEmail,
  resolveUserEmailForInvite,
} from "@/lib/database/queries/memberships";
import { getOnboardingSnapshot } from "@/lib/database/queries/onboarding-snapshot";
import { getDemoDataStatus } from "@/lib/database/queries/demo-data";
import { buildOnboardingChecklist, filterOnboardingChecklistForContext } from "@/shared/lib/onboarding-checklist";
import { hasSavedCompanyBillingDefaults } from "@/shared/lib/company-billing-defaults";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { SettingsPageView } from "@/shared/components/settings/SettingsPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import type { CompanyProfileSummary } from "@/shared/types/team-member";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canAccessCompanySettings(companyContext)) {
    return (
      <UnauthorizedAccessView description="Company settings are limited to owner and admin roles." />
    );
  }

  const profile = await getCurrentProfile();
  const emailResolution = resolveUserEmailForInvite(
    profile?.email,
    user?.email ?? undefined,
  );

  const [{ members, error: membersError }, pendingInvitesResult, onboardingSnapshot, demoDataStatus] =
    await Promise.all([
      listCompanyMembers(companyContext.company.id, companyContext),
      emailResolution.email
        ? listPendingInvitesForUserEmail(emailResolution.email)
        : Promise.resolve({ invites: [], error: undefined }),
      getOnboardingSnapshot(companyContext.company.id, companyContext),
      canManageDemoData(companyContext)
        ? getDemoDataStatus(companyContext.company.id, companyContext)
        : Promise.resolve(null),
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

  const onboardingChecklist = filterOnboardingChecklistForContext(
    buildOnboardingChecklist(onboardingSnapshot),
    companyContext,
  );
  const billingDefaults = getCompanyBillingDefaultsFromRow(companyContext.company);

  return (
    <div className="min-w-0 max-w-full space-y-3 sm:space-y-4">
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

      <SettingsPageView
        companyProfile={companyProfile}
        initialMembers={members}
        currentUserId={companyContext.user.id}
        currentUserRole={companyContext.role}
        canManageTeam={canManageTeamMembers(companyContext)}
        showSystemCheckLink={canAccessSystemCheck(companyContext)}
        membersLoadError={membersError}
        onboardingChecklist={onboardingChecklist}
        billingDefaults={billingDefaults}
        canManageBillingDefaults={canAccessCompanySettings(companyContext)}
        showBillingDefaultsSetupHint={
          !hasSavedCompanyBillingDefaults(companyContext.company.settings)
        }
        demoDataStatus={demoDataStatus ?? undefined}
        pendingInvites={pendingInvites}
      />
    </div>
  );
}
