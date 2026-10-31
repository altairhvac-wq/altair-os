import Link from "next/link";
import { listPublicSaasCatalogPlans, SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { HomepageOnboardingSection } from "@/shared/components/homepage/HomepageOnboardingSection";
import { HomepagePricingSection } from "@/shared/components/homepage/HomepagePricingSection";
import { MarketingFaqSection } from "@/shared/components/marketing/MarketingFaqSection";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { LANDING_PAGES, type LandingPageConfig } from "@/shared/lib/site/landing-pages";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";

function lowestMonthlyPrice(): number | null {
  const prices = listPublicSaasCatalogPlans()
    .map((plan) => plan.monthlyPriceUsd)
    .filter((price): price is number => typeof price === "number");
  return prices.length ? Math.min(...prices) : null;
}

/**
 * The search landing page: what Altair runs for this search, how the trial
 * works for it, then the homepage's own onboarding, pricing and FAQ sections,
 * so no fact is typed twice. Static; the page file only picks the config
 * and emits the structured data.
 */
export function MarketingLandingPage({ page }: { page: LandingPageConfig }) {
  const fromPrice = lowestMonthlyPrice();
  const trialDays = SAAS_TRIAL_CONFIG.durationDays;
  const siblings = LANDING_PAGES.filter((other) => other.path !== page.path);

  return (
    <div className="mc-homepage relative min-h-dvh overflow-x-clip bg-[#080907] text-[#f3ebdd]">
      <HomepageNav />
      <main className="relative">
        <section className="px-5 pb-12 pt-28 sm:px-8 sm:pb-16 sm:pt-36">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center rounded-full border border-[rgba(230,227,220,0.14)] bg-[rgba(24,28,22,0.55)] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#c9bfae]">
              {page.eyebrow}
            </p>
            <h1 className="ah-hero-display mt-5 text-[2.2rem] font-normal leading-[1.12] tracking-[-0.015em] text-[#fff9ea] sm:text-[3rem] sm:leading-[1.08] lg:text-[3.6rem]">
              {page.headline}
            </h1>
            <p className="mx-auto mt-5 max-w-[620px] text-[0.95rem] leading-[1.75] text-[#c9bfae] sm:text-lg sm:leading-[1.8]">
              {page.intro}
            </p>
            <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className={`inline-flex min-h-12 items-center justify-center rounded-lg bg-[#a4823a] px-8 py-3.5 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] ${focusRing}`}
              >
                Start Your {trialDays}-Day Free Trial
              </Link>
              <Link
                href="/pricing"
                className={`inline-flex min-h-12 items-center justify-center rounded-lg border border-[rgba(230,227,220,0.18)] px-8 py-3.5 text-sm font-semibold text-[#fbf7ef] transition-colors hover:border-[rgba(230,227,220,0.32)] ${focusRing}`}
              >
                See pricing
              </Link>
            </div>
            <p className="mt-5 text-[13px] text-[#8e826f] sm:text-sm">
              No credit card to start.
              {fromPrice !== null ? ` Plans from $${fromPrice}/month after the trial.` : ""}{" "}
              Live onboarding included.
            </p>
          </div>
        </section>

        <section aria-labelledby="landing-modules-heading" className="px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">
              What it runs
            </p>
            <h2
              id="landing-modules-heading"
              className="mt-3 max-w-2xl text-[1.6rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[2rem] sm:leading-[1.2]"
            >
              {page.modulesHeading}
            </h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-2">
              {page.modules.map((module, index) => (
                <li
                  key={module.title}
                  className="rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[rgba(14,17,13,0.6)] p-5"
                >
                  <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-[#c2a05a]">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-[#fff9ea]">{module.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#c9bfae]">{module.text}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm text-[#8e826f]">{page.modulesNote}</p>
          </div>
        </section>

        <section aria-labelledby="landing-trial-heading" className="px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">
              How the trial works
            </p>
            <h2
              id="landing-trial-heading"
              className="mt-3 text-[1.6rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[2rem] sm:leading-[1.2]"
            >
              {trialDays} {page.stepsHeading}
            </h2>
            <ol className="mt-8 space-y-4">
              {page.steps.map((step, index) => (
                <li key={step.title} className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#a4823a] font-mono text-xs font-semibold text-[#080907]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-base font-semibold text-[#fff9ea]">{step.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[#c9bfae]">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <HomepageOnboardingSection />
        <HomepagePricingSection />
        <MarketingFaqSection variant="dark" />

        <section className="px-5 pb-16 pt-6 sm:px-8 sm:pb-20">
          <div className="mx-auto max-w-2xl rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[linear-gradient(165deg,rgba(32,37,29,0.72)_0%,rgba(14,17,13,0.92)_100%)] px-5 py-8 text-center sm:px-8 sm:py-9">
            <h2 className="text-[1.4rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.75rem]">
              {page.closingHeading}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#c9bfae] sm:text-base">
              {page.closingText}
            </p>
            <Link
              href="/signup"
              className={`mt-6 inline-flex items-center justify-center rounded-lg bg-[#a4823a] px-5 py-3.5 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] ${focusRing}`}
            >
              Start Your {trialDays}-Day Free Trial
            </Link>
          </div>
          {siblings.length ? (
            <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-[#8e826f]">
              Also:{" "}
              {siblings.map((other, index) => (
                <span key={other.path}>
                  {index > 0 ? " · " : ""}
                  <Link
                    href={other.path}
                    className={`font-semibold text-[#c2a05a] underline-offset-4 hover:text-[#e8d9ac] hover:underline ${focusRing}`}
                  >
                    {other.navLabel}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
