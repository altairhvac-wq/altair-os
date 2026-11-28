"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, Minus, Plus, RotateCcw, Users } from "lucide-react";
import { trackEngagement } from "@/shared/lib/analytics/client";
import { Segmented, focusRing } from "@/shared/components/resources/tools/ToolControls";
import {
  MAX_USERS,
  PRICING_FACTS,
  clampUsers,
  formatUsd,
  formatUsdCents,
  pricedPlans,
  quotePlan,
  recommendPlan,
  type PlanQuote,
} from "@/shared/lib/pricing/plan-calculator";
import type { SaasBillingInterval, SaasPublicPlanKey } from "@/lib/saas-billing/types";

/**
 * "Which plan fits you" and "what it costs", in one tool on /pricing.
 *
 * Three questions (who signs in, who you plan to hire, how you pay) give a
 * recommendation, and the same answers price every plan for that team. All
 * numbers come from shared/lib/pricing/plan-calculator.ts, which reads the
 * plan catalog Checkout bills from. Nothing typed here leaves the browser:
 * the only analytics event is "calculator used", with a fixed label.
 */

type Choice = "auto" | SaasPublicPlanKey;

const TOOL_ID = "pricing-plan-finder";

const DEFAULTS = { owners: 1, office: 1, techs: 2, hires: 0, interval: "monthly" as SaasBillingInterval, choice: "auto" as Choice };

function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  readonly label: string;
  readonly hint: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly onChange: (value: number) => void;
}) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, Math.round(next))));
  const button = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 transition-colors hover:border-[#C2A05A] hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-stone-900">{label}</p>
        <p className="text-xs leading-snug text-stone-500">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5" role="group" aria-label={label}>
        <button type="button" className={button} onClick={() => set(value - 1)} disabled={value <= min} aria-label={`One fewer: ${label}`}>
          <Minus aria-hidden="true" className="h-4 w-4" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          aria-label={label}
          value={String(value)}
          onChange={(event) => {
            const digits = event.target.value.replace(/[^0-9]/g, "");
            set(digits === "" ? min : Number.parseInt(digits.slice(0, 3), 10));
          }}
          className={`h-11 w-12 rounded-lg border border-stone-300 bg-white text-center text-[15px] font-semibold tabular-nums text-stone-900 ${focusRing}`}
        />
        <button type="button" className={button} onClick={() => set(value + 1)} disabled={value >= max} aria-label={`One more: ${label}`}>
          <Plus aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function QuestionHead({ n, title, text }: { readonly n: number; readonly title: string; readonly text?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-900 text-[11px] font-semibold text-[#e8d9ac]">
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-stone-900">{title}</p>
        {text ? <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{text}</p> : null}
      </div>
    </div>
  );
}

function usersLabel(n: number): string {
  return n === 1 ? "1 user" : `${n} users`;
}

function capLine(quote: PlanQuote): string {
  const { plan } = quote;
  if (plan.extraUserMonthlyUsd !== null) {
    return `${plan.includedUsers} users included, then ${formatUsd(plan.extraUserMonthlyUsd)}/month each`;
  }
  return plan.includedUsers === 1 ? "1 user" : `Up to ${plan.includedUsers} users`;
}

export function PlanFinder() {
  const [owners, setOwners] = useState(DEFAULTS.owners);
  const [office, setOffice] = useState(DEFAULTS.office);
  const [techs, setTechs] = useState(DEFAULTS.techs);
  const [hires, setHires] = useState(DEFAULTS.hires);
  const [interval, setBilling] = useState<SaasBillingInterval>(DEFAULTS.interval);
  const [choice, setChoice] = useState<Choice>(DEFAULTS.choice);

  const interacted = useRef(false);
  const mark = () => {
    interacted.current = true;
  };
  const users = clampUsers(owners + office + techs);
  useEffect(() => {
    if (interacted.current) trackEngagement("calculator_used", TOOL_ID);
  }, [users, hires, interval, choice]);

  const rec = useMemo(() => recommendPlan(users, interval, hires), [users, interval, hires]);
  const plans = useMemo(() => pricedPlans(), []);
  const chosenPlan = choice === "auto" ? rec.recommended.plan : plans.find((plan) => plan.planKey === choice) ?? rec.recommended.plan;
  const quote = choice === "auto" ? rec.recommended : quotePlan(chosenPlan, users, interval);
  const isRecommended = quote.plan.planKey === rec.recommended.plan.planKey;
  const monthlyEquivalent = quotePlan(quote.plan, users, "monthly");
  const atMax = owners + office + techs >= MAX_USERS;

  const reset = () => {
    setOwners(DEFAULTS.owners);
    setOffice(DEFAULTS.office);
    setTechs(DEFAULTS.techs);
    setHires(DEFAULTS.hires);
    setBilling(DEFAULTS.interval);
    setChoice(DEFAULTS.choice);
  };

  const maxFor = (others: number) => Math.max(0, MAX_USERS - others);

  return (
    <div
      id="plan-finder"
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_40px_100px_-60px_rgba(28,25,23,0.55)]"
      onPointerDownCapture={mark}
      onKeyDownCapture={mark}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d0f0c] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#a4823a]/15 text-[#e8d9ac] ring-1 ring-inset ring-[#c2a05a]/30">
            <Users aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#fff9ea]">Plan finder and cost calculator</p>
            <p className="text-xs text-[#a89c88]">The same prices checkout charges. Nothing you enter is sent anywhere.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={reset}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 text-[13px] font-semibold text-[#f3ebdd] transition-colors hover:border-white/30 hover:bg-white/[0.12] ${focusRing} focus-visible:ring-offset-[#0d0f0c]`}
        >
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
          Start over
        </button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* ---------- the questions ---------- */}
        <div className="border-b border-stone-200 p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <QuestionHead n={1} title="Who will sign in?" text="A user is anyone who signs in: owner, office or technician. Count yourself." />
          <div className="mt-2 divide-y divide-stone-100 pl-9">
            <Stepper label="Owners and managers" hint="At least one" value={owners} min={1} max={maxFor(office + techs)} onChange={setOwners} />
            <Stepper label="Office staff" hint="Dispatch, billing, customer calls" value={office} min={0} max={maxFor(owners + techs)} onChange={setOffice} />
            <Stepper label="Technicians" hint="Each uses the phone view" value={techs} min={0} max={maxFor(owners + office)} onChange={setTechs} />
          </div>
          {atMax ? (
            <p className="mt-2 pl-9 text-xs text-stone-500">
              This calculator stops at {MAX_USERS} users. Past that, Pro keeps adding users at the same price each.
            </p>
          ) : null}

          <div className="mt-6">
            <QuestionHead n={2} title="Hiring in the next 12 months?" text="So you know whether the plan still fits after you grow." />
            <div className="pl-9">
              <Stepper label="People you plan to add" hint="Office or field" value={hires} min={0} max={20} onChange={setHires} />
            </div>
          </div>

          <div className="mt-6">
            <QuestionHead
              n={3}
              title="How do you want to pay?"
              text={
                rec.recommended.plan.annualSavingsMonths
                  ? `Yearly billing costs ${12 - rec.recommended.plan.annualSavingsMonths} months' price for 12.`
                  : undefined
              }
            />
            <div className="mt-3 pl-9">
              <Segmented
                label="Billing"
                value={interval}
                onChange={setBilling}
                options={[
                  { value: "monthly", label: "Monthly" },
                  { value: "annual", label: "Yearly" },
                ]}
              />
            </div>
          </div>
        </div>

        {/* ---------- the answer ---------- */}
        <div className="bg-stone-50/70 p-5 sm:p-6" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#77591B]">
              {isRecommended ? `Fits ${usersLabel(users)} today` : "Plan you picked"}
            </p>
            <Segmented
              label="Plan"
              value={choice}
              onChange={setChoice}
              options={[
                { value: "auto", label: "Recommended" },
                ...plans.map((plan) => ({ value: plan.planKey, label: plan.label })),
              ]}
            />
          </div>

          {!quote.fits ? (
            <div role="alert" className="mt-4 rounded-xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
              <p className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                <AlertTriangle aria-hidden="true" className="h-4 w-4 text-amber-700" />
                {quote.plan.label} is for {capLine(quote).toLowerCase()}.
              </p>
              <p className="mt-1 text-sm text-stone-700">
                Your team is {usersLabel(users)}. {rec.recommended.plan.label} fits it for{" "}
                {interval === "monthly" ? `${formatUsd(rec.recommended.billedUsd)}/month` : `${formatUsd(rec.recommended.billedUsd)}/year`}.
              </p>
              <button
                type="button"
                onClick={() => setChoice("auto")}
                className={`mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 text-[13px] font-semibold text-white hover:bg-stone-800 ${focusRing}`}
              >
                Show {rec.recommended.plan.label}
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-2xl font-semibold tracking-tight text-stone-900">{quote.plan.label}</p>
                  <p className="mt-0.5 text-sm text-stone-600">{capLine(quote)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[2.5rem] font-semibold leading-none tracking-tight text-stone-900 tabular-nums">
                    {formatUsd(quote.billedUsd)}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    {interval === "monthly" ? "per month" : `per year · ${formatUsdCents(quote.perMonthCents)}/month`}
                  </p>
                </div>
              </div>

              <dl className="mt-5 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white text-sm">
                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <dt className="text-stone-600">
                    {quote.plan.label}, {interval === "monthly" ? "monthly" : "yearly"} price
                  </dt>
                  <dd className="tabular-nums text-stone-900">{formatUsd(quote.basePriceUsd)}</dd>
                </div>
                {quote.extraUsers > 0 ? (
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <dt className="text-stone-600">
                      {quote.extraUsers} extra {quote.extraUsers === 1 ? "user" : "users"} × {formatUsd(quote.plan.extraUserMonthlyUsd ?? 0)}/month
                      {interval === "annual" ? " × 12" : ""}
                    </dt>
                    <dd className="tabular-nums text-stone-900">
                      {formatUsd(interval === "annual" ? quote.extraMonthlyUsd * 12 : quote.extraMonthlyUsd)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3 bg-stone-50 px-4 py-2.5 font-semibold">
                  <dt className="text-stone-900">{interval === "monthly" ? "Each month" : "Each year"}</dt>
                  <dd className="tabular-nums text-stone-900">{formatUsd(quote.billedUsd)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <dt className="text-stone-600">Over 12 months</dt>
                  <dd className="tabular-nums text-stone-900">{formatUsd(quote.yearlyUsd)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <dt className="text-stone-600">Per user, per month</dt>
                  <dd className="tabular-nums text-stone-900">{formatUsdCents(quote.perUserMonthCents)}</dd>
                </div>
                {interval === "annual" && quote.annualSavingsUsd > 0 ? (
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <dt className="text-emerald-800">Saved against paying monthly</dt>
                    <dd className="font-semibold tabular-nums text-emerald-800">{formatUsd(quote.annualSavingsUsd)}</dd>
                  </div>
                ) : null}
              </dl>

              <ul className="mt-4 space-y-2 text-sm text-stone-700">
                {interval === "monthly" ? (
                  <li className="flex gap-2">
                    <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#77591B]" />
                    <span>
                      Paying yearly would cost {formatUsd(quotePlan(quote.plan, users, "annual").yearlyUsd)} a year, saving{" "}
                      {formatUsd(quotePlan(quote.plan, users, "annual").annualSavingsUsd)}.
                    </span>
                  </li>
                ) : (
                  <li className="flex gap-2">
                    <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#77591B]" />
                    <span>Monthly would be {formatUsd(monthlyEquivalent.billedUsd)} a month, with no yearly commitment.</span>
                  </li>
                )}
                {isRecommended && rec.roomLeft !== null ? (
                  <li className="flex gap-2">
                    <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#77591B]" />
                    <span>
                      {rec.roomLeft === 0
                        ? `${quote.plan.label} is full at ${usersLabel(quote.plan.includedUsers)}. The next person means a larger plan.`
                        : `Room for ${rec.roomLeft} more ${rec.roomLeft === 1 ? "user" : "users"} before ${quote.plan.label} is full.`}
                    </span>
                  </li>
                ) : null}
                {hires > 0 && rec.afterHiring ? (
                  <li className="flex gap-2">
                    <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#77591B]" />
                    <span>
                      {rec.afterHiring.plan.planKey === quote.plan.planKey
                        ? `After ${hires} ${hires === 1 ? "hire" : "hires"} (${usersLabel(rec.afterHiring.users)}), ${quote.plan.label} still fits: ${formatUsd(rec.afterHiring.billedUsd)}${interval === "monthly" ? "/month" : "/year"}.`
                        : `After ${hires} ${hires === 1 ? "hire" : "hires"} (${usersLabel(rec.afterHiring.users)}), you would move to ${rec.afterHiring.plan.label}: ${formatUsd(rec.afterHiring.billedUsd)}${interval === "monthly" ? "/month" : "/year"}. Plans change in Settings.`}
                    </span>
                  </li>
                ) : null}
                <li className="flex gap-2">
                  <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#77591B]" />
                  <span>Every plan has every feature. Only the number of users changes the price.</span>
                </li>
              </ul>
            </>
          )}

          {/* every plan, for this team */}
          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
              Every plan for {usersLabel(users)}, {interval === "monthly" ? "per month" : "per year"}
            </p>
            <ul className="mt-2 space-y-2">
              {rec.all.map((row) => {
                const active = row.plan.planKey === quote.plan.planKey;
                const isTop = row.plan.planKey === rec.recommended.plan.planKey;
                const widest = Math.max(...rec.all.filter((r) => r.fits).map((r) => r.billedUsd));
                const width = row.fits && widest > 0 ? Math.max(8, Math.round((row.billedUsd / widest) * 100)) : 0;
                return (
                  <li key={row.plan.planKey}>
                    <button
                      type="button"
                      onClick={() => setChoice(isTop ? "auto" : row.plan.planKey)}
                      aria-pressed={active}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                        active ? "border-[#C2A05A] bg-white shadow-sm" : "border-stone-200 bg-white/60 hover:border-stone-300 hover:bg-white"
                      } ${focusRing}`}
                    >
                      <span className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2 font-semibold text-stone-900">
                          {row.plan.label}
                          {isTop ? (
                            <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#e8d9ac]">
                              Recommended
                            </span>
                          ) : null}
                        </span>
                        <span className={`tabular-nums ${row.fits ? "font-semibold text-stone-900" : "text-stone-500"}`}>
                          {row.fits ? formatUsd(row.billedUsd) : `Not for ${usersLabel(users)}`}
                        </span>
                      </span>
                      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-stone-100" aria-hidden="true">
                        <span
                          className={`block h-full rounded-full ${active ? "bg-[#A4823A]" : "bg-stone-300"}`}
                          style={{ width: `${width}%` }}
                        />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-stone-600 sm:max-w-xs">
              Try it free for {PRICING_FACTS.trialDays} days first, no card. The trial includes up to {PRICING_FACTS.trialUsers} users,
              so the whole team can test it before you pick.
            </p>
            <Link
              href="/signup"
              data-cta="pricing-plan-finder"
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0A0A0A] px-5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(10,10,10,0.22),0_4px_18px_rgba(194,160,90,0.2)] ring-1 ring-[#C2A05A]/30 transition-colors hover:bg-[#141414] ${focusRing}`}
            >
              Start the free trial
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
