import {
  canManageOnlineCheckout,
  canRefreshStripePaymentAccountStatus,
  canStartStripeConnectOnboarding,
} from "@/lib/database/access-control";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyPaymentAccount } from "@/lib/database/queries/company-payment-accounts";
import {
  isStripeConnectOnboardingConfigured,
  isStripeTestMode,
} from "@/lib/payments/env";
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

async function loadStripePaymentSettingsSafely(
  companyId: string,
): Promise<{
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
    console.error("[PaymentsSettingsPage] Stripe status load failed:", error);
    return {
      summary: null,
      error:
        "We couldn't load Stripe payment status. Refresh the page or try again in a moment.",
    };
  }
}

export default async function PaymentsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ payments?: string }>;
}) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    return null;
  }

  const params = await searchParams;
  const northStar = isNorthStarShellEnabled();
  const canViewPaymentSettings = companyContext.permissions.manageBilling;
  const paymentResult = canViewPaymentSettings
    ? await loadStripePaymentSettingsSafely(companyContext.company.id)
    : { summary: null };
  const paymentSetupNotice: PaymentSetupReturnNotice | null =
    params.payments === "return" || params.payments === "refresh"
      ? params.payments
      : null;

  return (
    <SettingsWorkspacePage
      title="Customer Payments"
      description="Manage Stripe Connect, payment onboarding, checkout controls, and payout readiness."
      northStar={northStar}
    >
      {paymentResult.error ? (
        <SettingsAlertBanner tone="error" northStar={northStar}>
          {paymentResult.error}
        </SettingsAlertBanner>
      ) : null}

      <SettingsWorkspaceSection
        title="Stripe Connect"
        description="Customer payment collection is separate from your Altair subscription."
        northStar={northStar}
      >
        {canViewPaymentSettings ? (
          <PaymentSettingsCard
            stripeAccount={paymentResult.summary}
            companyTimezone={companyContext.company.timezone}
            canStartStripeSetup={canStartStripeConnectOnboarding(companyContext)}
            canManageOnlineCheckout={canManageOnlineCheckout(companyContext)}
            canRefreshStripeStatus={canRefreshStripePaymentAccountStatus(
              companyContext,
            )}
            stripeOnboardingConfigured={isStripeConnectOnboardingConfigured()}
            stripeTestMode={isStripeTestMode()}
            paymentSetupNotice={paymentSetupNotice}
            northStar={northStar}
          />
        ) : (
          <p
            className={`text-sm ${
              northStar ? "text-[#4F4638]" : "text-altair-ink-secondary"
            }`}
          >
            Customer payment settings are limited to roles with billing access.
          </p>
        )}
      </SettingsWorkspaceSection>
    </SettingsWorkspacePage>
  );
}
