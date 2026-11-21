import { AFFILIATE_PROGRAM, type AffiliateTier } from "@/shared/types/affiliates";

/**
 * The earnings example on /affiliates, worked out from the program's own
 * rules (AFFILIATE_PROGRAM, owner-approved 2026-11-13) and the plan prices
 * the page passes in from the billing catalog. Nothing here is a forecast:
 * it is the arithmetic of "if these shops pay for their full months".
 *
 * The rules it applies, as the page states them:
 * - commission is a share of the subscription money a referred shop pays,
 *   for AFFILIATE_PROGRAM.commissionMonths months from its first payment
 *   (the free first month is not a payment, so it earns nothing);
 * - the share is the tier reached by the number of paying shops
 *   (tiers[].payingCustomers), and a raise covers every shop still inside
 *   its months;
 * - a shop that pays for a year up front earns the same share of that one
 *   payment.
 * Extra Pro users also count, but the example leaves them out rather than
 * guess at them. Sales tax and refunded payments never count.
 */

export type EarningsPlan = {
  readonly key: string;
  readonly label: string;
  readonly monthlyPriceUsd: number;
  readonly annualPriceUsd: number;
};

export type EarningsBilling = "monthly" | "annual";

export type EarningsResult = {
  readonly shops: number;
  readonly tier: AffiliateTier;
  /** What the shops pay in a month (monthly billing) or in their one yearly payment (annual billing), in cents. */
  readonly shopsPayCents: number;
  /** Commission per month while every shop is paying monthly; 0 for annual billing. */
  readonly perMonthCents: number;
  /** Commission over each shop's commission period. */
  readonly totalCents: number;
  /** The same total at the starting rate, for comparison. */
  readonly totalAtStartCents: number;
};

/** The tier a partner is on with this many paying shops. */
export function tierForPayingShops(shops: number): AffiliateTier {
  let reached: AffiliateTier = AFFILIATE_PROGRAM.tiers[0];
  for (const tier of AFFILIATE_PROGRAM.tiers) {
    if (shops >= tier.payingCustomers) reached = tier;
  }
  return reached;
}

/** One payment's commission in whole cents, rounded the way formatCommissionUsd rounds. */
function commissionCents(priceUsd: number, ratePercent: number): number {
  return Math.round(priceUsd * ratePercent);
}

export function calculateAffiliateEarnings(
  plans: readonly EarningsPlan[],
  counts: Readonly<Record<string, number>>,
  billing: EarningsBilling,
): EarningsResult {
  const months = AFFILIATE_PROGRAM.commissionMonths;
  const startRate = AFFILIATE_PROGRAM.tiers[0].ratePercent;
  let shops = 0;
  for (const plan of plans) shops += Math.max(0, Math.floor(counts[plan.key] ?? 0));
  const tier = tierForPayingShops(shops);

  let shopsPayCents = 0;
  let perMonthCents = 0;
  let totalCents = 0;
  let totalAtStartCents = 0;
  for (const plan of plans) {
    const count = Math.max(0, Math.floor(counts[plan.key] ?? 0));
    if (count === 0) continue;
    if (billing === "monthly") {
      shopsPayCents += count * plan.monthlyPriceUsd * 100;
      const each = commissionCents(plan.monthlyPriceUsd, tier.ratePercent);
      perMonthCents += count * each;
      totalCents += count * each * months;
      totalAtStartCents += count * commissionCents(plan.monthlyPriceUsd, startRate) * months;
    } else {
      shopsPayCents += count * plan.annualPriceUsd * 100;
      totalCents += count * commissionCents(plan.annualPriceUsd, tier.ratePercent);
      totalAtStartCents += count * commissionCents(plan.annualPriceUsd, startRate);
    }
  }
  return { shops, tier, shopsPayCents, perMonthCents, totalCents, totalAtStartCents };
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
