/**
 * Pure rules for the card-free trial.
 *
 * No Next.js, no server-only imports: scripts/test-saas-billing-app-access.mjs
 * mirrors these functions and keeps them honest, so keep them dependency-free.
 *
 * ============ THE PROBLEM THESE SOLVE ============
 * A trial that starts without a card (migration 199) has no Stripe
 * subscription behind it. Stripe therefore never tells us the trial ended —
 * the row says `trialing` until something local decides otherwise. These
 * functions are that decision, and they are the only place it is made.
 */

import type { SaasSubscriptionStatus } from "@/lib/saas-billing/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How many days before the end of a card-free trial the product starts
 * asking for a payment method: the shell banner turns into a prompt, the
 * dashboard card gets a call to action, and the first reminder email goes
 * out. 14 - 4 = day 10, per the owner's decision.
 */
export const TRIAL_PAYMENT_PROMPT_DAYS_BEFORE_END = 4;

/**
 * The reminder emails, keyed for idempotency (saas_trial_reminders). Each is
 * due once the trial has at most `daysBeforeEnd` days left.
 */
export const TRIAL_PAYMENT_REMINDERS = [
  { key: "trial_ending_4d", daysBeforeEnd: 4 },
  { key: "trial_ending_1d", daysBeforeEnd: 1 },
] as const;

export type TrialPaymentReminderKey =
  (typeof TRIAL_PAYMENT_REMINDERS)[number]["key"];

/**
 * Stripe refuses a `trial_end` less than 48 hours out. An hour of margin so a
 * Checkout opened at 47h59m does not fail on the clock skew between here and
 * Stripe.
 */
export const STRIPE_MIN_TRIAL_END_MS = 49 * 60 * 60 * 1000;

export type EffectiveSubscriptionStatusInput = {
  status: SaasSubscriptionStatus | null;
  trialEndsAt: string | null;
  stripeSubscriptionId: string | null;
};

function parseMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * The status the policy and the app-shell gate should reason about.
 *
 * A `trialing` row with no Stripe subscription whose trial_ends_at has passed
 * is reported as `incomplete`: the state a company is in before it has ever
 * paid. The policy maps it to BLOCKED and the gate sends it to
 * /activate-subscription, which is exactly the behaviour those states already
 * have — nothing new to get wrong. Every other row is returned as stored:
 * once Stripe owns a subscription, Stripe's status is the truth, and a Stripe
 * trial that ends arrives here as `active` or `past_due` through the webhook.
 */
export function resolveEffectiveSubscriptionStatus(
  input: EffectiveSubscriptionStatusInput,
  nowMs: number,
): SaasSubscriptionStatus | null {
  if (input.status !== "trialing" || input.stripeSubscriptionId) {
    return input.status;
  }

  const endMs = parseMs(input.trialEndsAt);

  // A card-free trial with no end date cannot expire on its own. That row
  // shape is not produced by migration 199; it is left alone rather than
  // guessed at.
  if (endMs == null) {
    return input.status;
  }

  return endMs <= nowMs ? "incomplete" : "trialing";
}

/**
 * True while a card-free trial is inside its payment-prompt window: still
 * running, no Stripe subscription, and at most
 * TRIAL_PAYMENT_PROMPT_DAYS_BEFORE_END days left.
 */
export function isTrialEndingSoon(
  input: EffectiveSubscriptionStatusInput,
  nowMs: number,
): boolean {
  if (resolveEffectiveSubscriptionStatus(input, nowMs) !== "trialing") {
    return false;
  }

  if (input.stripeSubscriptionId) {
    return false;
  }

  const endMs = parseMs(input.trialEndsAt);
  if (endMs == null) return false;

  return endMs - nowMs <= TRIAL_PAYMENT_PROMPT_DAYS_BEFORE_END * DAY_MS;
}

/** Whole days left in a trial, rounded up; 0 once it has ended. */
export function trialDaysRemaining(
  trialEndsAt: string | null,
  nowMs: number,
): number | null {
  const endMs = parseMs(trialEndsAt);
  if (endMs == null) return null;
  return Math.max(0, Math.ceil((endMs - nowMs) / DAY_MS));
}

export type CheckoutTrialParams =
  | { trial_end: number }
  | { trial_period_days: number }
  | Record<string, never>;

/**
 * What Checkout tells Stripe about the trial when the card is finally added.
 *
 * - A running card-free trial keeps its own end date: Stripe's trial ends
 *   when ours would have, so the first charge lands on the day the customer
 *   was told. (`trial_end` must be at least 48h out; inside that window the
 *   trial is simply over and billing starts at Checkout.)
 * - A row that has ever had a trial end date gets no second trial, whatever
 *   its status: an expired card-free trial converts to a paying plan, it does
 *   not restart.
 * - A row with no trial history (companies bootstrapped before migration 199
 *   that never reached Checkout) keeps the original card-required trial, so
 *   nobody who was promised 14 days is charged on day one.
 */
export function resolveCheckoutTrialParams(
  input: { trialEndsAt: string | null } | null,
  nowMs: number,
  defaultTrialDays: number,
): CheckoutTrialParams {
  if (!input || !input.trialEndsAt) {
    return { trial_period_days: defaultTrialDays };
  }

  const endMs = parseMs(input.trialEndsAt);
  if (endMs == null) {
    return {};
  }

  if (endMs - nowMs >= STRIPE_MIN_TRIAL_END_MS) {
    return { trial_end: Math.floor(endMs / 1000) };
  }

  return {};
}
