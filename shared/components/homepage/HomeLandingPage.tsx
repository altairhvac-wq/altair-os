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
import { ToolStrip } from "@/shared/components/resources/hub/ToolCards";
import { NextStep } from "@/shared/components/site/NextStep";
import { INTERACTIVE_TOOL_COUNT, hubTool } from "@/shared/lib/resources/tool-hub";
import { ABOUT_PATH, FOUNDER } from "@/shared/lib/site/about";
import { COMMERCIAL_JOB_STEPS, VIDEO_PAGE_PATH } from "@/shared/lib/site/commercial-video";
import { FIVE_USER_PRICE_COMPARISON } from "@/shared/lib/site/comparison-pages";
import { SOFTWARE_PAGES, SOFTWARE_PAGE_ORDER } from "@/shared/lib/site/internal-links";
import { NEXT_STEPS } from "@/shared/lib/site/next-steps";

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
 *
 * ============ WAYS DEEPER (2026-11-20) ============
 * 76 of the 84 visits that started here left after one page: the page
 * offered six trial buttons and little for a visitor not ready to try. Under
 * the film there is now a "Start here" strip (two free tools and the one-job
 * video, with a jump to each step of that job), and the free tools moved up
 * from the bottom with previews of what each one gives you. The trial stays
 * the main button; these are the second path.
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

/** The tools shown on the homepage strip; the hub has the rest. */
const HOME_TOOLS = ["labor-workspace", "invoice-builder", "technician-pay", "break-even"].map(hubTool);

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

        {/* "Before Dawn", the brand film. It loops muted; "Watch" plays it with sound. The step-by-step demo lives on VIDEO_PAGE_PATH. */}
        <section aria-labelledby="home-video-heading" className="px-5 pb-6 sm:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 id="home-video-heading" className="sr-only">
              Before Dawn: the Altair Operating System film
            </h2>
            <figure className="relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#131712] shadow-[0_28px_80px_-34px_rgba(0,0,0,0.9),0_0_0_1px_rgba(194,160,90,0.08)_inset]">
              <HeroCommercialVideo />
            </figure>
            <p className="mt-3 text-center text-xs text-[#8e826f]">
              Film scenes are AI-generated; every app screen is the real product with sample data.{" "}
              <Link href={VIDEO_PAGE_PATH} className={textLink}>
                Watch one job from first call to paid (2:27)
              </Link>
            </p>
          </div>
        </section>

        {/* "Start here": for the visitor who is not ready to try the software yet. */}
        <section className="px-5 pt-10 sm:px-8 sm:pt-14">
          <div className="mx-auto max-w-6xl">
            <NextStep
              tone="dark"
              placement="home-start"
              steps={NEXT_STEPS.home}
              eyebrow="Start here"
              heading="Not ready for a trial? Start with these."
              intro="Two free tools that work without an account, and a short look at one real job in the software."
              trial={false}
            />
            <nav aria-label="One job, step by step" className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e826f]">
                Jump to one step of the job
              </p>
              <ul className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible">
                {COMMERCIAL_JOB_STEPS.map((step) => (
                  <li key={step.seconds} className="shrink-0">
                    <Link
                      href={`${VIDEO_PAGE_PATH}?t=${step.seconds}`}
                      data-track={`next-video-${step.seconds}`}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgba(230,227,220,0.14)] bg-[rgba(24,28,22,0.55)] px-3.5 text-xs text-[#c9bfae] transition-colors hover:border-[#c2a05a]/60 hover:text-[#fff9ea] ${focusRing}`}
                    >
                      <span className="font-semibold tabular-nums text-[#c2a05a]">{step.at}</span>
                      {step.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </section>

        <div className="px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <SeeAltairInActionSection variant="dark" />
          </div>
        </div>

        {/* One link per software page, in the words owners search with. */}
        <section aria-labelledby="home-software-heading" className="px-5 pb-12 sm:px-8">
          <div className="mx-auto max-w-5xl">
            <p className={eyebrow}>Each part of the job</p>
            <h2
              id="home-software-heading"
              className="mt-3 text-[1.4rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.75rem]"
            >
              Dispatch, estimates and invoices on one record.
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {SOFTWARE_PAGE_ORDER.map((path) => {
                const page = SOFTWARE_PAGES[path];
                return (
                  <li key={path}>
                    <Link
                      href={page.href}
                      className={`block h-full p-5 transition-colors hover:border-[#c2a05a]/60 ${card} ${focusRing}`}
                    >
                      <span className="block text-base font-semibold text-[#fff9ea]">{page.label}</span>
                      <span className="mt-2 block text-sm leading-relaxed text-[#c9bfae]">{page.text}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* The free tools, moved up from the bottom of the page, with what each one gives you. */}
        <div className="px-5 pb-14 sm:px-8 sm:pb-16">
          <div className="mx-auto max-w-6xl">
            <ToolStrip
              id="home-tools-heading"
              tone="dark"
              tools={HOME_TOOLS}
              eyebrow="Free, no account"
              heading="Free tools for the numbers that run a shop."
              intro="Each one opens with a worked example you can change. Your numbers stay in your browser."
              hubLabel={`All ${INTERACTIVE_TOOL_COUNT} free tools`}
            />
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

        <nav aria-label="More for owners and technicians" className="px-5 pb-6 pt-4 sm:px-8">
          <p className="mx-auto flex max-w-3xl flex-wrap justify-center gap-x-6 text-sm">
            <Link href="/resources" className={`inline-flex min-h-9 items-center ${textLink}`}>
              All free tools
            </Link>
            <Link href="/resources/templates" className={`inline-flex min-h-9 items-center ${textLink}`}>
              Free templates
            </Link>
            <Link href="/for-techs" className={`inline-flex min-h-9 items-center ${textLink}`}>
              For technicians
            </Link>
            <Link href="/directory" className={`inline-flex min-h-9 items-center ${textLink}`}>
              Contractor directory
            </Link>
          </p>
        </nav>

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
