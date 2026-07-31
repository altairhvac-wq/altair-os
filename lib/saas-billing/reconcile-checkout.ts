import "server-only";

import {
  assertCheckoutSessionOwnedByCompany,
  companyHasFullApplicationAccess,
} from "@/lib/saas-billing/app-access-policy";
import { isSaasCheckoutPlanKey, isSaasStripeLivemode } from "@/lib/saas-billing/constants";
import {
  findBillingAccountByCompanyId,
  getPlatformStripeClient,
} from "@/lib/saas-billing/customer";
import { resolveCompanyBillingAccess } from "@/lib/saas-billing/resolver";
import type { CompanyBillingAccess, SaasPlanKey } from "@/lib/saas-billing/types";
import { upsertCompanySubscriptionFromStripe } from "@/lib/saas-billing/webhook";
import { createServiceRoleClient } from "@/lib/supabase/service";

export type ReconcileCheckoutSessionResult =
  | {
      ok: true;
      access: CompanyBillingAccess;
      unlocked: boolean;
    }
  | {
      ok: false;
      error: string;
      access: CompanyBillingAccess | null;
    };

function extractCustomerId(
  customer: string | { id?: string } | null | undefined,
): string | null {
  if (typeof customer === "string") {
    return customer.trim() || null;
  }
  if (customer && typeof customer === "object" && typeof customer.id === "string") {
    return customer.id.trim() || null;
  }
  return null;
}

function extractSubscriptionId(
  subscription: string | { id?: string } | null | undefined,
): string | null {
  if (typeof subscription === "string") {
    return subscription.trim() || null;
  }
  if (
    subscription &&
    typeof subscription === "object" &&
    typeof subscription.id === "string"
  ) {
    return subscription.id.trim() || null;
  }
  return null;
}

function readPlanKey(metadata: Record<string, string> | null | undefined): SaasPlanKey | null {
  const raw = metadata?.plan_key?.trim();
  if (!raw) {
    return null;
  }
  return isSaasCheckoutPlanKey(raw) ? raw : null;
}

/**
 * Securely reconciles a specific Checkout Session into the local subscription mirror.
 * Never grants access from query params alone. Never reconciles an arbitrary latest subscription.
 */
export async function reconcileCheckoutSessionForCompany(input: {
  companyId: string;
  checkoutSessionId: string;
}): Promise<ReconcileCheckoutSessionResult> {
  const companyId = input.companyId.trim();
  const checkoutSessionId = input.checkoutSessionId.trim();

  if (!companyId) {
    return { ok: false, error: "Missing company.", access: null };
  }

  if (!checkoutSessionId || !checkoutSessionId.startsWith("cs_")) {
    console.info("[saas-billing] checkout reconcile rejected: invalid session id", {
      companyId,
    });
    return {
      ok: false,
      error: "A valid Checkout session is required to activate billing.",
      access: null,
    };
  }

  const supabase = createServiceRoleClient();
  let accessBefore: CompanyBillingAccess | null = null;

  try {
    accessBefore = await resolveCompanyBillingAccess(companyId, supabase);
  } catch (error) {
    console.error("[saas-billing] checkout reconcile pre-read failed:", {
      companyId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  if (
    accessBefore &&
    companyHasFullApplicationAccess({
      status: accessBefore.status,
      isComped: accessBefore.isComped,
    })
  ) {
    return { ok: true, access: accessBefore, unlocked: true };
  }

  let billingAccount;
  try {
    billingAccount = await findBillingAccountByCompanyId(companyId, supabase);
  } catch (error) {
    console.error("[saas-billing] checkout reconcile billing account failed:", {
      companyId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return {
      ok: false,
      error: "Unable to verify billing ownership right now.",
      access: accessBefore,
    };
  }

  const expectedLivemode = isSaasStripeLivemode();
  if (billingAccount && billingAccount.livemode !== expectedLivemode) {
    console.info("[saas-billing] checkout reconcile rejected: account livemode mismatch", {
      companyId,
    });
    return {
      ok: false,
      error: "Billing mode mismatch. Contact support.",
      access: accessBefore,
    };
  }

  const stripe = getPlatformStripeClient();

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  } catch (error) {
    console.info("[saas-billing] checkout reconcile session retrieve failed", {
      companyId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return {
      ok: false,
      error: "We couldn't verify that Checkout session. Try again or restart checkout.",
      access: accessBefore,
    };
  }

  const ownership = assertCheckoutSessionOwnedByCompany({
    expectedCompanyId: companyId,
    expectedStripeCustomerId: billingAccount?.stripe_customer_id ?? null,
    expectedLivemode,
    session: {
      id: session.id,
      mode: session.mode,
      livemode: session.livemode,
      client_reference_id: session.client_reference_id,
      customer: extractCustomerId(session.customer),
      subscription: extractSubscriptionId(session.subscription),
      metadata: session.metadata as Record<string, string> | null,
    },
  });

  if (!ownership.ok) {
    console.info("[saas-billing] checkout reconcile ownership rejected", {
      companyId,
      reason: ownership.reason,
    });
    return {
      ok: false,
      error: "This Checkout session does not belong to your company.",
      access: accessBefore,
    };
  }

  let subscription;
  try {
    subscription = await stripe.subscriptions.retrieve(ownership.subscriptionId);
  } catch (error) {
    console.error("[saas-billing] checkout reconcile subscription retrieve failed:", {
      companyId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return {
      ok: false,
      error: "We couldn't load the subscription from Stripe yet. Refresh in a moment.",
      access: accessBefore,
    };
  }

  if (subscription.livemode !== expectedLivemode) {
    console.info("[saas-billing] checkout reconcile rejected: subscription livemode mismatch", {
      companyId,
    });
    return {
      ok: false,
      error: "Billing mode mismatch. Contact support.",
      access: accessBefore,
    };
  }

  const upsert = await upsertCompanySubscriptionFromStripe(supabase, {
    companyId,
    billingAccountId: billingAccount?.id ?? null,
    subscription,
    planKey: readPlanKey(session.metadata as Record<string, string> | null),
    clearGrace: true,
  });

  if (!upsert.ok) {
    return {
      ok: false,
      error: "We verified Checkout but could not update local billing state.",
      access: accessBefore,
    };
  }

  try {
    const access = await resolveCompanyBillingAccess(companyId, supabase);
    const unlocked = companyHasFullApplicationAccess({
      status: access.status,
      isComped: access.isComped,
    });

    console.info("[saas-billing] checkout reconcile completed", {
      companyId,
      status: access.status,
      unlocked,
    });

    return { ok: true, access, unlocked };
  } catch (error) {
    console.error("[saas-billing] checkout reconcile post-read failed:", {
      companyId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return {
      ok: false,
      error: "Subscription was updated but status could not be reloaded.",
      access: accessBefore,
    };
  }
}
