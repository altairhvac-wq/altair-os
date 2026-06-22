import type { CompanyPaymentAccountStatus } from "@/lib/payments/types";

/** Read-only Stripe account snapshot for settings UI (no secrets or metadata). */
export type StripePaymentSettingsSummary = {
  provider: "stripe";
  status: CompanyPaymentAccountStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onlinePaymentsEnabled: boolean;
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

/** Display-only notice when returning from Stripe Connect onboarding. */
export type PaymentSetupReturnNotice = "return" | "refresh";
