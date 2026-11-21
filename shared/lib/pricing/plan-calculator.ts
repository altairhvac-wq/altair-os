import {
  SAAS_TRIAL_ACCOUNT_ALLOWANCE,
  SAAS_TRIAL_CONFIG,
  listPublicSaasCatalogPlans,
} from "@/lib/saas-billing/catalog";
import type { SaasBillingInterval, SaasCatalogPlan, SaasPublicPlanKey } from "@/lib/saas-billing/types";

/**
 * The pricing page's monthly-cost calculator and "which plan fits" answer.
 *
 * ============ EVERY NUMBER COMES FROM THE PLAN CATALOG ============
 * Prices, included users and the extra-user price are read from
 * lib/saas-billing/catalog.ts, the same catalog Checkout bills from. Nothing
 * here types a price. Change a price there and this changes with it.
 *
 * ============ WHAT THE CATALOG SAYS, AND HOW IT IS READ ============
 * - Starter includes 1 user, Growth up to 5, Pro 10. Starter and Growth have
 *   a hard cap (no extra users); Pro adds users at its extra-user price,
 *   which the catalog states per month ($15/month each).
 * - Annual billing is the catalog's annual price for the plan. An extra user
 *   on an annual Pro plan is counted at 12 times the monthly extra-user
 *   price (constants.ts: "an annual one adds the annual equivalent").
 *
 * Whole dollars in, whole dollars out: every catalog price is a whole dollar,
 * so sums and products here are exact. The one division (an annual total
 * shown per month) is rounded to cents for display only.
 *
 * No React; client-safe (the catalog imports types only). The verifier
 * scripts/verify-pricing-calculator.mjs drives these functions directly.
 */

export const MIN_USERS = 1;
export const MAX_USERS = 50;

export type PricedPlan = {
  readonly planKey: SaasPublicPlanKey;
  readonly label: string;
  readonly monthlyPriceUsd: number;
  readonly annualPriceUsd: number;
  readonly annualSavingsUsd: number;
  readonly annualSavingsMonths: number | null;
  readonly includedUsers: number;
  /** Per month; null when the plan has a hard cap. */
  readonly extraUserMonthlyUsd: number | null;
};

/** The three public plans, in display order, with their numbers checked present. */
export function pricedPlans(): PricedPlan[] {
  return listPublicSaasCatalogPlans().flatMap((plan: SaasCatalogPlan) => {
    if (
      plan.monthlyPriceUsd === null ||
      plan.annualPriceUsd === null ||
      plan.includedAccounts === null ||
      plan.planKey === "beta"
    ) {
      return [];
    }
    return [
      {
        planKey: plan.planKey,
        label: plan.label,
        monthlyPriceUsd: plan.monthlyPriceUsd,
        annualPriceUsd: plan.annualPriceUsd,
        annualSavingsUsd: plan.annualSavingsUsd ?? plan.monthlyPriceUsd * 12 - plan.annualPriceUsd,
        annualSavingsMonths: plan.annualSavingsMonths,
        includedUsers: plan.includedAccounts,
        extraUserMonthlyUsd: plan.additionalAccountPriceUsd,
      },
    ];
  });
}

export function clampUsers(raw: number): number {
  if (!Number.isFinite(raw)) return MIN_USERS;
  return Math.min(MAX_USERS, Math.max(MIN_USERS, Math.round(raw)));
}

export type PlanQuote = {
  readonly plan: PricedPlan;
  readonly users: number;
  readonly interval: SaasBillingInterval;
  /** False when the team is larger than a hard-capped plan allows. */
  readonly fits: boolean;
  readonly extraUsers: number;
  /** Extra users per month, in whole dollars. */
  readonly extraMonthlyUsd: number;
  /** The plan's own price for the interval (a month, or a year). */
  readonly basePriceUsd: number;
  /** What is billed each period: per month on monthly, per year on annual. */
  readonly billedUsd: number;
  /** Twelve months of cost on this interval. */
  readonly yearlyUsd: number;
  /** The year's cost spread over twelve months, in cents (display). */
  readonly perMonthCents: number;
  /** perMonth divided across the users, in cents (display). */
  readonly perUserMonthCents: number;
  /** Twelve months on monthly billing minus the annual total (0 on monthly). */
  readonly annualSavingsUsd: number;
};

export function quotePlan(plan: PricedPlan, rawUsers: number, interval: SaasBillingInterval): PlanQuote {
  const users = clampUsers(rawUsers);
  const over = Math.max(0, users - plan.includedUsers);
  const fits = over === 0 || plan.extraUserMonthlyUsd !== null;
  const extraUsers = fits ? over : 0;
  const extraMonthlyUsd = extraUsers * (plan.extraUserMonthlyUsd ?? 0);
  const monthlyBilled = plan.monthlyPriceUsd + extraMonthlyUsd;
  const monthlyYear = monthlyBilled * 12;
  const annualBilled = plan.annualPriceUsd + extraMonthlyUsd * 12;

  const basePriceUsd = interval === "monthly" ? plan.monthlyPriceUsd : plan.annualPriceUsd;
  const billedUsd = interval === "monthly" ? monthlyBilled : annualBilled;
  const yearlyUsd = interval === "monthly" ? monthlyYear : annualBilled;
  const perMonthCents = Math.round((yearlyUsd * 100) / 12);
  return {
    plan,
    users,
    interval,
    fits,
    extraUsers,
    extraMonthlyUsd,
    basePriceUsd,
    billedUsd,
    yearlyUsd,
    perMonthCents,
    perUserMonthCents: Math.round(perMonthCents / users),
    annualSavingsUsd: interval === "annual" ? monthlyYear - annualBilled : 0,
  };
}

export type PlanRecommendation = {
  /** The least expensive plan that fits the team today. */
  readonly recommended: PlanQuote;
  /** Every plan for this team, in display order. */
  readonly all: readonly PlanQuote[];
  /** Users the recommended plan still has room for before it changes. */
  readonly roomLeft: number | null;
  /** If hiring is planned: the plan that fits the team after it. */
  readonly afterHiring: PlanQuote | null;
};

/**
 * The least expensive plan for `users` people today, on `interval`, and what
 * changes if `hires` more people join. Ties go to the earlier (smaller) plan.
 */
export function recommendPlan(rawUsers: number, interval: SaasBillingInterval, hires = 0): PlanRecommendation {
  const plans = pricedPlans();
  const users = clampUsers(rawUsers);
  const all = plans.map((plan) => quotePlan(plan, users, interval));
  const cheapest = (quotes: readonly PlanQuote[]) =>
    quotes
      .filter((quote) => quote.fits)
      .reduce<PlanQuote | null>((lowest, quote) => (lowest === null || quote.yearlyUsd < lowest.yearlyUsd ? quote : lowest), null);

  const recommended = cheapest(all) ?? all[all.length - 1];
  const roomLeft =
    recommended.plan.extraUserMonthlyUsd === null ? Math.max(0, recommended.plan.includedUsers - users) : null;

  const future = clampUsers(users + Math.max(0, Math.round(hires)));
  const afterHiring =
    hires > 0 && future !== users ? cheapest(plans.map((plan) => quotePlan(plan, future, interval))) : null;

  return { recommended, all, roomLeft, afterHiring };
}

/** Cents to "$39" or "$38.83". */
export function formatUsdCents(cents: number): string {
  const whole = cents % 100 === 0;
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
}

export function formatUsd(dollars: number): string {
  return formatUsdCents(Math.round(dollars * 100));
}

/** Facts the pricing page repeats in prose, from the same catalog. */
export const PRICING_FACTS = {
  trialDays: SAAS_TRIAL_CONFIG.durationDays,
  trialNeedsCard: SAAS_TRIAL_CONFIG.requiresPaymentMethod,
  trialConvertsOnItsOwn: SAAS_TRIAL_CONFIG.convertsToPaidUnlessCanceled,
  trialUsers: SAAS_TRIAL_ACCOUNT_ALLOWANCE,
} as const;
