import Link from "next/link";
import { ArrowRight, Calculator, Check, FileText, Minus, ShieldCheck, Sparkles } from "lucide-react";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { MarketingFaqSection } from "@/shared/components/marketing/MarketingFaqSection";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { NextStep } from "@/shared/components/site/NextStep";
import { NEXT_STEPS } from "@/shared/lib/site/next-steps";
import { SeeAltairInActionSection } from "@/shared/components/marketing/SeeAltairInActionSection";
import { PlanFinder } from "@/shared/components/pricing/PlanFinder";
import { SAAS_PLAN_DESCRIPTIONS } from "@/shared/components/pricing/plan-descriptions";
import { PRICING_FACTS, formatUsd, pricedPlans } from "@/shared/lib/pricing/plan-calculator";
import { CONTRACT_TERMS, PRICING_FAQ, planComparisonRows, type ComparisonCell } from "@/shared/lib/pricing/pricing-page";
import { FIVE_USER_PRICE_COMPARISON } from "@/shared/lib/site/comparison-pages";
import { ALTAIR_NOT_YET } from "@/shared/lib/site/not-yet";

const ctaFocusClass =
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#C2A05A]/20";
const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#77591B]";
const h2 = "mt-2 text-[1.6rem] font-semibold tracking-tight text-[#0A0A0A] sm:text-[2rem] sm:leading-[1.15]";
const panel =
  "rounded-2xl border border-stone-200/80 bg-white shadow-[0_4px_8px_rgba(10,10,10,0.05),0_12px_32px_rgba(10,10,10,0.07)]";

function Cell({ value, featured }: { readonly value: ComparisonCell; readonly featured: boolean }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center">
        <Check aria-hidden="true" className={`h-4 w-4 ${featured ? "text-[#77591B]" : "text-stone-700"}`} />
        <span className="sr-only">Included</span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center text-stone-400">
        <Minus aria-hidden="true" className="h-4 w-4" />
        <span className="sr-only">Not included</span>
      </span>
    );
  }
  return <span>{value}</span>;
}

/**
 * /pricing. Prices, limits and trial facts come from the plan catalog
 * (through shared/lib/pricing/plan-calculator.ts); the contract terms and the
 * FAQ say only what the code, the site FAQ and /terms already say
 * (shared/lib/pricing/pricing-page.ts). The plan finder is the one client
 * component; everything else is server-rendered.
 */
export function PricingPageView() {
  const plans = pricedPlans();
  const rows = planComparisonRows();
  const growth = plans.find((plan) => plan.planKey === "growth");
  const trialDays = PRICING_FACTS.trialDays;

  return (
    <div className="relative min-h-dvh overflow-x-clip bg-gradient-to-b from-stone-50 via-white to-stone-100/80">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C2A05A]/30 to-transparent" />

      <HomepageNav />

      <main className="relative mx-auto max-w-6xl px-4 pb-10 pt-24 sm:px-8 sm:pb-14 sm:pt-28">
        {/* ---------- hero ---------- */}
        <header className="auth-hero-enter mx-auto max-w-3xl text-center">
          <p className={eyebrow}>HVAC software pricing</p>
          <h1 className="mt-3 text-[2rem] font-semibold leading-[1.1] tracking-tight text-[#0A0A0A] sm:text-[2.75rem]">
            Every feature on every plan. You pay for the people who sign in.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
            {plans.map((plan, index) => (
              <span key={plan.planKey}>
                {index > 0 ? (index === plans.length - 1 ? " or " : ", ") : ""}
                {plan.label} <strong className="font-semibold text-stone-900">{formatUsd(plan.monthlyPriceUsd)}</strong>
              </span>
            ))}{" "}
            a month. Start with a {trialDays}-day free trial, no credit card, and a one-on-one setup call.
          </p>
          <nav aria-label="On this page" className="mt-6 flex flex-wrap justify-center gap-2">
            {[
              { href: "#plan-finder", label: "Price my team" },
              { href: "#compare-plans", label: "Compare plans" },
              { href: "#terms", label: "Contract terms" },
              { href: "#faq", label: "Questions" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`inline-flex min-h-10 items-center rounded-full border border-stone-300 bg-white px-4 text-[13px] font-semibold text-stone-700 transition-colors hover:border-[#C2A05A] hover:text-stone-900 ${ctaFocusClass}`}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </header>

        {/* ---------- the three plans ---------- */}
        <div className="auth-panel-enter mx-auto mt-10 grid max-w-5xl gap-5 lg:grid-cols-3 lg:gap-6">
          {plans.map((plan) => {
            const featured = plan.planKey === "growth";
            return (
              <div
                key={plan.planKey}
                className={[
                  "relative flex flex-col overflow-hidden rounded-2xl border bg-gradient-to-b from-white via-[#FFFCF8] to-[#FAF7F2] shadow-[0_4px_8px_rgba(10,10,10,0.06),0_12px_32px_rgba(10,10,10,0.08)] ring-1",
                  featured
                    ? "border-[#C2A05A]/45 border-t-[3px] border-t-[#C2A05A]/75 ring-[#C2A05A]/28 shadow-[0_8px_24px_rgba(10,10,10,0.1),0_24px_48px_rgba(119,89,27,0.14)] lg:-mt-2 lg:mb-2"
                    : "border-stone-200/80 border-t-[3px] border-t-[#C2A05A]/40 ring-[#C2A05A]/14",
                ].join(" ")}
              >
                {featured && growth ? (
                  <div className="flex items-center justify-center gap-1.5 border-b border-[#C2A05A]/20 bg-gradient-to-r from-[#FDF9F0] via-[#FAF4E8] to-[#FDF9F0] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#77591B]">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    Made for teams of 2 to {growth.includedUsers}
                  </div>
                ) : null}

                <div className="flex flex-1 flex-col px-6 py-7 sm:px-7">
                  <h2 className="text-lg font-semibold tracking-tight text-[#0A0A0A]">{plan.label}</h2>
                  <p className="mt-2 min-h-[2.75rem] text-sm leading-relaxed text-stone-600">
                    {SAAS_PLAN_DESCRIPTIONS[plan.planKey]}
                  </p>

                  <div className="mt-6 border-t border-stone-200/70 pt-6">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-4xl font-semibold tracking-tight text-[#0A0A0A]">
                        {formatUsd(plan.monthlyPriceUsd)}
                      </span>
                      <span className="text-base font-medium text-stone-600">/ month</span>
                    </div>
                    <p className="mt-2 text-sm text-stone-600">
                      Or {formatUsd(plan.annualPriceUsd)}/year and save {formatUsd(plan.annualSavingsUsd)}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-[#0A0A0A]">
                      {plan.extraUserMonthlyUsd !== null
                        ? `${plan.includedUsers} users, then ${formatUsd(plan.extraUserMonthlyUsd)}/month each`
                        : plan.includedUsers === 1
                          ? "1 user"
                          : `Up to ${plan.includedUsers} users`}
                    </p>
                    <p className="mt-2 text-xs font-medium text-[#77591B]">
                      {trialDays}-day free trial · No credit card required to start
                    </p>
                  </div>

                  <Link
                    href="/signup"
                    data-cta={`pricing-card-${plan.planKey}`}
                    className={[
                      "mt-6 inline-flex w-full items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold transition-all",
                      ctaFocusClass,
                      featured
                        ? "bg-[#0A0A0A] text-white shadow-[0_1px_2px_rgba(10,10,10,0.22),0_4px_18px_rgba(194,160,90,0.2),0_0_22px_rgba(194,160,90,0.1)] ring-1 ring-[#C2A05A]/30 hover:bg-[#141414] hover:ring-[#C2A05A]/42"
                        : "border border-stone-300/80 bg-white text-[#0A0A0A] shadow-sm hover:border-[#C2A05A]/40 hover:bg-[#FFFCF8]",
                    ].join(" ")}
                  >
                    Start Your {trialDays}-Day Free Trial
                  </Link>
                  <a
                    href="#plan-finder"
                    className={`mt-3 inline-flex items-center justify-center gap-1.5 rounded-md text-center text-xs font-semibold text-[#77591B] hover:underline ${ctaFocusClass}`}
                  >
                    <Calculator aria-hidden="true" className="h-3.5 w-3.5" />
                    Price it for my team
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* ---------- plan finder + calculator ---------- */}
        <section aria-labelledby="plan-finder-heading" className="mx-auto mt-16 max-w-5xl sm:mt-20">
          <div className="mb-6 max-w-3xl">
            <p className={eyebrow}>Which plan fits you</p>
            <h2 id="plan-finder-heading" className={h2}>
              Answer three questions. See the plan and the monthly cost.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-600 sm:text-base">
              Every plan has the same features, so the only thing that decides your plan is how many people sign in.
              Count them below and the finder picks the least expensive plan that fits, then prices it monthly and
              yearly.
            </p>
          </div>
          <PlanFinder />
        </section>

        {/* ---------- comparison table ---------- */}
        <section id="compare-plans" aria-labelledby="compare-heading" className="mx-auto mt-16 max-w-5xl scroll-mt-24 sm:mt-20">
          <p className={eyebrow}>Compare plans</p>
          <h2 id="compare-heading" className={h2}>
            The same system on all three. The difference is seats.
          </h2>
          {/* phones: one card per plan, then the shared feature list once */}
          <div className="mt-6 space-y-3 sm:hidden">
            {plans.map((plan, planIndex) => (
              <div
                key={plan.planKey}
                className={`${panel} p-5 ${plan.planKey === "growth" ? "border-[#C2A05A]/50 ring-1 ring-[#C2A05A]/25" : ""}`}
              >
                <p className="flex items-baseline justify-between gap-3">
                  <span className="text-base font-semibold text-[#0A0A0A]">{plan.label}</span>
                  <span className="font-mono text-lg font-semibold text-[#0A0A0A]">
                    {formatUsd(plan.monthlyPriceUsd)}
                    <span className="font-sans text-xs font-medium text-stone-500">/mo</span>
                  </span>
                </p>
                <p className="mt-1 text-sm text-stone-600">{SAAS_PLAN_DESCRIPTIONS[plan.planKey]}</p>
                <dl className="mt-3 divide-y divide-stone-100 text-sm">
                  {rows.money.slice(1).map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3 py-2">
                      <dt className="text-stone-600">{row.label}</dt>
                      <dd className="text-right font-medium text-stone-900">
                        <Cell value={row.cells[planIndex] ?? false} featured={plan.planKey === "growth"} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
            <div className={`${panel} p-5`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Included on every plan</p>
              <ul className="mt-3 grid gap-2 text-sm text-stone-700">
                {rows.features.map((row) => (
                  <li key={row.label} className="flex items-start gap-2">
                    <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#77591B]" />
                    {row.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className={`mt-6 hidden overflow-x-auto sm:block ${panel}`}>
            <table className="w-full min-w-[600px] border-collapse text-left text-sm">
              <caption className="sr-only">Starter, Growth and Pro compared</caption>
              <thead>
                <tr className="border-b border-stone-200">
                  <th scope="col" className="sticky left-0 z-10 w-[34%] bg-white px-4 py-4 sm:px-6">
                    <span className="sr-only">Compare</span>
                  </th>
                  {plans.map((plan) => (
                    <th
                      key={plan.planKey}
                      scope="col"
                      className={`px-4 py-4 text-center align-bottom ${plan.planKey === "growth" ? "bg-[#FDF9F0]" : ""}`}
                    >
                      <span className="block text-base font-semibold text-[#0A0A0A]">{plan.label}</span>
                      <span className="mt-0.5 block font-mono text-lg font-semibold text-[#0A0A0A]">
                        {formatUsd(plan.monthlyPriceUsd)}
                        <span className="font-sans text-xs font-medium text-stone-500">/mo</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.money.map((row) => (
                  <tr key={row.label} className="border-b border-stone-100 align-top">
                    <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-stone-800 sm:px-6">
                      {row.label}
                    </th>
                    {row.cells.map((cell, index) => (
                      <td
                        key={`${row.label}-${plans[index]?.planKey}`}
                        className={`px-4 py-3 text-center text-stone-700 ${plans[index]?.planKey === "growth" ? "bg-[#FDF9F0]/70" : ""}`}
                      >
                        <Cell value={cell} featured={plans[index]?.planKey === "growth"} />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th scope="rowgroup" colSpan={plans.length + 1} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500 sm:px-6">
                    Included on every plan
                  </th>
                </tr>
                {rows.features.map((row) => (
                  <tr key={row.label} className="border-b border-stone-100 last:border-b-0">
                    <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-2.5 font-normal text-stone-700 sm:px-6">
                      {row.label}
                    </th>
                    {row.cells.map((cell, index) => (
                      <td
                        key={`${row.label}-${plans[index]?.planKey}`}
                        className={`px-4 py-2.5 text-center ${plans[index]?.planKey === "growth" ? "bg-[#FDF9F0]/70" : ""}`}
                      >
                        <Cell value={cell} featured={plans[index]?.planKey === "growth"} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-stone-600">
            Comparing with the software you use now?{" "}
            <Link
              href={FIVE_USER_PRICE_COMPARISON.comparisonPath}
              className={`font-semibold text-[#77591B] underline underline-offset-2 ${ctaFocusClass}`}
            >
              See what a {FIVE_USER_PRICE_COMPARISON.users}-person shop pays side by side
            </Link>
            , with published prices and sources.
          </p>
        </section>

        {/* ---------- contract terms ---------- */}
        <section id="terms" aria-labelledby="terms-heading" className="mx-auto mt-16 max-w-5xl scroll-mt-24 sm:mt-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-3xl">
              <p className={eyebrow}>The terms, in plain words</p>
              <h2 id="terms-heading" className={h2}>
                No contract to sign. Here is everything that applies.
              </h2>
            </div>
            <Link
              href="/terms"
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 text-[13px] font-semibold text-stone-700 hover:border-[#C2A05A] ${ctaFocusClass}`}
            >
              <FileText aria-hidden="true" className="h-4 w-4" />
              Read the full terms
            </Link>
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CONTRACT_TERMS.map((term) => (
              <li key={term.title} className={`${panel} p-5`}>
                <p className="flex items-center gap-2 text-[15px] font-semibold text-[#0A0A0A]">
                  <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-[#77591B]" />
                  {term.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{term.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- the honest list (shared/lib/site/not-yet.ts) ---------- */}
        <section
          id="not-yet"
          aria-labelledby="not-yet-heading"
          className={`auth-panel-enter mx-auto mt-16 max-w-5xl scroll-mt-24 px-6 py-7 sm:mt-20 sm:px-8 ${panel}`}
        >
          <p className={eyebrow}>Before you decide</p>
          <h2 id="not-yet-heading" className="mt-2 text-xl font-semibold tracking-tight text-[#0A0A0A] sm:text-2xl">
            What Altair does not do yet
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-[15px]">
            Better you read it here than find it on day three of a trial. If one of these is a must for your shop
            today, Altair is not the right fit yet.
          </p>
          <ul className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {ALTAIR_NOT_YET.map((item) => (
              <li key={item.title} className="text-sm leading-relaxed">
                <span className="block font-semibold text-[#0A0A0A]">{item.title}</span>
                <span className="block text-stone-600">Today: {item.today}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="auth-hero-enter mx-auto mt-16 max-w-5xl">
          <SeeAltairInActionSection variant="light" />
        </div>

        <MarketingFaqSection
          variant="light"
          items={PRICING_FAQ}
          eyebrowText="Pricing questions"
          headingText="What owners ask about the price."
          introText="Straight answers from the plan list and the terms, including what happens when you leave."
          className="auth-panel-enter mt-4 !py-10"
        />

        <section className="auth-panel-enter mx-auto mt-6 max-w-2xl rounded-2xl border border-[#C2A05A]/22 bg-gradient-to-b from-[#FDF9F0] via-[#FAF7F0] to-[#F4EFE4] p-6 text-center shadow-[0_14px_44px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.96)] sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#77591B]">
            Start with the complete operating system
          </p>
          <p className="mt-3 text-base leading-relaxed text-stone-700">
            Try Altair free for {trialDays} days with up to {PRICING_FACTS.trialUsers} users and a one-on-one setup call,
            then continue on the plan that fits your team.
          </p>
          <p className="mt-3 text-sm font-medium text-stone-600">No credit card required to start. Cancel anytime.</p>
          <Link
            href="/signup"
            data-cta="pricing-closing"
            className={`mt-6 inline-flex items-center justify-center gap-2 rounded-lg border border-[#C2A05A]/35 bg-white px-6 py-2.5 text-sm font-semibold text-[#77591B] shadow-sm transition-colors hover:border-[#C2A05A]/55 hover:bg-[#FFFCF8] ${ctaFocusClass}`}
          >
            Start Your {trialDays}-Day Free Trial
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </section>

        <NextStep
          className="auth-panel-enter mx-auto mt-12 max-w-5xl"
          placement="pricing"
          steps={NEXT_STEPS.pricing}
          eyebrow="Not ready to pick a plan?"
          heading="See it work first, or run your numbers"
          trial={false}
        />
      </main>

      <MarketingFooter />
    </div>
  );
}
