"use client";

import { useId, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { dirCard, dirEyebrow, dirFocus } from "@/shared/components/directory/directory-styles";
import {
  calculateAffiliateEarnings,
  formatCents,
  type EarningsBilling,
  type EarningsPlan,
} from "@/shared/lib/site/affiliate-earnings";
import { AFFILIATE_PROGRAM } from "@/shared/types/affiliates";

const MAX_SHOPS_PER_PLAN = 50;

/**
 * "Work out an example" on /affiliates: how many shops on which plan, billed
 * monthly or yearly, and what that pays at the tier those shops reach. The
 * math is shared/lib/site/affiliate-earnings.ts; the plan prices come from
 * the billing catalog through the page. Nothing is stored or sent.
 */
export function AffiliateEarningsCalculator({ plans }: { readonly plans: readonly EarningsPlan[] }) {
  const ids = useId();
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(plans.map((plan) => [plan.key, plan.key === "growth" ? 1 : 0])),
  );
  const [billing, setBilling] = useState<EarningsBilling>("monthly");
  const result = useMemo(() => calculateAffiliateEarnings(plans, counts, billing), [plans, counts, billing]);
  const months = AFFILIATE_PROGRAM.commissionMonths;
  const startTier = AFFILIATE_PROGRAM.tiers[0];
  const nextTier = AFFILIATE_PROGRAM.tiers.find((tier) => tier.payingCustomers > result.shops);

  function setCount(key: string, value: number) {
    const next = Number.isFinite(value) ? Math.min(MAX_SHOPS_PER_PLAN, Math.max(0, Math.floor(value))) : 0;
    setCounts((current) => ({ ...current, [key]: next }));
  }

  const stepper =
    `flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 transition-colors hover:border-[#A4823A] hover:text-[#0A0A0A] disabled:opacity-40 ${dirFocus}`;

  return (
    <div className={`overflow-hidden ${dirCard}`}>
      <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {/* ---------- inputs ---------- */}
        <div className="p-5 sm:p-6">
          <p className={dirEyebrow}>Work out an example</p>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            How many shops you send, and on which plan. Prices are the ones on the pricing page.
          </p>
          <ul className="mt-5 space-y-3">
            {plans.map((plan) => {
              const count = counts[plan.key] ?? 0;
              const inputId = `${ids}-${plan.key}`;
              return (
                <li key={plan.key} className="flex items-center justify-between gap-3">
                  <label htmlFor={inputId} className="min-w-0">
                    <span className="block text-[15px] font-semibold text-[#0A0A0A]">{plan.label}</span>
                    <span className="block text-xs text-stone-500">
                      {billing === "monthly" ? `$${plan.monthlyPriceUsd} a month` : `$${plan.annualPriceUsd.toLocaleString("en-US")} a year`}
                    </span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className={stepper}
                      onClick={() => setCount(plan.key, count - 1)}
                      disabled={count <= 0}
                      aria-label={`One fewer shop on ${plan.label}`}
                    >
                      <Minus aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <input
                      id={inputId}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={MAX_SHOPS_PER_PLAN}
                      value={count}
                      onChange={(event) => setCount(plan.key, Number(event.target.value))}
                      className={`h-11 w-14 rounded-lg border border-stone-300 bg-white text-center text-base font-semibold tabular-nums text-stone-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${dirFocus}`}
                    />
                    <button
                      type="button"
                      className={stepper}
                      onClick={() => setCount(plan.key, count + 1)}
                      disabled={count >= MAX_SHOPS_PER_PLAN}
                      aria-label={`One more shop on ${plan.label}`}
                    >
                      <Plus aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <fieldset className="mt-6">
            <legend className="text-sm font-medium text-stone-800">How they pay</legend>
            <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
              {(
                [
                  { value: "monthly", label: "Monthly" },
                  { value: "annual", label: "A year up front" },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  className={`flex min-h-10 cursor-pointer items-center justify-center rounded-lg px-3 text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#C2A05A]/60 ${
                    billing === option.value ? "bg-white text-[#0A0A0A] shadow-sm" : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <input
                    type="radio"
                    name={`${ids}-billing`}
                    value={option.value}
                    checked={billing === option.value}
                    onChange={() => setBilling(option.value)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {/* ---------- result ---------- */}
        <div className="border-t border-stone-200 bg-[#FBF8F1] p-5 sm:p-6 md:border-l md:border-t-0" aria-live="polite">
          {result.shops === 0 ? (
            <div className="flex h-full flex-col justify-center">
              <p className="text-base font-semibold text-[#0A0A0A]">Add a shop to see the example.</p>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                Use the + buttons, or type a number for each plan.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-stone-600">
                {result.shops} paying {result.shops === 1 ? "shop" : "shops"} puts you on
              </p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tracking-tight text-[#0A0A0A]">{result.tier.ratePercent}%</span>
                <span className="rounded-full border border-[#C2A05A]/40 bg-white px-2.5 py-0.5 text-xs font-semibold text-[#5c4614]">
                  {result.tier.label}
                </span>
              </p>
              <dl className="mt-5 space-y-3">
                {billing === "monthly" ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">Each month</dt>
                    <dd className="text-2xl font-semibold tabular-nums text-[#0A0A0A]">{formatCents(result.perMonthCents)}</dd>
                    <dd className="text-xs text-stone-500">
                      {result.tier.ratePercent}% of the {formatCents(result.shopsPayCents)} they pay a month
                    </dd>
                  </div>
                ) : (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">Their yearly payments</dt>
                    <dd className="text-2xl font-semibold tabular-nums text-[#0A0A0A]">{formatCents(result.shopsPayCents)}</dd>
                    <dd className="text-xs text-stone-500">One payment per shop, each earning you {result.tier.ratePercent}%</dd>
                  </div>
                )}
                <div className="rounded-xl border border-[#C2A05A]/40 bg-white px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[#77591B]">
                    Over their {months} months
                  </dt>
                  <dd className="text-3xl font-semibold tabular-nums text-[#0A0A0A]">{formatCents(result.totalCents)}</dd>
                  {result.tier.ratePercent !== startTier.ratePercent ? (
                    <dd className="text-xs text-stone-500">
                      {formatCents(result.totalAtStartCents)} at the starting {startTier.ratePercent}%
                    </dd>
                  ) : null}
                </div>
              </dl>
              {nextTier ? (
                <p className="mt-4 text-xs leading-relaxed text-stone-600">
                  {nextTier.payingCustomers - result.shops} more paying{" "}
                  {nextTier.payingCustomers - result.shops === 1 ? "shop" : "shops"} would move you to {nextTier.label} (
                  {nextTier.ratePercent}%), for every shop still inside its {months} months.
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
      <p className="border-t border-stone-200 px-5 py-3 text-xs leading-relaxed text-stone-500 sm:px-6">
        An example, not a promise: it assumes every shop stays and pays for all {months} months, and that they are all
        paying customers already, so the rate applies from the start. In practice you begin at {startTier.ratePercent}%
        and move up the month after you reach each step. The free first month, sales tax and refunds earn nothing; extra
        Pro users count but are left out here.
      </p>
    </div>
  );
}
