import "server-only";

import type Stripe from "stripe";
import type { CompanyPaymentAccountStatus } from "./types";

export type StripeAccountSyncFields = {
  status: CompanyPaymentAccountStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingCompletedAt: string | null;
  providerMetadata: Record<string, unknown>;
};

function stripeAccountRequirements(account: Stripe.Account) {
  return account.requirements ?? null;
}

function isStripeAccountUnavailable(account: Stripe.Account): boolean {
  const deleted = (account as Stripe.Account & { deleted?: boolean }).deleted;
  return deleted === true;
}

export function isStripeAccountFullyOnboarded(account: Stripe.Account): boolean {
  const requirements = stripeAccountRequirements(account);
  const currentlyDue = requirements?.currently_due ?? [];

  return (
    account.charges_enabled === true &&
    account.payouts_enabled === true &&
    currentlyDue.length === 0
  );
}

export function mapStripeAccountToCompanyPaymentStatus(
  account: Stripe.Account,
  existingDisabledAt: string | null,
): CompanyPaymentAccountStatus {
  if (existingDisabledAt !== null) {
    return "disabled";
  }

  if (isStripeAccountUnavailable(account)) {
    return "disabled";
  }

  const requirements = stripeAccountRequirements(account);
  const currentlyDue = requirements?.currently_due ?? [];
  const pastDue = requirements?.past_due ?? [];
  const disabledReason = requirements?.disabled_reason ?? null;

  if (disabledReason || currentlyDue.length > 0 || pastDue.length > 0) {
    return "restricted";
  }

  if (account.charges_enabled === true && account.payouts_enabled === true) {
    return "active";
  }

  return "pending";
}

export function buildStripeAccountProviderMetadata(
  account: Stripe.Account,
): Record<string, unknown> {
  const requirements = stripeAccountRequirements(account);

  return {
    type: account.type ?? null,
    country: account.country ?? null,
    default_currency: account.default_currency ?? null,
    details_submitted: account.details_submitted ?? false,
    requirements: {
      currently_due_count: requirements?.currently_due?.length ?? 0,
      past_due_count: requirements?.past_due?.length ?? 0,
      disabled_reason: requirements?.disabled_reason ?? null,
    },
  };
}

export function deriveStripeAccountSyncFields(
  account: Stripe.Account,
  existing: {
    disabledAt: string | null;
    onboardingCompletedAt: string | null;
  },
): StripeAccountSyncFields {
  const nowIso = new Date().toISOString();
  const fullyOnboarded = isStripeAccountFullyOnboarded(account);

  return {
    status: mapStripeAccountToCompanyPaymentStatus(account, existing.disabledAt),
    chargesEnabled: account.charges_enabled === true,
    payoutsEnabled: account.payouts_enabled === true,
    onboardingCompletedAt:
      existing.onboardingCompletedAt ?? (fullyOnboarded ? nowIso : null),
    providerMetadata: buildStripeAccountProviderMetadata(account),
  };
}
