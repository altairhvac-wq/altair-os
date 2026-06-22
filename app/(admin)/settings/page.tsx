import { redirect } from "next/navigation";
import {
  canAccessCompanySettings,
  canAccessSystemCheck,
  canManageDemoData,
  canManageOnlineCheckout,
  canManageTeamMembers,
  canStartStripeConnectOnboarding,
} from "@/lib/database/access-control";
import { getCompanyBillingDefaultsFromRow } from "@/lib/database/queries/companies";
import { getCompanyPaymentAccount } from "@/lib/database/queries/company-payment-accounts";
import { getCurrentProfile, getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getDemoDataStatusSafe } from "@/lib/database/queries/demo-data";
import {
  listCompanyMembers,
  listPendingInvitesForUserEmail,
  resolveUserEmailForInvite,
  type PendingTeamInvite,
} from "@/lib/database/queries/memberships";
import { getOnboardingSnapshot } from "@/lib/database/queries/onboarding-snapshot";
import { buildOnboardingChecklist, filterOnboardingChecklistForContext } from "@/shared/lib/onboarding-checklist";
import { hasSavedCompanyBillingDefaults } from "@/shared/lib/company-billing-defaults";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { SettingsPageView } from "@/shared/components/settings/SettingsPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import type { CompanyProfileSummary } from "@/shared/types/team-member";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { OnboardingSnapshot } from "@/shared/types/onboarding";
import type {
  PaymentSetupReturnNotice,
  StripePaymentSettingsSummary,
} from "@/shared/types/settings/payment-settings";
import { isStripeConnectOnboardingConfigured } from "@/lib/payments/env";

const EMPTY_ONBOARDING_SNAPSHOT: OnboardingSnapshot = {
  teamMemberCount: 0,
  hasInvitedOrActiveTeam: false,
  customerCount: 0,
  leadCount: 0,
  jobCount: 0,
  serviceItemCount: 0,
  hasBillingDefaultsConfigured: false,
};

async function loadPendingInvitesSafely(
  email: string | null | undefined,
): Promise<{ invites: PendingTeamInvite[]; error?: string }> {
  if (!email) {
    return { invites: [] };
  }

  try {
    return await listPendingInvitesForUserEmail(email);
  } catch (error) {
    console.error("[SettingsPage] pending invites load failed:", error);
    return {
      invites: [],
      error: "Failed to load pending invitations. Please refresh and try again.",
    };
  }
}

async function loadOnboardingSnapshotSafely(
  companyId: string,
  companyContext: NonNullable<Awaited<ReturnType<typeof getActiveCompanyContext>>>,
): Promise<OnboardingSnapshot> {
  try {
    return await getOnboardingSnapshot(companyId, companyContext);
  } catch (error) {
    console.error("[SettingsPage] onboarding snapshot load failed:", error);
    return EMPTY_ONBOARDING_SNAPSHOT;
  }
}

async function loadDemoDataStatusSafely(
  companyId: string,
  companyContext: NonNullable<Awaited<ReturnType<typeof getActiveCompanyContext>>>,
): Promise<{ status: DemoDataStatus | null; error?: string }> {
  if (!canManageDemoData(companyContext)) {
    return { status: null };
  }

  return getDemoDataStatusSafe(companyId, companyContext);
}

async function loadStripePaymentSettingsSafely(
  companyId: string,
  canView: boolean,
): Promise<StripePaymentSettingsSummary | null | undefined> {
  if (!canView) {
    return undefined;
  }

  try {
    const account = await getCompanyPaymentAccount(companyId, "stripe");

    if (!account) {
      return null;
    }

    return {
      provider: account.provider,
      status: account.status,
      chargesEnabled: account.chargesEnabled,
      payoutsEnabled: account.payoutsEnabled,
      onlinePaymentsEnabled: account.onlinePaymentsEnabled,
      hasProviderAccountId: account.providerAccountId !== null,
      onboardingCompletedAt: account.onboardingCompletedAt,
      disabledAt: account.disabledAt,
      lastSyncedAt: account.lastSyncedAt,
    };
  } catch (error) {
    console.error("[SettingsPage] stripe payment settings load failed:", error);
    return null;
  }
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ payments?: string }>;
}) {
  const user = await getCurrentUser();
  const companyContext = await getActiveCompanyContext();
  const params = await searchParams;

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

  const { members, error: membersError } = await listCompanyMembers(
    companyContext.company.id,
    companyContext,
  );

  const [pendingInvitesResult, onboardingSnapshot, demoDataResult] =
    await Promise.all([
      loadPendingInvitesSafely(emailResolution.email),
      loadOnboardingSnapshotSafely(companyContext.company.id, companyContext),
      loadDemoDataStatusSafely(companyContext.company.id, companyContext),
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
  const northStar = isNorthStarShellEnabled();
  const canViewPaymentSettings = companyContext.permissions.manageBilling;
  const canStartStripeSetup = canStartStripeConnectOnboarding(companyContext);
  const canManageOnlineCheckoutGate = canManageOnlineCheckout(companyContext);
  const stripeOnboardingConfigured = isStripeConnectOnboardingConfigured();
  const paymentSetupNotice: PaymentSetupReturnNotice | null =
    params.payments === "return" || params.payments === "refresh"
      ? params.payments
      : null;

  const stripePaymentSettings = await loadStripePaymentSettingsSafely(
    companyContext.company.id,
    canViewPaymentSettings,
  );

  return (
    <div className="min-w-0 max-w-full space-y-3 sm:space-y-4">
      {emailResolution.mismatch ? (
        <SettingsAlertBanner tone="warning" northStar={northStar}>
          Your profile email and sign-in email do not match. Update them to the
          same address before you can view or accept team invitations.
        </SettingsAlertBanner>
      ) : null}

      {pendingInvitesResult.error ? (
        <SettingsAlertBanner tone="error" northStar={northStar}>
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
        demoDataStatus={demoDataResult.status ?? undefined}
        demoDataLoadError={demoDataResult.error}
        pendingInvites={pendingInvites}
        canViewPaymentSettings={canViewPaymentSettings}
        stripePaymentSettings={stripePaymentSettings}
        canStartStripeSetup={canStartStripeSetup}
        canManageOnlineCheckout={canManageOnlineCheckoutGate}
        stripeOnboardingConfigured={stripeOnboardingConfigured}
        paymentSetupNotice={paymentSetupNotice}
        companyTimezone={companyContext.company.timezone}
      />
    </div>
  );
}
