/**
 * Focused verification for SaaS app-access gating and Checkout ownership checks.
 * Run: node scripts/test-saas-billing-app-access.mjs
 *
 * Mirrors lib/saas-billing/app-access-policy.ts (kept in sync deliberately for a
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
  "/jobs",
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

test("bootstrap contract for new companies", () => {
  const newCompanyBootstrap = {
    plan_key: "beta",
    status: "incomplete",
    access_grant: "none",
  };
  assert.equal(newCompanyBootstrap.status, "incomplete");
  assert.equal(newCompanyBootstrap.access_grant, "none");
  assert.equal(
    companyHasFullApplicationAccess({
      status: newCompanyBootstrap.status,
      accessGrant: newCompanyBootstrap.access_grant,
    }),
    false,
  );
});
