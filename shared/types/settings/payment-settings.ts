import type { CompanyPaymentAccountStatus } from "@/lib/payments/types";
import type { StripeCapabilityStatus } from "@/lib/payments/stripe-account-sync";

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
  cardPaymentsCapability: StripeCapabilityStatus | null;
  hasOutstandingStripeRequirements: boolean;
};

export type CardPaymentsDisplayStatus =
  | "active"
  | "pending"
  | "not_requested"
  | "needs_info";

export const CARD_PAYMENTS_DISPLAY_LABELS: Record<
  CardPaymentsDisplayStatus,
  string
> = {
  active: "Card payments active",
  pending: "Card payments pending",
  not_requested: "Card payments not requested",
  needs_info: "Stripe still needs more information",
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

function readStripeCapabilityFromMetadata(
  providerMetadata: Record<string, unknown>,
  capability: "card_payments" | "transfers",
): StripeCapabilityStatus | null {
  const capabilities = providerMetadata.capabilities;

  if (
    !capabilities ||
    typeof capabilities !== "object" ||
    Array.isArray(capabilities)
  ) {
    return null;
  }

  const status = (capabilities as Record<string, unknown>)[capability];

  if (
    status === "active" ||
    status === "inactive" ||
    status === "pending" ||
    status === "unrequested"
  ) {
    return status;
  }

  return null;
}

export function stripeAccountHasOutstandingRequirementsFromMetadata(
  providerMetadata: Record<string, unknown>,
): boolean {
  const requirements = providerMetadata.requirements;

  if (!requirements || typeof requirements !== "object" || Array.isArray(requirements)) {
    return false;
  }

  const requirementRecord = requirements as Record<string, unknown>;
  const currentlyDue = requirementRecord.currently_due;
  const pastDue = requirementRecord.past_due;
  const disabledReason = requirementRecord.disabled_reason;
  const currentlyDueCount = requirementRecord.currently_due_count;
  const pastDueCount = requirementRecord.past_due_count;

  return (
    (Array.isArray(currentlyDue) && currentlyDue.length > 0) ||
    (Array.isArray(pastDue) && pastDue.length > 0) ||
    (typeof disabledReason === "string" && disabledReason.length > 0) ||
    (typeof currentlyDueCount === "number" && currentlyDueCount > 0) ||
    (typeof pastDueCount === "number" && pastDueCount > 0)
  );
}

export function buildStripePaymentSettingsSummary(input: {
  provider: "stripe";
  status: CompanyPaymentAccountStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onlinePaymentsEnabled: boolean;
  providerAccountId: string | null;
  onboardingCompletedAt: string | null;
  disabledAt: string | null;
  lastSyncedAt: string | null;
  providerMetadata: Record<string, unknown>;
}): StripePaymentSettingsSummary {
  return {
    provider: input.provider,
    status: input.status,
    chargesEnabled: input.chargesEnabled,
    payoutsEnabled: input.payoutsEnabled,
    onlinePaymentsEnabled: input.onlinePaymentsEnabled,
    hasProviderAccountId: input.providerAccountId !== null,
    onboardingCompletedAt: input.onboardingCompletedAt,
    disabledAt: input.disabledAt,
    lastSyncedAt: input.lastSyncedAt,
    cardPaymentsCapability: readStripeCapabilityFromMetadata(
      input.providerMetadata,
      "card_payments",
    ),
    hasOutstandingStripeRequirements:
      stripeAccountHasOutstandingRequirementsFromMetadata(input.providerMetadata),
  };
}

export function getCardPaymentsDisplayStatus(
  account: StripePaymentSettingsSummary,
): CardPaymentsDisplayStatus {
  if (account.cardPaymentsCapability === "active") {
    return "active";
  }

  if (account.cardPaymentsCapability === "pending") {
    return "pending";
  }

  if (account.hasOutstandingStripeRequirements) {
    return "needs_info";
  }

  return "not_requested";
}

export function getCardPaymentsPendingGuidance(
  account: StripePaymentSettingsSummary | null,
): string | null {
  if (!account) {
    return null;
  }

  const displayStatus = getCardPaymentsDisplayStatus(account);

  if (
    displayStatus === "pending" ||
    displayStatus === "not_requested" ||
    displayStatus === "needs_info"
  ) {
    return "Continue Stripe setup to activate card payments.";
  }

  return null;
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
    account.cardPaymentsCapability === "active" &&
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

  if (account.cardPaymentsCapability !== "active") {
    return "Stripe card payments must be active before online payments can be enabled.";
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

  const cardPaymentsStatus = getCardPaymentsDisplayStatus(account);

  if (cardPaymentsStatus === "pending") {
    return "Card payments pending";
  }

  if (cardPaymentsStatus === "not_requested") {
    return "Card payments not requested";
  }

  if (cardPaymentsStatus === "needs_info") {
    return "Needs more information";
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

  const cardPaymentsStatus = getCardPaymentsDisplayStatus(account);

  if (cardPaymentsStatus === "pending") {
    return "Card payments are pending with Stripe. Continue Stripe setup to finish activation.";
  }

  if (cardPaymentsStatus === "not_requested") {
    return "Card payments have not been requested for this Stripe account yet. Refresh Stripe status or continue setup.";
  }

  if (cardPaymentsStatus === "needs_info") {
    return "Stripe still needs more information before card payments can be activated.";
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
  cardPaymentsCapability: StripeCapabilityStatus | null;
}): string {
  if (
    input.status === "active" &&
    input.cardPaymentsCapability === "active"
  ) {
    return "Stripe account is active. You can enable online payments.";
  }

  const details: string[] = [];

  if (input.cardPaymentsCapability === "pending") {
    details.push("card payments are pending");
  } else if (input.cardPaymentsCapability !== "active") {
    details.push("card payments are not active");
  }

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
