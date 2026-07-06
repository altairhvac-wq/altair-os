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
    return "Connect Stripe before enabling online payments.";
  }

  if (account.onlinePaymentsEnabled) {
    return "Online payments are enabled for this account.";
  }

  if (account.status !== "active") {
    return "Stripe account must be active before online payments can be enabled.";
  }

  if (!account.chargesEnabled) {
    return "Stripe charges must be enabled before online payments can be enabled.";
  }

  if (!account.payoutsEnabled) {
    return "Stripe payouts must be enabled before online payments can be enabled.";
  }

  if (!account.onboardingCompletedAt) {
    return "Complete Stripe onboarding before enabling online payments.";
  }

  if (account.disabledAt) {
    return "Stripe account is disabled. Online payments cannot be enabled.";
  }

  if (!account.hasProviderAccountId) {
    return "Stripe account linkage is incomplete.";
  }

  return "Online payments are not ready to enable yet.";
}

/** Settings card status badge (composite state, not raw DB status alone). */
export function getPaymentSettingsStatusBadge(
  account: StripePaymentSettingsSummary | null,
): string {
  if (!account) {
    return "Not connected";
  }

  if (account.status === "pending" || account.status === "restricted") {
    return "Setup incomplete";
  }

  if (account.status === "active") {
    return account.onlinePaymentsEnabled
      ? "Online payments enabled"
      : "Connected, not enabled";
  }

  return PAYMENT_ACCOUNT_STATUS_LABELS[account.status];
}

export function getPaymentSettingsMainCopy(
  account: StripePaymentSettingsSummary | null,
): string {
  if (!account) {
    return "Connect Stripe when you're ready to accept card payments online. Until then, you can still create invoices, email payment links, show QR codes, and record manual payments.";
  }

  if (account.status === "pending" || account.status === "restricted") {
    return "Stripe needs a little more information before online payments can be turned on.";
  }

  if (account.status === "active" && account.onlinePaymentsEnabled) {
    return "Customers can pay eligible invoices online through secure payment links.";
  }

  if (account.status === "active") {
    return "Stripe is connected. Turn on online payments when you're ready for customers to pay invoices online.";
  }

  if (account.status === "disabled") {
    return "This Stripe account is disabled. Reconnect Stripe when you're ready to accept online payments again.";
  }

  return "Stripe needs attention before online payments can be used. Review your Stripe dashboard or continue setup.";
}

export function getPaymentSettingsPayNowClarify(
  account: StripePaymentSettingsSummary | null,
): string | null {
  if (!account) {
    return "Customers will not see a Pay Now button until Stripe setup is complete and online payments are enabled.";
  }

  return null;
}

export function getPaymentSettingsPaymentLinksClarify(
  account: StripePaymentSettingsSummary | null,
): string | null {
  if (!account?.onlinePaymentsEnabled) {
    return "Payment links can be created before Stripe is connected, but the Pay Now button appears only after online payments are enabled.";
  }

  return null;
}

export const PAYMENT_SETTINGS_MANUAL_RECORDING_NOTE =
  "Manual payment recording still works even when Stripe is not connected.";

export const PAYMENT_SETTINGS_STRIPE_SETUP_LATER_NOTE =
  "Stripe setup can be completed later from this page.";

export function formatStripeRefreshStatusMessage(input: {
  status: CompanyPaymentAccountStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  hasOutstandingRequirements: boolean;
}): string {
  if (input.status === "active") {
    return "Stripe account is active. You can enable online payments.";
  }

  const details: string[] = [];

  if (!input.chargesEnabled) {
    details.push("charges are disabled");
  }

  if (!input.payoutsEnabled) {
    details.push("payouts are disabled");
  }

  if (input.hasOutstandingRequirements) {
    details.push("Stripe still lists outstanding requirements");
  }

  if (details.length === 0) {
    return "Stripe account status was refreshed, but online payments are not active yet.";
  }

  const formattedDetails =
    details.length === 1
      ? details[0]!
      : `${details.slice(0, -1).join(", ")}, and ${details[details.length - 1]}`;

  return `Stripe account status was refreshed. ${formattedDetails.charAt(0).toUpperCase()}${formattedDetails.slice(1)}.`;
}

/** Display-only notice when returning from Stripe Connect onboarding. */
export type PaymentSetupReturnNotice = "return" | "refresh";
