/**
 * Pure app-shell entitlement rules for Altair SaaS billing.
 * Safe to unit-test without Next.js / server-only imports.
 */

import type {
  SaasAccessGrant,
  SaasSubscriptionStatus,
} from "@/lib/saas-billing/types";

export const SUBSCRIPTION_ACTIVATION_PATH = "/activate-subscription";

export type FullApplicationAccessInput = {
  status: SaasSubscriptionStatus | null;
  accessGrant?: SaasAccessGrant | null;
  isComped?: boolean;
};

/**
 * Full application access is allowed only when:
 * - subscription status is "trialing", or
 * - subscription status is "active", or
 * - access_grant is "beta_comped"
 *
 * Null rows and every other status fail closed.
 */
export function companyHasFullApplicationAccess(
  input: FullApplicationAccessInput,
): boolean {
  if (input.accessGrant === "beta_comped" || input.isComped === true) {
    return true;
  }

  return input.status === "trialing" || input.status === "active";
}

/**
 * Pure ownership checks for a Checkout Session before local mirror updates.
 * Callers still must retrieve the session from Stripe; this never trusts query params alone.
 */
export type CheckoutSessionOwnershipInput = {
  expectedCompanyId: string;
  expectedStripeCustomerId: string | null;
  expectedLivemode: boolean;
  session: {
    id: string;
    mode: string | null;
    livemode: boolean;
    client_reference_id?: string | null;
    customer?: string | null;
    subscription?: string | null;
    metadata?: Record<string, string> | null;
  };
};

export type CheckoutSessionOwnershipResult =
  | { ok: true; subscriptionId: string; stripeCustomerId: string }
  | { ok: false; reason: string };

export function assertCheckoutSessionOwnedByCompany(
  input: CheckoutSessionOwnershipInput,
): CheckoutSessionOwnershipResult {
  const { session, expectedCompanyId, expectedStripeCustomerId, expectedLivemode } =
    input;

  if (session.mode !== "subscription") {
    return { ok: false, reason: "checkout_mode_not_subscription" };
  }

  if (session.livemode !== expectedLivemode) {
    return { ok: false, reason: "livemode_mismatch" };
  }

  const purpose = session.metadata?.purpose?.trim() || null;
  if (purpose !== "saas_subscription") {
    return { ok: false, reason: "invalid_purpose" };
  }

  const metadataCompanyId = session.metadata?.company_id?.trim() || null;
  const clientReferenceId = session.client_reference_id?.trim() || null;

  if (metadataCompanyId && metadataCompanyId !== expectedCompanyId) {
    return { ok: false, reason: "company_metadata_mismatch" };
  }

  if (clientReferenceId && clientReferenceId !== expectedCompanyId) {
    return { ok: false, reason: "client_reference_mismatch" };
  }

  if (!metadataCompanyId && !clientReferenceId) {
    return { ok: false, reason: "missing_company_binding" };
  }

  const stripeCustomerId = session.customer?.trim() || null;
  if (!stripeCustomerId) {
    return { ok: false, reason: "missing_customer" };
  }

  if (!expectedStripeCustomerId) {
    return { ok: false, reason: "company_missing_billing_customer" };
  }

  if (stripeCustomerId !== expectedStripeCustomerId) {
    return { ok: false, reason: "customer_mismatch" };
  }

  const subscriptionId = session.subscription?.trim() || null;
  if (!subscriptionId) {
    return { ok: false, reason: "missing_subscription" };
  }

  return { ok: true, subscriptionId, stripeCustomerId };
}
