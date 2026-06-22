import type { CompanyPaymentAccountStatus } from "@/lib/payments/types";

/** Read-only Stripe account snapshot for settings UI (no secrets or metadata). */
export type StripePaymentSettingsSummary = {
  provider: "stripe";
  status: CompanyPaymentAccountStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onlinePaymentsEnabled: boolean;
  hasProviderAccountId: boolean;
  onboardingCompletedAt: string | null;
  disabledAt: string | null;
  lastSyncedAt: string | null;
};

export const PAYMENT_ACCOUNT_STATUS_LABELS: Record<
  CompanyPaymentAccountStatus,
  string
> = {
  not_connected: "Not connected",
  pending: "Pending setup",
  active: "Active",
  restricted: "Restricted",
  disabled: "Disabled",
  error: "Needs attention",
};

export function formatPaymentCapabilityEnabled(enabled: boolean): string {
  return enabled ? "Yes" : "No";
}

export function canEnableOnlineCheckoutAccount(
  account: StripePaymentSettingsSummary,
): boolean {
  return (
    account.provider === "stripe" &&
    account.status === "active" &&
    account.chargesEnabled &&
    account.payoutsEnabled &&
    account.hasProviderAccountId &&
    account.onboardingCompletedAt !== null &&
    account.disabledAt === null &&
    !account.onlinePaymentsEnabled
  );
}

export function getOnlineCheckoutEnableBlockedMessage(
  account: StripePaymentSettingsSummary | null,
): string {
  if (!account) {
    return "Connect Stripe before enabling online checkout.";
  }

  if (account.onlinePaymentsEnabled) {
    return "Online checkout is enabled for this account.";
  }

  if (account.status !== "active") {
    return "Stripe account must be active before online checkout can be enabled.";
  }

  if (!account.chargesEnabled) {
    return "Stripe charges must be enabled before online checkout can be enabled.";
  }

  if (!account.payoutsEnabled) {
    return "Stripe payouts must be enabled before online checkout can be enabled.";
  }

  if (!account.onboardingCompletedAt) {
    return "Complete Stripe onboarding before enabling online checkout.";
  }

  if (account.disabledAt) {
    return "Stripe account is disabled. Online checkout cannot be enabled.";
  }

  if (!account.hasProviderAccountId) {
    return "Stripe account linkage is incomplete.";
  }

  return "Online checkout is not ready to enable yet.";
}

/** Display-only notice when returning from Stripe Connect onboarding. */
export type PaymentSetupReturnNotice = "return" | "refresh";
