import Link from "next/link";
import { listPublicSaasCatalogPlans, SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";
import { HeroCommercialVideo } from "@/shared/components/auth/HeroCommercialVideo";
import { LOGIN_HERO_SUBCOPY, LOGIN_HERO_TITLE } from "@/shared/components/auth/LoginMarketingPanel";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { HomepageOnboardingSection } from "@/shared/components/homepage/HomepageOnboardingSection";
import { HomepagePricingSection } from "@/shared/components/homepage/HomepagePricingSection";
import { MarketingFaqSection } from "@/shared/components/marketing/MarketingFaqSection";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { SeeAltairInActionSection } from "@/shared/components/marketing/SeeAltairInActionSection";
import { RESOURCES_CALCULATORS_PATH, RESOURCE_CALCULATORS, calculatorPath } from "@/shared/lib/resources/catalog";
import { ABOUT_PATH, FOUNDER } from "@/shared/lib/site/about";
import { VIDEO_PAGE_PATH } from "@/shared/lib/site/commercial-video";
import { FIVE_USER_PRICE_COMPARISON } from "@/shared/lib/site/comparison-pages";

/**
 * The logged-out homepage.
 *
 * ============ WHY IT IS A LANDING PAGE AGAIN ============
 * From 2026-10-31 the homepage was the sign-in form with a product panel
 * beside it. The 2026-11-12 site audit found that a stranger arriving from a
 * video or a search landed on a password box: on a phone the form filled the
 * first screen and the trial button sat under it. Most visitors are new (the
 * returning ones have the app installed or bookmarked), so the first screen
 * now says what the product is, what it costs and how to try it, and "Sign
 * in" is one tap away in the hero and in the bar at the top.
 *
 * Nothing here is typed twice: the price comes from the plan catalog, the
 * comparison from the same constant /pricing uses, and the onboarding,
 * pricing and FAQ blocks are the ones the search landing pages render.
 * The old screen is kept as LoginLandingPage; /login is unchanged.
 */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";
const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]";
const primaryButton = `inline-flex min-h-12 items-center justify-center rounded-lg bg-[#a4823a] px-8 py-3.5 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] ${focusRing}`;
const secondaryButton = `inline-flex min-h-12 items-center justify-center rounded-lg border border-[rgba(230,227,220,0.18)] px-8 py-3.5 text-sm font-semibold text-[#fbf7ef] transition-colors hover:border-[rgba(230,227,220,0.32)] ${focusRing}`;
const textLink = `font-semibold text-[#c2a05a] underline-offset-4 hover:text-[#e8d9ac] hover:underline ${focusRing}`;
const card = "rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[rgba(14,17,13,0.6)]";

function lowestMonthlyPrice(): number | null {
  const prices = listPublicSaasCatalogPlans()
    .map((plan) => plan.monthlyPriceUsd)
    .filter((price): price is number => typeof price === "number");
  return prices.length ? Math.min(...prices) : null;
}

/** The question each free calculator answers, in a few words. */
const TOOL_BLURBS: Record<(typeof RESOURCE_CALCULATORS)[number]["slug"], string> = {
  "labor-rate": "What an hour has to bill for.",
  "job-profitability": "Whether that job made money.",
  "break-even": "The jobs a month it takes to cover costs.",
  "maintenance-agreement": "What to charge for an agreement.",
  "technician-pay": "Hourly, flat rate or commission.",
  "callback-cost": "What free return trips cost.",
};

export function HomeLandingPage() {
  const fromPrice = lowestMonthlyPrice();
  const trialDays = SAAS_TRIAL_CONFIG.durationDays;
  const comparison = FIVE_USER_PRICE_COMPARISON;

  return (
    <div className="mc-homepage relative min-h-dvh overflow-x-clip bg-[#080907] text-[#f3ebdd]">
      <HomepageNav />
      <main className="relative">
        <section className="px-5 pb-10 pt-28 sm:px-8 sm:pb-14 sm:pt-36">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center rounded-full border border-[rgba(230,227,220,0.14)] bg-[rgba(24,28,22,0.55)] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#c9bfae]">
              HVAC and field service software
            </p>
            <h1 className="ah-hero-display mt-5 text-[2.2rem] font-normal leading-[1.12] tracking-[-0.015em] text-[#fff9ea] sm:text-[3rem] sm:leading-[1.08] lg:text-[3.6rem]">
              {LOGIN_HERO_TITLE}
            </h1>
            <p className="mx-auto mt-5 max-w-[620px] text-[0.95rem] leading-[1.75] text-[#c9bfae] sm:text-lg sm:leading-[1.8]">
              {LOGIN_HERO_SUBCOPY}
            </p>
            <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link href="/signup" data-cta="home-hero" className={primaryButton}>
                Start Your {trialDays}-Day Free Trial
              </Link>
              <Link href="/login" className={secondaryButton}>
                Sign in
              </Link>
            </div>
            <p className="mt-5 text-[13px] text-[#8e826f] sm:text-sm">
              No credit card to start.
              {fromPrice !== null ? ` Plans from $${fromPrice}/month after the trial.` : ""} A one-on-one setup call
              is included.
            </p>
          </div>
        </section>

        {/* The commercial. A short silent cut loops; "Watch" plays all of it with sound. */}
        <section aria-labelledby="home-video-heading" className="px-5 pb-6 sm:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 id="home-video-heading" className="sr-only">
              Watch one job go from the first call to the paid invoice
            </h2>
            <figure className="relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#131712] shadow-[0_28px_80px_-34px_rgba(0,0,0,0.9),0_0_0_1px_rgba(194,160,90,0.08)_inset]">
              <HeroCommercialVideo />
            </figure>
            <p className="mt-3 text-center text-xs text-[#8e826f]">
              One job, from the first call to the paid invoice, in 2 minutes 27 seconds.{" "}
              <Link href={VIDEO_PAGE_PATH} className={textLink}>
                Chapters and transcript
              </Link>
            </p>
          </div>
        </section>

        <div className="px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <SeeAltairInActionSection variant="dark" />
          </div>
        </div>

        <section aria-labelledby="home-compare-heading" className="px-5 pb-6 sm:px-8">
          <div className={`mx-auto max-w-3xl px-5 py-7 sm:px-8 sm:py-9 ${card}`}>
            <p className={eyebrow}>The price, compared</p>
            <h2
              id="home-compare-heading"
              className="mt-3 text-[1.4rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.75rem]"
            >
              What a {comparison.users}-person shop pays each month
            </h2>
            <ul className="mt-5 divide-y divide-[rgba(230,227,220,0.1)]">
              {comparison.rows.map((row) => (
                <li key={row.name} className="flex items-baseline justify-between gap-4 py-3">
                  <span className="min-w-0">
                    <span className={`block text-base font-semibold ${row.ours ? "text-[#fff9ea]" : "text-[#c9bfae]"}`}>
                      {row.name}
                    </span>
                    <span className="block text-xs text-[#8e826f]">
                      {row.plan} plan, {comparison.users} users
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-lg font-semibold tabular-nums ${row.ours ? "text-[#e8d9ac]" : "text-[#c9bfae]"}`}
                  >
                    ${row.monthlyUsd}/mo
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-[#8e826f]">
              Monthly list prices, billed month to month, checked {comparison.checkedOn} on each company&apos;s own
              pricing page. Plans differ in what they include.{" "}
              <Link href={comparison.comparisonPath} className={textLink}>
                See the full comparison
              </Link>{" "}
              ·{" "}
              <Link href="/pricing" className={textLink}>
                All plans and what is not built yet
              </Link>
            </p>
          </div>
        </section>

        <HomepageOnboardingSection />
        <HomepagePricingSection />
        <MarketingFaqSection variant="dark" />

        <section aria-labelledby="home-tools-heading" className="px-5 pb-6 pt-4 sm:px-8">
          <div className="mx-auto max-w-5xl">
            <p className={eyebrow}>Free, no account</p>
            <h2
              id="home-tools-heading"
              className="mt-3 text-[1.4rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.75rem]"
            >
              Six calculators for the numbers that run a shop.
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {RESOURCE_CALCULATORS.map((calculator) => (
                <li key={calculator.slug}>
                  <Link
                    href={calculatorPath(calculator.slug)}
                    className={`block h-full p-5 transition-colors hover:border-[#c2a05a]/60 ${card} ${focusRing}`}
                  >
                    <span className="block text-base font-semibold text-[#fff9ea]">{calculator.title}</span>
                    <span className="mt-2 block text-sm leading-relaxed text-[#c9bfae]">
                      {TOOL_BLURBS[calculator.slug]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex flex-wrap gap-x-6 text-sm">
              <Link href={RESOURCES_CALCULATORS_PATH} className={`inline-flex min-h-9 items-center ${textLink}`}>
                All calculators
              </Link>
              <Link href="/resources/templates" className={`inline-flex min-h-9 items-center ${textLink}`}>
                Free templates
              </Link>
              <Link href="/for-techs" className={`inline-flex min-h-9 items-center ${textLink}`}>
                For technicians
              </Link>
            </p>
          </div>
        </section>

        <section aria-labelledby="home-founder-heading" className="px-5 pb-6 pt-10 sm:px-8">
          <div className={`mx-auto max-w-3xl px-5 py-7 sm:px-8 sm:py-9 ${card}`}>
            <p className={eyebrow}>Who builds it</p>
            <h2
              id="home-founder-heading"
              className="mt-3 text-[1.4rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.75rem]"
            >
              Built by an HVAC company owner.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#c9bfae] sm:text-base">
              Altair Operating System is built by {FOUNDER.name}, who owns an HVAC company. Support email and the
              one-on-one setup call both go to the founder.
            </p>
            <p className="mt-4 text-sm">
              <Link href={ABOUT_PATH} className={textLink}>
                About the company →
              </Link>
            </p>
          </div>
        </section>

        <section className="px-5 pb-16 pt-10 sm:px-8 sm:pb-20">
          <div className="mx-auto max-w-2xl rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[linear-gradient(165deg,rgba(32,37,29,0.72)_0%,rgba(14,17,13,0.92)_100%)] px-5 py-8 text-center sm:px-8 sm:py-9">
            <h2 className="text-[1.4rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.75rem]">
              Try it on your own jobs for {trialDays} days.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#c9bfae] sm:text-base">
              The whole system, no credit card. On the last day nothing is charged: pick a plan to keep going, or let
              it end.
            </p>
            <Link href="/signup" data-cta="home-closing" className={`mt-6 ${primaryButton}`}>
              Start Your {trialDays}-Day Free Trial
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
