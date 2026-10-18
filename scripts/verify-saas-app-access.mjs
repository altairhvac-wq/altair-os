/**
 * The app-shell billing gate, tested against the SHIPPED policy and gate
 * functions rather than a copy of them.
 *
 * ===================== H7 — THE GRACE PERIOD WAS DEAD CODE =====================
 * `evaluateBillingPolicy` computed a GRACE state for seven days after a failed
 * card payment, and the webhook wrote `grace_period_ends_at`, but the shell
 * gate only looked at the raw status. `past_due` failed closed, so the first
 * declined card redirected the office AND every technician to the activation
 * page mid-dispatch.
 *
 * What must hold now:
 *   trialing            → shell open
 *   active              → shell open
 *   past_due, in grace  → shell open   (the fix)
 *   past_due, expired   → redirected   (nothing below the layout enforces
 *                                       read-only yet — audit M16 — so the
 *                                       shell still fails closed here)
 *   unpaid / paused     → redirected   (same reason)
 *   canceled            → redirected
 *   incomplete / none   → redirected
 *   beta_comped         → shell open regardless of status
 *
 * Offline, pure, side-effect free.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-saas-app-access.mjs
 */

import assert from "node:assert/strict";
import test from "node:test";

import { evaluateBillingPolicy } from "../lib/saas-billing/policy.ts";
import {
  billingPolicyAllowsAppShell,
  companyHasFullApplicationAccess,
} from "../lib/saas-billing/app-access-policy.ts";

const NOW = Date.parse("2026-10-18T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (offsetDays) => new Date(NOW + offsetDays * DAY_MS).toISOString();

function subscription(overrides) {
  return {
    status: "active",
    accessGrant: "none",
    trialEndsAt: null,
    graceEndsAt: null,
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

/** The exact call chain the layouts make: policy → gate. */
function shellOpen(sub) {
  return billingPolicyAllowsAppShell(evaluateBillingPolicy(sub, NOW));
}

test("trialing opens the shell", () => {
  const decision = evaluateBillingPolicy(
    subscription({ status: "trialing", trialEndsAt: iso(10) }),
    NOW,
  );
  assert.equal(decision.state, "TRIAL");
  assert.equal(billingPolicyAllowsAppShell(decision), true);
});

test("active opens the shell, including when scheduled to cancel", () => {
  assert.equal(shellOpen(subscription({ status: "active" })), true);
  assert.equal(
    shellOpen(subscription({ status: "active", cancelAtPeriodEnd: true })),
    true,
  );
});

test("past_due inside the grace window keeps the shell open (H7)", () => {
  const decision = evaluateBillingPolicy(
    subscription({ status: "past_due", graceEndsAt: iso(5) }),
    NOW,
  );
  assert.equal(decision.state, "GRACE");
  assert.equal(decision.canUseOperationalFeatures, true);
  assert.equal(decision.canMutateOperationalData, true);
  assert.equal(billingPolicyAllowsAppShell(decision), true);
});

test("past_due one second before grace ends is still open", () => {
  const graceEndsAt = new Date(NOW + 1000).toISOString();
  assert.equal(
    shellOpen(subscription({ status: "past_due", graceEndsAt })),
    true,
  );
});

test("past_due after the grace window is redirected", () => {
  const decision = evaluateBillingPolicy(
    subscription({ status: "past_due", graceEndsAt: iso(-1) }),
    NOW,
  );
  assert.equal(decision.state, "LIMITED");
  assert.equal(decision.canMutateOperationalData, false);
  assert.equal(billingPolicyAllowsAppShell(decision), false);
});

test("past_due with no grace stamp at all is redirected, never open-ended", () => {
  // The webhook always stamps grace on the first past_due; if the stamp is
  // missing the policy must not read that as "grace forever".
  const decision = evaluateBillingPolicy(
    subscription({ status: "past_due", graceEndsAt: null }),
    NOW,
  );
  assert.equal(decision.state, "LIMITED");
  assert.equal(billingPolicyAllowsAppShell(decision), false);
});

test("unpaid and paused are redirected until mutations are gated (M16)", () => {
  for (const status of ["unpaid", "paused"]) {
    const decision = evaluateBillingPolicy(subscription({ status }), NOW);
    assert.equal(decision.state, "READ_ONLY", status);
    assert.equal(decision.canUseOperationalFeatures, true, status);
    assert.equal(billingPolicyAllowsAppShell(decision), false, status);
  }
});

test("canceled, incomplete and incomplete_expired are redirected", () => {
  for (const status of ["canceled", "incomplete", "incomplete_expired"]) {
    const decision = evaluateBillingPolicy(subscription({ status }), NOW);
    assert.equal(decision.state, "BLOCKED", status);
    assert.equal(billingPolicyAllowsAppShell(decision), false, status);
  }
});

test("a company with no subscription row is redirected", () => {
  assert.equal(billingPolicyAllowsAppShell(evaluateBillingPolicy(null, NOW)), false);
});

test("beta_comped opens the shell whatever the status says", () => {
  for (const status of ["active", "incomplete", "canceled", null]) {
    assert.equal(
      shellOpen(subscription({ status, accessGrant: "beta_comped" })),
      true,
      String(status),
    );
  }
});

test("the gate requires both flags, not just operational access", () => {
  assert.equal(
    billingPolicyAllowsAppShell({
      canUseOperationalFeatures: true,
      canMutateOperationalData: false,
    }),
    false,
  );
  assert.equal(
    billingPolicyAllowsAppShell({
      canUseOperationalFeatures: false,
      canMutateOperationalData: true,
    }),
    false,
  );
});

test("the status-only check still exists for status-only callers and still fails closed on past_due", () => {
  assert.equal(
    companyHasFullApplicationAccess({ status: "past_due", accessGrant: "none" }),
    false,
  );
  assert.equal(
    companyHasFullApplicationAccess({ status: "active", accessGrant: "none" }),
    true,
  );
});
