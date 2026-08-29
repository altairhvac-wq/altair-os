import type { Metadata } from "next";
import {
  canAccessCompanySettings,
  canManageDemoData,
} from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyBillingDefaultsFromRow } from "@/lib/database/queries/companies";
import { getCompanyPaymentAccount } from "@/lib/database/queries/company-payment-accounts";
import { getDemoDataStatusSafe } from "@/lib/database/queries/demo-data";
import { listMarketingConnectedAccounts } from "@/lib/database/queries/marketing-connected-accounts";
import { listCompanyMembers } from "@/lib/database/queries/memberships";
import { hasCompanyRole } from "@/lib/database/types/roles";
import { hasSavedCompanyBillingDefaults } from "@/shared/lib/company-billing-defaults";
import { CompanySettingsView } from "@/shared/components/settings/CompanySettingsView";
import {
  PAYMENT_ACCOUNT_STATUS_LABELS,
  buildStripePaymentSettingsSummary,
} from "@/shared/types/settings/payment-settings";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { CompanyProfileSummary } from "@/shared/types/team-member";

async function loadDemoDataStatus(
  companyContext: NonNullable<
    Awaited<ReturnType<typeof getActiveCompanyContext>>
  >,
): Promise<{ status: DemoDataStatus | null; error?: string }> {
  if (!canManageDemoData(companyContext)) {
    return { status: null };
  }

  return getDemoDataStatusSafe(companyContext.company.id, companyContext);
}

/**
 * Company (settings IA v2) — one page for profile, document defaults,
 * timezone, connections, and workspace data. Former /settings/preferences,
 * /settings/documents, and /settings/integrations redirect here.
 */
export const metadata: Metadata = {
  title: "Company settings",
};

export default async function CompanySettingsPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    return null;
  }

  const [{ members }, demoDataResult, marketingAccounts, paymentAccount] =
    await Promise.all([
      listCompanyMembers(companyContext.company.id, companyContext),
      loadDemoDataStatus(companyContext),
      listMarketingConnectedAccounts(companyContext.company.id),
      companyContext.permissions.manageBilling
        ? getCompanyPaymentAccount(companyContext.company.id, "stripe")
        : Promise.resolve(null),
    ]);

  const company = companyContext.company;
  const companyProfile: CompanyProfileSummary = {
    id: company.id,
    name: company.name,
    status: company.status,
    trade: company.trade,
    timezone: company.timezone,
    email: company.email,
    phone: company.phone,
    addressLine1: company.address_line1,
    addressLine2: company.address_line2,
    city: company.city,
    state: company.state,
    postalCode: company.postal_code,
    country: company.country,
    memberCount: members.length,
    currentUserRole: companyContext.role,
  };

  const stripeSummary = paymentAccount
    ? buildStripePaymentSettingsSummary({
        provider: paymentAccount.provider,
        status: paymentAccount.status,
        chargesEnabled: paymentAccount.chargesEnabled,
        payoutsEnabled: paymentAccount.payoutsEnabled,
        onlinePaymentsEnabled: paymentAccount.onlinePaymentsEnabled,
        providerAccountId: paymentAccount.providerAccountId,
        onboardingCompletedAt: paymentAccount.onboardingCompletedAt,
        disabledAt: paymentAccount.disabledAt,
        lastSyncedAt: paymentAccount.lastSyncedAt,
        providerMetadata: paymentAccount.providerMetadata,
      })
    : null;

  return (
    <CompanySettingsView
      companyProfile={companyProfile}
      canManage={canAccessCompanySettings(companyContext)}
      billingDefaults={getCompanyBillingDefaultsFromRow(company)}
      showBillingDefaultsSetupHint={
        !hasSavedCompanyBillingDefaults(company.settings)
      }
      facebookAccounts={marketingAccounts}
      canManageMarketingAccounts={hasCompanyRole(companyContext.role, [
        "owner",
        "admin",
      ])}
      stripeConnected={stripeSummary !== null}
      stripeStatusLabel={
        stripeSummary
          ? PAYMENT_ACCOUNT_STATUS_LABELS[stripeSummary.status]
          : "Not connected"
      }
      demoDataStatus={demoDataResult.status ?? undefined}
      demoDataLoadError={demoDataResult.error}
    />
  );
}
