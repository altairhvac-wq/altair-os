import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyPaymentAccount } from "@/lib/database/queries/company-payment-accounts";
import { listMarketingConnectedAccounts } from "@/lib/database/queries/marketing-connected-accounts";
import { hasCompanyRole } from "@/lib/database/types/roles";
import { SettingsIntegrationsView } from "@/shared/components/settings/SettingsIntegrationsView";
import {
  PAYMENT_ACCOUNT_STATUS_LABELS,
  buildStripePaymentSettingsSummary,
} from "@/shared/types/settings/payment-settings";

export default async function IntegrationsSettingsPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    return null;
  }

  const [accounts, paymentAccount] = await Promise.all([
    listMarketingConnectedAccounts(companyContext.company.id),
    companyContext.permissions.manageBilling
      ? getCompanyPaymentAccount(companyContext.company.id, "stripe")
      : Promise.resolve(null),
  ]);

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
    <SettingsIntegrationsView
      facebookAccounts={accounts}
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
    />
  );
}
