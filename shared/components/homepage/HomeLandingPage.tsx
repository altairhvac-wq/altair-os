import Link from "next/link";
import { swipeItem, swipeRow } from "@/shared/components/marketing/phone/phone-classes";
import { Check } from "lucide-react";
import { listPublicSaasCatalogPlans, SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";
import { HeroCommercialVideo } from "@/shared/components/auth/HeroCommercialVideo";
import { LOGIN_HERO_SUBCOPY, LOGIN_HERO_TITLE } from "@/shared/components/auth/LoginMarketingPanel";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { HomepagePricingSection } from "@/shared/components/homepage/HomepagePricingSection";
import { HomeTryItSection } from "@/shared/components/homepage/HomeTryItSection";
import { MarketingFaqSection } from "@/shared/components/marketing/MarketingFaqSection";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { ToolStrip } from "@/shared/components/resources/hub/ToolCards";
import { INTERACTIVE_TOOL_COUNT, hubTool } from "@/shared/lib/resources/tool-hub";
import { ABOUT_PATH, FOUNDER } from "@/shared/lib/site/about";
import { VIDEO_PAGE_PATH } from "@/shared/lib/site/commercial-video";
import { FIVE_USER_PRICE_COMPARISON } from "@/shared/lib/site/comparison-pages";
import { SOFTWARE_PAGES, SOFTWARE_PAGE_ORDER } from "@/shared/lib/site/internal-links";

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
 *
 * ============ HANDS-ON (2026-11-21) ============
 * The film moved beside the headline on wide screens, so the first screen
 * shows what the product is, what it costs, and the product itself. The five
 * tall still screenshots and the "Start here" strip were replaced by "Try it
 * right here" (HomeTryItSection): the software pages' hands-on demos, one tap
 * apart, each ending with its in-depth page and its moment in the job video.
 * The price comparison, the setup call and the founder note became one "Why
 * shops pick it" band (the setup-call card keeps id="onboarding" for old
 * links). The page got shorter and every section now leads somewhere.
 */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";
const primaryButton = `inline-flex min-h-12 items-center justify-center rounded-lg bg-[#a4823a] px-8 py-3.5 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] ${focusRing}`;
const secondaryButton = `inline-flex min-h-12 items-center justify-center rounded-lg border border-[rgba(230,227,220,0.18)] px-8 py-3.5 text-sm font-semibold text-[#fbf7ef] transition-colors hover:border-[rgba(230,227,220,0.32)] ${focusRing}`;
const textLink = `font-semibold text-[#c2a05a] underline-offset-4 hover:text-[#e8d9ac] hover:underline ${focusRing}`;
/*
 * Light bands (2026-11-21, owner: "a little hard to look at when everything is black. I don't know where my
 * eyes should go"). The page alternates dark and warm-cream sections, with gold only where the eye should
 * land: the glow behind the film, our row in the price comparison, and the closing band.
 */
const lightBand = "bg-[linear-gradient(180deg,#f8f3ea_0%,#f2eadb_100%)] text-[#14120e]";
const lightEyebrow = "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#77591B]";
const lightCard =
  "rounded-2xl border border-[#e4d9c4] bg-white shadow-[0_1px_2px_rgba(20,18,14,0.04),0_14px_34px_-24px_rgba(90,68,24,0.35)]";
const lightFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a4823a]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5efe3]";
const lightLink =
  "font-semibold text-[#77591B] underline-offset-4 hover:text-[#14120e] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a4823a]/60";

function lowestMonthlyPrice(): number | null {
  const prices = listPublicSaasCatalogPlans()
    .map((plan) => plan.monthlyPriceUsd)
    .filter((price): price is number => typeof price === "number");
  return prices.length ? Math.min(...prices) : null;
}

/** The short promises under the hero buttons; each one is stated in the FAQ (shared/lib/site/faq.ts). */
function trustPoints(fromPrice: number | null): string[] {
  return [
    "No credit card to start",
    "Free setup call on Zoom",
    fromPrice !== null ? `From $${fromPrice}/month after` : "Monthly or annual plans",
    "No long-term contract",
  ];
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
        {/* 1. DARK, with one warm light behind the film: the first place the eye goes. */}
        <section className="relative isolate px-5 pb-14 pt-28 sm:px-8 sm:pt-36 lg:pb-20 lg:pt-32">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_65%_at_72%_42%,rgba(194,160,90,0.22)_0%,rgba(194,160,90,0.06)_45%,transparent_75%),linear-gradient(180deg,#0d110c_0%,#080907_100%)]"
          />
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-12">
            <div className="text-center lg:text-left">
              <p className="inline-flex items-center rounded-full border border-[rgba(194,160,90,0.35)] bg-[rgba(164,130,58,0.12)] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e8d9ac]">
                HVAC and field service software
              </p>
              <h1 className="ah-hero-display mt-5 text-[2.2rem] font-normal leading-[1.12] tracking-[-0.015em] text-[#fff9ea] sm:text-[3rem] sm:leading-[1.08] lg:text-[3.3rem]">
                {LOGIN_HERO_TITLE}
              </h1>
              <p className="mx-auto mt-5 max-w-[620px] text-[0.95rem] leading-[1.75] text-[#d6ccba] sm:text-lg sm:leading-[1.8] lg:mx-0">
                {LOGIN_HERO_SUBCOPY}
              </p>
              <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
                <Link href="/signup" data-cta="home-hero" className={primaryButton}>
                  Start Your {trialDays}-Day Free Trial
                </Link>
                <Link href="#home-try-heading" data-track="home-hero-try" className={secondaryButton}>
                  Try it here first
                </Link>
              </div>
              <ul className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-x-5 gap-y-2.5 text-left text-[13px] text-[#d6ccba] sm:text-sm lg:mx-0">
                {trustPoints(fromPrice).map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#c2a05a]" />
                    {point}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[13px] text-[#8e826f]">
                Already a customer?{" "}
                <Link href="/login" className={textLink}>
                  Sign in
                </Link>
              </p>
            </div>

            {/* "Before Dawn", the brand film. It loops muted; "Watch" plays it with sound. The step-by-step demo lives on VIDEO_PAGE_PATH. */}
            <section aria-labelledby="home-video-heading">
              <h2 id="home-video-heading" className="sr-only">
                Before Dawn: the Altair Operating System film
              </h2>
              <figure className="relative overflow-hidden rounded-[1.4rem] border border-[rgba(194,160,90,0.28)] bg-[#131712] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.95),0_0_80px_-30px_rgba(194,160,90,0.45)]">
                <HeroCommercialVideo />
              </figure>
              <p className="mt-3 text-center text-xs text-[#8e826f] lg:text-left">
                Film scenes are AI-generated; every app screen is the real product with sample data.{" "}
                <Link href={VIDEO_PAGE_PATH} className={textLink}>
                  Watch one job from first call to paid (2:27)
                </Link>
              </p>
            </section>
          </div>
        </section>

        {/* 2. LIGHT: the hands-on part, then one card per software page. */}
        <div className={`${lightBand} pb-16 sm:pb-24`}>
          <HomeTryItSection />

          {/* One link per software page, in the words owners search with. */}
          <section aria-labelledby="home-software-heading" className="px-5 pt-16 sm:px-8 sm:pt-20">
            <div className="mx-auto max-w-6xl">
              <p className={lightEyebrow}>Each part of the job</p>
              <h2
                id="home-software-heading"
                className="mt-3 text-[1.4rem] font-semibold tracking-tight text-[#14120e] sm:text-[1.75rem]"
              >
                Dispatch, estimates and invoices on one record.
              </h2>
              <ul className={`mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${swipeRow}`}>
                {SOFTWARE_PAGE_ORDER.map((path) => {
                  const page = SOFTWARE_PAGES[path];
                  return (
                    <li key={path} className={swipeItem}>
                      <Link
                        href={page.href}
                        className={`group flex h-full flex-col p-5 transition-[border-color,box-shadow] hover:border-[#c2a05a] hover:shadow-[0_18px_40px_-22px_rgba(120,90,30,0.45)] ${lightCard} ${lightFocus}`}
                      >
                        <span className="block text-base font-semibold text-[#14120e]">{page.label}</span>
                        <span className="mt-2 block text-sm leading-relaxed text-stone-600">{page.text}</span>
                        <span className="mt-auto pt-4 text-[13px] font-semibold text-[#77591B] group-hover:text-[#14120e]">
                          See how it works →
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        </div>

        {/* 3. DARK OLIVE: the free tools. */}
        <div className="relative isolate px-5 py-16 sm:px-8 sm:py-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_60%_at_15%_0%,rgba(194,160,90,0.14)_0%,transparent_70%),linear-gradient(180deg,#10150f_0%,#0b0e0a_100%)]"
          />
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

        {/* 4. LIGHT: why shops pick it. */}
        <section aria-labelledby="home-why-heading" className={`${lightBand} px-5 py-16 sm:px-8 sm:py-24`}>
          <div className="mx-auto max-w-6xl">
            <p className={lightEyebrow}>Why shops pick it</p>
            <h2
              id="home-why-heading"
              className="mt-3 text-[1.6rem] font-semibold tracking-tight text-[#14120e] sm:text-[2.1rem]"
            >
              Priced for small shops. Set up with you. Built by one of you.
            </h2>
            <div className={`mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)] ${swipeRow}`}>
              <div className={`flex flex-col p-5 sm:p-6 ${lightCard} ${swipeItem}`}>
                <p className="text-sm font-semibold text-[#14120e]">What a {comparison.users}-person shop pays each month</p>
                <ul className="mt-3 space-y-1.5">
                  {comparison.rows.map((row) => (
                    <li
                      key={row.name}
                      className={`flex items-baseline justify-between gap-4 rounded-lg px-3 py-2.5 ${
                        row.ours ? "bg-[#14120e] text-[#fff9ea]" : "bg-[#f7f2e8]"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className={`block text-[15px] font-semibold ${row.ours ? "text-[#fff9ea]" : "text-stone-700"}`}>
                          {row.name}
                        </span>
                        <span className={`block text-xs ${row.ours ? "text-[#c9bfae]" : "text-stone-500"}`}>
                          {row.plan} plan
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-lg font-semibold tabular-nums ${row.ours ? "text-[#e8d9ac]" : "text-stone-700"}`}
                      >
                        ${row.monthlyUsd}/mo
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-auto pt-4 text-xs leading-relaxed text-stone-500">
                  Monthly list prices for {comparison.users} users, checked {comparison.checkedOn} on each company&apos;s
                  own pricing page. Plans differ in what they include.{" "}
                  <Link href={comparison.comparisonPath} className={lightLink}>
                    Full comparison
                  </Link>
                </p>
              </div>

              <div id="onboarding" className={`flex scroll-mt-24 flex-col p-5 sm:p-6 ${lightCard} ${swipeItem}`}>
                <p className="text-sm font-semibold text-[#14120e]">A one-on-one setup call, included</p>
                <p className="mt-3 text-sm leading-relaxed text-stone-600">
                  Every plan includes a free setup call on Zoom, booked at a time that suits you: setup, workflow
                  guidance and your questions. You book it from your workspace after you sign up.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-stone-700">
                  {["Business setup", "Workflow guidance", "Your own questions"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-[#a4823a]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-auto pt-4 text-sm">
                  <Link href={VIDEO_PAGE_PATH} className={lightLink}>
                    How it works →
                  </Link>
                </p>
              </div>

              <div className={`flex flex-col p-5 sm:p-6 ${lightCard} ${swipeItem}`}>
                <p className="text-sm font-semibold text-[#14120e]">Built by an HVAC company owner</p>
                <p className="mt-3 text-sm leading-relaxed text-stone-600">
                  Altair Operating System is built by {FOUNDER.name}, who owns an HVAC company. Support email and the
                  one-on-one setup call both go to the founder.
                </p>
                <p className="mt-auto pt-4 text-sm">
                  <Link href={ABOUT_PATH} className={lightLink}>
                    About the company →
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. DARK with a warm light under the plans. */}
        <div className="relative isolate py-6 sm:py-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(45%_55%_at_50%_60%,rgba(194,160,90,0.16)_0%,transparent_70%),linear-gradient(180deg,#0b0e0a_0%,#080907_100%)]"
          />
          <HomepagePricingSection />
        </div>

        {/* 6. LIGHT: questions, and where else to go. */}
        <div className={`${lightBand} pb-12 pt-4 sm:pt-8`}>
          <MarketingFaqSection variant="light" />
          <nav aria-label="More for owners and technicians" className="px-5 pt-2 sm:px-8">
            <p className="mx-auto flex max-w-3xl flex-wrap justify-center gap-x-6 text-sm">
              <Link href="/resources" className={`inline-flex min-h-9 items-center ${lightLink}`}>
                All free tools
              </Link>
              <Link href="/resources/templates" className={`inline-flex min-h-9 items-center ${lightLink}`}>
                Free templates
              </Link>
              <Link href="/for-techs" className={`inline-flex min-h-9 items-center ${lightLink}`}>
                For technicians
              </Link>
              <Link href="/directory" className={`inline-flex min-h-9 items-center ${lightLink}`}>
                Contractor directory
              </Link>
            </p>
          </nav>
        </div>

        {/* 7. GOLD: the one closing ask. */}
        <section className="relative isolate overflow-hidden px-5 py-16 text-center sm:px-8 sm:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_120%_at_50%_0%,#e2c27e_0%,#b8954a_55%,#8f6f2c_100%)]"
          />
          <div className="mx-auto max-w-2xl">
            <h2 className="text-[1.6rem] font-semibold tracking-tight text-[#14120e] sm:text-[2.1rem]">
              Try it on your own jobs for {trialDays} days.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#2a2416] sm:text-base">
              The whole system, no credit card. On the last day nothing is charged: pick a plan to keep going, or let
              it end.
            </p>
            <Link
              href="/signup"
              data-cta="home-closing"
              className="mt-7 inline-flex min-h-12 items-center justify-center rounded-lg bg-[#14120e] px-8 py-3.5 text-sm font-semibold text-[#fff9ea] shadow-[0_18px_40px_-18px_rgba(20,18,14,0.7)] transition-colors hover:bg-[#2a2620] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14120e]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#c9a65c]"
            >
              Start Your {trialDays}-Day Free Trial
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
