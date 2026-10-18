/**
 * Pure app-shell entitlement rules for Altair SaaS billing.
 * Safe to unit-test without Next.js / server-only imports.
 */

import type { BillingPolicyDecision } from "@/lib/saas-billing/policy";
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
 * Status-only entitlement check.
 *
 * Retained for callers that only have a status in hand (Checkout reconcile,
 * the activation page). The app shells no longer gate on this: it has no
 * notion of the grace window, so a single failed card payment moved a company
 * from "active" to "past_due" and locked office and technicians out at once
 * (launch audit H7). The shell gate is {@link billingPolicyAllowsAppShell}.
 */
export function companyHasFullApplicationAccess(
  input: FullApplicationAccessInput,
): boolean {
  if (input.accessGrant === "beta_comped" || input.isComped === true) {
    return true;
  }

  return input.status === "trialing" || input.status === "active";
}

export type AppShellBillingDecision = Pick<
  BillingPolicyDecision,
  "canUseOperationalFeatures" | "canMutateOperationalData"
>;

/**
 * The one rule the authenticated app shells gate on, fed by
 * `evaluateBillingPolicy` (via the resolver) rather than by a raw status.
 *
 * Allowed: ACTIVE, TRIAL and GRACE — a `past_due` subscription keeps full
 * access until `grace_period_ends_at`, which the webhook writes on the first
 * payment failure and the policy already honoured but nothing read.
 *
 * Still redirected to activation: LIMITED, READ_ONLY and BLOCKED. The policy
 * describes LIMITED and READ_ONLY as "operational features, no mutations",
 * but nothing below the layout enforces that today (Server Actions are not
 * billing-gated — audit M16). Until they are, letting those states through the
 * shell would hand a non-paying company unrestricted writes, so the shell
 * requires BOTH flags and fails closed for them.
 */
export function billingPolicyAllowsAppShell(
  decision: AppShellBillingDecision,
): boolean {
  return (
    decision.canUseOperationalFeatures === true &&
    decision.canMutateOperationalData === true
  );
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
