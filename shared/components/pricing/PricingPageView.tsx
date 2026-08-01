import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { SeeAltairInActionSection } from "@/shared/components/marketing/SeeAltairInActionSection";
import {
  SAAS_TRIAL_CONFIG,
  listPublicSaasCatalogPlans,
} from "@/lib/saas-billing/catalog";
import { SAAS_PLAN_DESCRIPTIONS } from "@/shared/components/pricing/plan-descriptions";

const POSITIONING = [
  "One connected operating system",
  "Live onboarding included",
  "Monthly or annual billing",
  "Built for field service businesses",
] as const;

const PLATFORM_FEATURES = [
  "Dispatch & Scheduling",
  "Customer Management",
  "Customer 360",
  "Estimates & Approvals",
  "Invoices & Payments",
  "Equipment Tracking",
  "Technician Mobile App",
  "Time Tracking",
  "Team Management",
  "Business Reporting",
  "AI-Powered Assistants",
  "Live Onboarding",
] as const;

const ctaFocusClass =
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/20";

export function PricingPageView() {
  const plans = listPublicSaasCatalogPlans();

  return (
    <div className="relative min-h-dvh bg-gradient-to-b from-stone-50 via-white to-stone-100/80">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

      <HomepageNav />

      <main className="relative mx-auto max-w-6xl px-5 pb-10 pt-24 sm:px-8 sm:pb-14 sm:pt-28">
        <div className="auth-hero-enter mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A7209]">
            Straightforward pricing
          </p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-[#0A0A0A] sm:text-[2.5rem]">
            Plans built for the way you grow
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
            Start with a {SAAS_TRIAL_CONFIG.durationDays}-day free trial, then
            choose monthly or annual billing for the operating system that runs
            your field service business.
          </p>
        </div>

        <ul className="auth-panel-enter mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-stone-600">
          {POSITIONING.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 shrink-0 text-[#9A7209]" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="auth-panel-enter mx-auto mt-10 grid max-w-5xl gap-5 lg:grid-cols-3 lg:gap-6">
          {plans.map((plan) => {
            const featured = plan.planKey === "growth";

            return (
            <div
              key={plan.planKey}
              className={[
                "relative flex flex-col overflow-hidden rounded-2xl border bg-gradient-to-b from-white via-[#FFFCF8] to-[#FAF7F2] shadow-[0_4px_8px_rgba(10,10,10,0.06),0_12px_32px_rgba(10,10,10,0.08)] ring-1",
                featured
                  ? "border-[#D4AF37]/45 border-t-[3px] border-t-[#D4AF37]/75 ring-[#D4AF37]/28 shadow-[0_8px_24px_rgba(10,10,10,0.1),0_24px_48px_rgba(154,114,9,0.14)] lg:-mt-2 lg:mb-2"
                  : "border-stone-200/80 border-t-[3px] border-t-[#D4AF37]/40 ring-[#D4AF37]/14",
              ].join(" ")}
            >
              {featured ? (
                <div className="flex items-center justify-center gap-1.5 border-b border-[#D4AF37]/20 bg-gradient-to-r from-[#FDF9F0] via-[#FAF4E8] to-[#FDF9F0] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A7209]">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Most popular
                </div>
              ) : null}

              <div className="flex flex-1 flex-col px-6 py-7 sm:px-7">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-[#0A0A0A]">
                    {plan.label}
                  </h2>
                  <p className="mt-2 min-h-[2.75rem] text-sm leading-relaxed text-stone-600">
                    {SAAS_PLAN_DESCRIPTIONS[plan.planKey]}
                  </p>
                </div>

                <div className="mt-6 border-t border-stone-200/70 pt-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-4xl font-semibold tracking-tight text-[#0A0A0A]">
                      ${plan.monthlyPriceUsd}
                    </span>
                    <span className="text-base font-medium text-stone-600">/ month</span>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">
                    Or ${plan.annualPriceUsd}/year and save ${plan.annualSavingsUsd}
                  </p>
                  <p className="mt-2 text-xs font-medium text-[#9A7209]">
                    {SAAS_TRIAL_CONFIG.durationDays}-day free trial · Credit card
                    required
                  </p>
                </div>

                <Link
                  href="/signup"
                  className={[
                    "mt-6 inline-flex w-full items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold transition-all",
                    ctaFocusClass,
                    featured
                      ? "bg-[#0A0A0A] text-white shadow-[0_1px_2px_rgba(10,10,10,0.22),0_4px_18px_rgba(212,175,55,0.2),0_0_22px_rgba(212,175,55,0.1)] ring-1 ring-[#D4AF37]/30 hover:bg-[#141414] hover:ring-[#D4AF37]/42"
                      : "border border-stone-300/80 bg-white text-[#0A0A0A] shadow-sm hover:border-[#D4AF37]/40 hover:bg-[#FFFCF8]",
                  ].join(" ")}
                >
                  Start Your 14-Day Free Trial
                </Link>

                <p className="mt-4 text-center text-xs text-stone-500">
                  Converts to your selected plan unless canceled
                </p>
              </div>
            </div>
            );
          })}
        </div>

        <div className="auth-panel-enter mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-stone-200/80 bg-gradient-to-b from-white via-[#FFFCF8] to-[#FAF7F2] shadow-[0_4px_8px_rgba(10,10,10,0.05),0_12px_32px_rgba(10,10,10,0.08)] ring-1 ring-[#D4AF37]/16">
          <div className="border-b border-stone-200/70 px-6 py-6 text-center sm:px-8">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-stone-500">
              One connected platform
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Every plan includes the core Altair OS workflows and live onboarding.
            </p>
          </div>

          <div className="px-6 py-8 sm:px-8">
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PLATFORM_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-stone-700">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#9A7209]"
                    aria-hidden="true"
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="auth-hero-enter mx-auto mt-16 max-w-5xl">
          <SeeAltairInActionSection variant="light" />
        </div>

        <section className="auth-hero-enter mx-auto mt-16 max-w-3xl text-center">
          <h2 className="text-xl font-semibold tracking-tight text-[#0A0A0A] sm:text-2xl">
            The operating system for field service businesses
          </h2>
          <p className="mt-4 text-base leading-relaxed text-stone-600">
            Altair connects customers, jobs, dispatch, field work, estimates,
            invoices, payments, and reporting so your team can run the operation
            without stitching together disconnected tools.
          </p>
          <p className="mt-3 text-sm font-medium text-stone-500">
            Modern workflows. Real-world operations. One continuous system.
          </p>
        </section>

        <section className="auth-panel-enter mx-auto mt-12 max-w-2xl rounded-2xl border border-[#D4AF37]/22 bg-gradient-to-b from-[#FDF9F0] via-[#FAF7F0] to-[#F4EFE4] p-6 text-center shadow-[0_14px_44px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.96)] sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A7209]">
            Start with the complete operating system
          </p>
          <p className="mt-3 text-base leading-relaxed text-stone-700">
            Try Altair free for {SAAS_TRIAL_CONFIG.durationDays} days with live
            onboarding included, then continue on the plan that fits your business.
          </p>
          <p className="mt-3 text-sm font-medium text-stone-600">
            Credit card required. Cancel anytime.
          </p>
          <Link
            href="/signup"
            className={`mt-6 inline-flex items-center justify-center rounded-lg border border-[#D4AF37]/35 bg-white px-6 py-2.5 text-sm font-semibold text-[#9A7209] shadow-sm transition-colors hover:border-[#D4AF37]/55 hover:bg-[#FFFCF8] ${ctaFocusClass}`}
          >
            Start Your 14-Day Free Trial
          </Link>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
