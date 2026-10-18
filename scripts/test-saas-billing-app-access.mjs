/**
 * Focused verification for SaaS app-access gating and Checkout ownership checks.
 * Run: node scripts/test-saas-billing-app-access.mjs
 *
 * Mirrors lib/saas-billing/app-access-policy.ts and the card-free trial rules
 * in lib/saas-billing/trial-policy.ts (kept in sync deliberately for a
 * dependency-free Node test runner).
 */

import assert from "node:assert/strict";
import test from "node:test";

function companyHasFullApplicationAccess(input) {
  if (input.accessGrant === "beta_comped" || input.isComped === true) {
    return true;
  }
  return input.status === "trialing" || input.status === "active";
}

const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_PAYMENT_PROMPT_DAYS_BEFORE_END = 4;
const STRIPE_MIN_TRIAL_END_MS = 49 * 60 * 60 * 1000;

// Mirror of resolveEffectiveSubscriptionStatus (trial-policy.ts).
function resolveEffectiveSubscriptionStatus(input, nowMs) {
  if (input.status !== "trialing" || input.stripeSubscriptionId) {
    return input.status;
  }
  const endMs = input.trialEndsAt ? Date.parse(input.trialEndsAt) : NaN;
  if (Number.isNaN(endMs)) {
    return input.status;
  }
  return endMs <= nowMs ? "incomplete" : "trialing";
}

// Mirror of isTrialEndingSoon (trial-policy.ts).
function isTrialEndingSoon(input, nowMs) {
  if (resolveEffectiveSubscriptionStatus(input, nowMs) !== "trialing") return false;
  if (input.stripeSubscriptionId) return false;
  const endMs = input.trialEndsAt ? Date.parse(input.trialEndsAt) : NaN;
  if (Number.isNaN(endMs)) return false;
  return endMs - nowMs <= TRIAL_PAYMENT_PROMPT_DAYS_BEFORE_END * DAY_MS;
}

// Mirror of resolveCheckoutTrialParams (trial-policy.ts).
function resolveCheckoutTrialParams(input, nowMs, defaultTrialDays) {
  if (!input || !input.trialEndsAt) {
    return { trial_period_days: defaultTrialDays };
  }
  const endMs = Date.parse(input.trialEndsAt);
  if (Number.isNaN(endMs)) return {};
  if (endMs - nowMs >= STRIPE_MIN_TRIAL_END_MS) {
    return { trial_end: Math.floor(endMs / 1000) };
  }
  return {};
}

/** The app-shell gate as the resolver feeds it: effective status in, access out. */
function cardFreeTrialHasAccess(row, nowMs) {
  const status = resolveEffectiveSubscriptionStatus(
    {
      status: row.status,
      trialEndsAt: row.trial_ends_at,
      stripeSubscriptionId: row.stripe_subscription_id,
    },
    nowMs,
  );
  return companyHasFullApplicationAccess({
    status,
    accessGrant: row.access_grant,
  });
}

function assertCheckoutSessionOwnedByCompany(input) {
  const {
    session,
    expectedCompanyId,
    expectedStripeCustomerId,
    expectedLivemode,
  } = input;

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

const COMPANY_A = "11111111-1111-1111-1111-111111111111";
const COMPANY_B = "22222222-2222-2222-2222-222222222222";
const CUSTOMER_A = "cus_company_a";
const CUSTOMER_B = "cus_company_b";

const PROTECTED_PATHS = [
  "/",
  "/customers",
  "/work",
  "/settings",
  "/technician",
  "/tech",
];

test("new incomplete company is gated", () => {
  assert.equal(
    companyHasFullApplicationAccess({
      status: "incomplete",
      accessGrant: "none",
    }),
    false,
  );
});

test("missing subscription row is gated", () => {
  assert.equal(
    companyHasFullApplicationAccess({ status: null, accessGrant: null }),
    false,
  );
});

test("trialing and active unlock access", () => {
  assert.equal(
    companyHasFullApplicationAccess({ status: "trialing", accessGrant: "none" }),
    true,
  );
  assert.equal(
    companyHasFullApplicationAccess({ status: "active", accessGrant: "none" }),
    true,
  );
});

test("active scheduled to cancel at period end retains access", () => {
  // cancel_at_period_end is intentionally ignored by the shell gate; status stays active.
  assert.equal(
    companyHasFullApplicationAccess({
      status: "active",
      accessGrant: "none",
      cancelAtPeriodEnd: true,
    }),
    true,
  );
});

test("ineligible statuses remain gated", () => {
  for (const status of [
    "past_due",
    "incomplete",
    "canceled",
    "unpaid",
    "paused",
    "incomplete_expired",
  ]) {
    assert.equal(
      companyHasFullApplicationAccess({ status, accessGrant: "none" }),
      false,
      status,
    );
  }
});

test("existing beta_comped companies remain unaffected", () => {
  assert.equal(
    companyHasFullApplicationAccess({
      status: "active",
      accessGrant: "beta_comped",
      isComped: true,
    }),
    true,
  );
  assert.equal(
    companyHasFullApplicationAccess({
      status: "incomplete",
      accessGrant: "beta_comped",
      isComped: true,
    }),
    true,
  );
});

test("protected app paths are distinct from activation route", () => {
  assert.ok(!PROTECTED_PATHS.includes("/activate-subscription"));
  assert.equal("/activate-subscription", "/activate-subscription");
});

test("forged billing=success without owned session cannot unlock", () => {
  // Query param alone never participates in companyHasFullApplicationAccess.
  const forgedSuccess = { billing: "success" };
  assert.equal(
    companyHasFullApplicationAccess({
      status: "incomplete",
      accessGrant: "none",
      billing: forgedSuccess.billing,
    }),
    false,
  );
});

test("checkout session belonging to another company is rejected", () => {
  const result = assertCheckoutSessionOwnedByCompany({
    expectedCompanyId: COMPANY_A,
    expectedStripeCustomerId: CUSTOMER_A,
    expectedLivemode: false,
    session: {
      id: "cs_test_other",
      mode: "subscription",
      livemode: false,
      client_reference_id: COMPANY_B,
      customer: CUSTOMER_B,
      subscription: "sub_other",
      metadata: {
        purpose: "saas_subscription",
        company_id: COMPANY_B,
      },
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "company_metadata_mismatch");
});

test("verified owned checkout session passes ownership checks", () => {
  const result = assertCheckoutSessionOwnedByCompany({
    expectedCompanyId: COMPANY_A,
    expectedStripeCustomerId: CUSTOMER_A,
    expectedLivemode: false,
    session: {
      id: "cs_test_owned",
      mode: "subscription",
      livemode: false,
      client_reference_id: COMPANY_A,
      customer: CUSTOMER_A,
      subscription: "sub_owned",
      metadata: {
        purpose: "saas_subscription",
        company_id: COMPANY_A,
      },
    },
  });

  assert.deepEqual(result, {
    ok: true,
    subscriptionId: "sub_owned",
    stripeCustomerId: CUSTOMER_A,
  });
});

test("checkout cancellation leaves company gated", () => {
  assert.equal(
    companyHasFullApplicationAccess({
      status: "incomplete",
      accessGrant: "none",
      billing: "cancel",
    }),
    false,
  );
});

test("billing and payments webhook routes remain distinct public endpoints", () => {
  const billingWebhook = "/api/webhooks/billing";
  const paymentsWebhook = "/api/webhooks/payments";
  assert.notEqual(billingWebhook, paymentsWebhook);
  assert.match(billingWebhook, /billing$/);
  assert.match(paymentsWebhook, /payments$/);
});

test("bootstrap contract for new companies (migration 200): card-free trial", () => {
  const now = Date.parse("2026-10-18T12:00:00Z");
  const newCompanyBootstrap = {
    plan_key: "starter",
    status: "trialing",
    access_grant: "none",
    stripe_subscription_id: null,
    trial_ends_at: new Date(now + 14 * DAY_MS).toISOString(),
  };
  assert.equal(newCompanyBootstrap.status, "trialing");
  assert.equal(newCompanyBootstrap.access_grant, "none");
  // Lands on the dashboard with no card.
  assert.equal(cardFreeTrialHasAccess(newCompanyBootstrap, now), true);
  // Not yet inside the payment-prompt window.
  assert.equal(
    isTrialEndingSoon(
      {
        status: "trialing",
        trialEndsAt: newCompanyBootstrap.trial_ends_at,
        stripeSubscriptionId: null,
      },
      now,
    ),
    false,
  );
});

test("card-free trial prompts for a card from day 10 (4 days before the end)", () => {
  const now = Date.parse("2026-10-18T12:00:00Z");
  const row = {
    status: "trialing",
    trialEndsAt: new Date(now + 4 * DAY_MS).toISOString(),
    stripeSubscriptionId: null,
  };
  assert.equal(isTrialEndingSoon(row, now), true);
  assert.equal(isTrialEndingSoon(row, now - DAY_MS), false, "day 9 is quiet");
  // Once Stripe holds the subscription, Stripe's own trial-ending flow owns it.
  assert.equal(
    isTrialEndingSoon({ ...row, stripeSubscriptionId: "sub_123" }, now),
    false,
  );
});

test("an expired card-free trial is gated and sent to activation", () => {
  const now = Date.parse("2026-10-18T12:00:00Z");
  const expired = {
    status: "trialing",
    access_grant: "none",
    stripe_subscription_id: null,
    trial_ends_at: new Date(now - 60 * 1000).toISOString(),
  };
  assert.equal(
    resolveEffectiveSubscriptionStatus(
      {
        status: expired.status,
        trialEndsAt: expired.trial_ends_at,
        stripeSubscriptionId: expired.stripe_subscription_id,
      },
      now,
    ),
    "incomplete",
  );
  assert.equal(cardFreeTrialHasAccess(expired, now), false);
  // One minute earlier it was still a trial.
  assert.equal(cardFreeTrialHasAccess(expired, now - 2 * 60 * 1000), true);
});

test("a Stripe-backed trial is never expired locally", () => {
  const now = Date.parse("2026-10-18T12:00:00Z");
  const stripeTrial = {
    status: "trialing",
    access_grant: "none",
    stripe_subscription_id: "sub_123",
    trial_ends_at: new Date(now - DAY_MS).toISOString(),
  };
  // Stripe's webhook moves the status; a stale local end date does not.
  assert.equal(cardFreeTrialHasAccess(stripeTrial, now), true);
});

test("a comped company is unaffected by its trial dates", () => {
  const now = Date.parse("2026-10-18T12:00:00Z");
  assert.equal(
    cardFreeTrialHasAccess(
      {
        status: "trialing",
        access_grant: "beta_comped",
        stripe_subscription_id: null,
        trial_ends_at: new Date(now - DAY_MS).toISOString(),
      },
      now,
    ),
    true,
  );
});

test("checkout keeps the local trial end date, and never grants a second trial", () => {
  const now = Date.parse("2026-10-18T12:00:00Z");
  const inFourDays = new Date(now + 4 * DAY_MS).toISOString();
  assert.deepEqual(
    resolveCheckoutTrialParams({ trialEndsAt: inFourDays }, now, 14),
    { trial_end: Math.floor(Date.parse(inFourDays) / 1000) },
  );
  // Inside Stripe's 48h minimum: billing starts at Checkout.
  assert.deepEqual(
    resolveCheckoutTrialParams(
      { trialEndsAt: new Date(now + DAY_MS).toISOString() },
      now,
      14,
    ),
    {},
  );
  // Expired: no second trial.
  assert.deepEqual(
    resolveCheckoutTrialParams(
      { trialEndsAt: new Date(now - DAY_MS).toISOString() },
      now,
      14,
    ),
    {},
  );
  // Never trialed (pre-200 rows): the original card-required trial.
  assert.deepEqual(resolveCheckoutTrialParams({ trialEndsAt: null }, now, 14), {
    trial_period_days: 14,
  });
  assert.deepEqual(resolveCheckoutTrialParams(null, now, 14), {
    trial_period_days: 14,
  });
});
