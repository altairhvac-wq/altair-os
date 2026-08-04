import {
  canManageOnlineCheckout,
  canRefreshStripePaymentAccountStatus,
  canStartStripeConnectOnboarding,
} from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyPaymentAccount } from "@/lib/database/queries/company-payment-accounts";
import {
  isStripeConnectOnboardingConfigured,
  isStripeTestMode,
} from "@/lib/payments/env";
import {
  getCompanySubscriptionBillingSummary,
  isSaasBillingCheckoutConfigured,
  type CompanySubscriptionBillingSummary,
} from "@/lib/saas-billing";
import { CompanySubscriptionBillingCard } from "@/shared/components/settings/CompanySubscriptionBillingCard";
import { PaymentSettingsCard } from "@/shared/components/settings/PaymentSettingsCard";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import {
  SettingsWorkspacePage,
  SettingsWorkspaceSection,
} from "@/shared/components/settings/SettingsWorkspacePage";
import {
  buildStripePaymentSettingsSummary,
  type PaymentSetupReturnNotice,
  type StripePaymentSettingsSummary,
} from "@/shared/types/settings/payment-settings";

async function loadSubscriptionBillingSafely(companyId: string): Promise<{
  summary: CompanySubscriptionBillingSummary | null;
  error?: string;
}> {
  try {
    return {
      summary: await getCompanySubscriptionBillingSummary(companyId),
    };
  } catch (error) {
    console.error("[SubscriptionSettingsPage] billing load failed:", error);
    return {
      summary: null,
      error:
        "We couldn't load subscription status. Refresh the page or try again in a moment.",
    };
  }
}

async function loadStripePaymentSettingsSafely(companyId: string): Promise<{
  summary: StripePaymentSettingsSummary | null;
  error?: string;
}> {
  try {
    const account = await getCompanyPaymentAccount(companyId, "stripe");
    return {
      summary: account
        ? buildStripePaymentSettingsSummary({
            provider: account.provider,
            status: account.status,
            chargesEnabled: account.chargesEnabled,
            payoutsEnabled: account.payoutsEnabled,
            onlinePaymentsEnabled: account.onlinePaymentsEnabled,
            providerAccountId: account.providerAccountId,
            onboardingCompletedAt: account.onboardingCompletedAt,
            disabledAt: account.disabledAt,
            lastSyncedAt: account.lastSyncedAt,
            providerMetadata: account.providerMetadata,
          })
        : null,
    };
  } catch (error) {
    console.error("[SubscriptionSettingsPage] Stripe status load failed:", error);
    return {
      summary: null,
      error:
        "We couldn't load Stripe payment status. Refresh the page or try again in a moment.",
    };
  }
}

export default async function SubscriptionSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ payments?: string }>;
}) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    return null;
  }

  const params = await searchParams;
  const canViewPaymentSettings = companyContext.permissions.manageBilling;
  const [billingResult, paymentResult] = await Promise.all([
    loadSubscriptionBillingSafely(companyContext.company.id),
    canViewPaymentSettings
      ? loadStripePaymentSettingsSafely(companyContext.company.id)
      : Promise.resolve({
          summary: null as StripePaymentSettingsSummary | null,
          error: undefined as string | undefined,
        }),
  ]);
  const paymentSetupNotice: PaymentSetupReturnNotice | null =
    params.payments === "return" || params.payments === "refresh"
      ? params.payments
      : null;

  return (
    <SettingsWorkspacePage
      title="Billing"
      description="Manage your Altair subscription and customer payment collection."
    >
      <SettingsWorkspaceSection
        title="Altair subscription"
        description="Plan, trial, billing portal, and subscription invoices for Altair OS."
        card={false}
      >
        <CompanySubscriptionBillingCard
          summary={billingResult.summary}
          canManageSubscription={companyContext.permissions.manageCompany}
          checkoutConfigured={isSaasBillingCheckoutConfigured()}
          loadError={billingResult.error ?? null}
        />
      </SettingsWorkspaceSection>

      <div id="customer-payments" className="scroll-mt-24">
        <SettingsWorkspaceSection
          title="Customer payments"
          description="Stripe Connect for collecting invoice payments from your customers."
          card={false}
        >
          {paymentResult.error ? (
            <SettingsAlertBanner tone="error">
              {paymentResult.error}
            </SettingsAlertBanner>
          ) : null}

          {canViewPaymentSettings ? (
            <PaymentSettingsCard
              stripeAccount={paymentResult.summary}
              companyTimezone={companyContext.company.timezone}
              canStartStripeSetup={canStartStripeConnectOnboarding(
                companyContext,
              )}
              canManageOnlineCheckout={canManageOnlineCheckout(companyContext)}
              canRefreshStripeStatus={canRefreshStripePaymentAccountStatus(
                companyContext,
              )}
              stripeOnboardingConfigured={isStripeConnectOnboardingConfigured()}
              stripeTestMode={isStripeTestMode()}
              paymentSetupNotice={paymentSetupNotice}
            />
          ) : (
            <p className="text-sm text-altair-ink-secondary">
              Customer payment settings are limited to roles with billing access.
            </p>
          )}
        </SettingsWorkspaceSection>
      </div>
    </SettingsWorkspacePage>
  );
}
