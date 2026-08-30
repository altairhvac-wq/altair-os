import Link from "next/link";
import {
  SAAS_TRIAL_CONFIG,
  listPublicSaasCatalogPlans,
} from "@/lib/saas-billing/catalog";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";

export function HomepagePricingSection() {
  const plans = listPublicSaasCatalogPlans();

  return (
    <section
      id="pricing"
      aria-labelledby="mc-pricing-heading"
      className="relative scroll-mt-24 px-5 py-12 sm:px-8 sm:py-16"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(230,227,220,0.2),transparent)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[72rem]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c2a05a]">
            Simple plans for growing service businesses
          </p>
          <h2
            id="mc-pricing-heading"
            className="mt-3 text-[1.85rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[2.35rem] sm:leading-[1.15]"
          >
            Run the full operation free for {SAAS_TRIAL_CONFIG.durationDays} days.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#c9bfae] sm:text-lg">
            Choose the plan that fits your team. Every plan starts with the same
            connected Altair experience and live onboarding.
          </p>
        </div>

        <div className="mt-9 grid gap-4 lg:mt-11 lg:grid-cols-3">
          {plans.map((plan) => {
            const featured = plan.planKey === "growth";

            return (
              <article
                key={plan.planKey}
                className={[
                  "relative flex flex-col rounded-2xl border p-5 sm:p-6",
                  featured
                    ? "border-[rgba(194,160,90,0.5)] bg-[linear-gradient(165deg,rgba(50,42,25,0.72),rgba(14,17,13,0.96))] shadow-[0_24px_60px_-38px_rgba(194,160,90,0.55)]"
                    : "border-[rgba(230,227,220,0.12)] bg-[linear-gradient(165deg,rgba(32,37,29,0.72),rgba(14,17,13,0.92))]",
                ].join(" ")}
              >
                {featured ? (
                  <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c2a05a]">
                    Most popular
                  </p>
                ) : null}
                <h3 className="text-lg font-semibold text-[#fff9ea]">{plan.label}</h3>
                <div className="mt-5 flex items-end gap-2">
                  <span className="font-mono text-4xl font-semibold tracking-tight text-[#fff9ea]">
                    ${plan.monthlyPriceUsd}
                  </span>
                  <span className="pb-1 text-sm text-[#9a9080]">/ month</span>
                </div>
                <p className="mt-2 text-sm text-[#9a9080]">
                  ${plan.annualPriceUsd}/year · save ${plan.annualSavingsUsd}
                </p>
                <Link
                  href="/signup"
                  className={`mt-6 inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    featured
                      ? "bg-[#a4823a] text-[#080907] hover:bg-[#c2a05a]"
                      : "border border-[rgba(230,227,220,0.18)] text-[#f3ebdd] hover:border-[rgba(230,227,220,0.32)] hover:bg-[rgba(24,28,22,0.55)]"
                  } ${focusRing}`}
                >
                  Start Your 14-Day Free Trial
                </Link>
              </article>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-[#8e826f]">
            Credit card required. Your selected plan begins after the trial unless
            you cancel.
          </p>
          <Link
            href="/pricing"
            className={`mt-3 inline-flex rounded-sm text-sm font-semibold text-[#c2a05a] hover:text-[#e8d9ac] ${focusRing}`}
          >
            Compare plans and annual pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
