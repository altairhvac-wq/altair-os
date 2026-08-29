import type { Metadata } from "next";
import {
  canManageOnlineCheckout,
  canRefreshStripePaymentAccountStatus,
  canStartStripeConnectOnboarding,
} from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyPaymentAccount } from "@/lib/database/queries/company-payment-accounts";
import { listCompanyCardFailureAttentionAttempts } from "@/lib/database/queries/payment-attempts";
import { listCompanyPaymentDisputes } from "@/lib/database/queries/payment-disputes";
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
import {
  PaymentCardFailuresCard,
  type PaymentCardFailureListViewItem,
} from "@/shared/components/settings/PaymentCardFailuresCard";
import { PaymentDisputesCard } from "@/shared/components/settings/PaymentDisputesCard";
import { PaymentSettingsCard } from "@/shared/components/settings/PaymentSettingsCard";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import {
  SettingsWorkspacePage,
  SettingsWorkspaceSection,
} from "@/shared/components/settings/SettingsWorkspacePage";
import type { PaymentDisputeListViewItem } from "@/shared/types/settings/payment-disputes";
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
    console.error("[BillingSettingsPage] billing load failed:", error);
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
    console.error("[BillingSettingsPage] Stripe status load failed:", error);
    return {
      summary: null,
      error:
        "We couldn't load Stripe payment status. Refresh the page or try again in a moment.",
    };
  }
}

async function loadPaymentDisputesSafely(companyId: string): Promise<{
  disputes: PaymentDisputeListViewItem[];
  error?: string;
}> {
  try {
    const rows = await listCompanyPaymentDisputes(companyId, { limit: 25 });
    return {
      disputes: rows.map((row) => ({
        id: row.id,
        providerDisputeId: row.provider_dispute_id,
        amount: row.amount,
        currency: row.currency,
        reason: row.reason,
        status: row.status,
        evidenceDueBy: row.evidence_due_by,
        providerCreatedAt: row.provider_created_at,
        createdAt: row.created_at,
        invoiceId: row.invoice_id,
        invoiceNumber: row.invoiceNumber,
        providerPaymentIntentId: row.provider_payment_intent_id,
      })),
    };
  } catch (error) {
    console.error("[BillingSettingsPage] disputes load failed:", error);
    return {
      disputes: [],
      error:
        "We couldn't load payment disputes. Refresh the page or try again in a moment.",
    };
  }
}

async function loadCardFailuresSafely(companyId: string): Promise<{
  attempts: PaymentCardFailureListViewItem[];
  error?: string;
}> {
  try {
    const rows = await listCompanyCardFailureAttentionAttempts(companyId, {
      limit: 25,
    });
    return {
      attempts: rows.map((row) => ({
        id: row.id,
        invoiceId: row.invoice_id,
        invoiceNumber: row.invoiceNumber,
        amount: row.amount,
        currency: row.currency,
        status: row.status,
        cardFailureCount: row.card_failure_count,
        lastCardFailureAt: row.last_card_failure_at,
        lastCardFailureCode: row.last_card_failure_code,
        lastCardFailureMessage: row.last_card_failure_message,
      })),
    };
  } catch (error) {
    console.error("[BillingSettingsPage] card failures load failed:", error);
    return {
      attempts: [],
      error:
        "We couldn't load card payment failures. Refresh the page or try again in a moment.",
    };
  }
}

export const metadata: Metadata = {
  title: "Billing",
};

export default async function BillingSettingsPage({
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
  const [billingResult, paymentResult, disputesResult, cardFailuresResult] =
    await Promise.all([
      loadSubscriptionBillingSafely(companyContext.company.id),
      canViewPaymentSettings
        ? loadStripePaymentSettingsSafely(companyContext.company.id)
        : Promise.resolve({
            summary: null as StripePaymentSettingsSummary | null,
            error: undefined as string | undefined,
          }),
      canViewPaymentSettings
        ? loadPaymentDisputesSafely(companyContext.company.id)
        : Promise.resolve({
            disputes: [] as PaymentDisputeListViewItem[],
            error: undefined as string | undefined,
          }),
      canViewPaymentSettings
        ? loadCardFailuresSafely(companyContext.company.id)
        : Promise.resolve({
            attempts: [] as PaymentCardFailureListViewItem[],
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
      {/* The cards carry their own titles ("Company subscription",
          "Online payments") — no duplicate section headers on top. */}
      <SettingsWorkspaceSection card={false}>
        <CompanySubscriptionBillingCard
          summary={billingResult.summary}
          canManageSubscription={companyContext.permissions.manageCompany}
          checkoutConfigured={isSaasBillingCheckoutConfigured()}
          loadError={billingResult.error ?? null}
        />
      </SettingsWorkspaceSection>

      <div id="customer-payments" className="scroll-mt-24">
        <SettingsWorkspaceSection card={false}>
          {paymentResult.error ? (
            <SettingsAlertBanner tone="error">
              {paymentResult.error}
            </SettingsAlertBanner>
          ) : null}

          {canViewPaymentSettings ? (
            <div className="space-y-4">
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
              <PaymentDisputesCard
                disputes={disputesResult.disputes}
                companyTimezone={companyContext.company.timezone}
                loadError={disputesResult.error ?? null}
              />
              <PaymentCardFailuresCard
                attempts={cardFailuresResult.attempts}
                companyTimezone={companyContext.company.timezone}
                loadError={cardFailuresResult.error ?? null}
              />
            </div>
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
