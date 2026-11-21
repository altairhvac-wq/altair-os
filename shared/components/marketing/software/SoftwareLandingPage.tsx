import Link from "next/link";
import { ArrowRight, Check, CircleSlash, PlayCircle } from "lucide-react";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { MarketingFaqSection } from "@/shared/components/marketing/MarketingFaqSection";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { ProductScreenshotPlaceholder } from "@/shared/components/marketing/ProductScreenshotPlaceholder";
import { SHOWCASE_ITEMS } from "@/shared/components/marketing/SeeAltairInActionSection";
import { NextStep } from "@/shared/components/site/NextStep";
import { PRICING_FACTS, formatUsd, pricedPlans } from "@/shared/lib/pricing/plan-calculator";
import { VIDEO_PAGE_PATH } from "@/shared/lib/site/commercial-video";
import { SOFTWARE_PAGES, SOFTWARE_PAGE_ORDER, type SoftwarePagePath } from "@/shared/lib/site/internal-links";
import type { NextStepItem } from "@/shared/lib/site/next-steps";
import type { ShotId, SoftwarePageContent } from "@/shared/lib/site/software-pages";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";
const eyebrowClass = "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]";
const h2Class = "mt-3 max-w-3xl text-[1.6rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[2.1rem] sm:leading-[1.15]";
const card = "rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[rgba(14,17,13,0.6)]";
const primaryButton = `inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#a4823a] px-7 py-3.5 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] ${focusRing}`;
const secondaryButton = `inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[rgba(230,227,220,0.18)] px-7 py-3.5 text-sm font-semibold text-[#fbf7ef] transition-colors hover:border-[rgba(230,227,220,0.36)] ${focusRing}`;
const textLink = `font-semibold text-[#c2a05a] underline-offset-4 hover:text-[#e8d9ac] hover:underline ${focusRing}`;

function Shot({ id, className = "" }: { readonly id: ShotId; readonly className?: string }) {
  const shot = SHOWCASE_ITEMS.find((item) => item.id === id);
  if (!shot?.imageSrc) return null;
  return (
    <ProductScreenshotPlaceholder
      alt={shot.imageAlt}
      label={shot.imageLabel}
      src={shot.imageSrc}
      mobileSrc={shot.imageSrcMobile}
      className={className}
    />
  );
}

/** Estimate → job → invoice → payment, with this page's part lit. */
const WORKFLOW: readonly { readonly title: string; readonly text: string; readonly path: SoftwarePagePath; readonly anchor: string }[] = [
  { title: "Estimate", text: "Built from the price book, approved and signed on the customer's phone.", path: "/hvac-estimating-software", anchor: "#estimating-demo" },
  { title: "Job", text: "The approved estimate becomes the job, assigned on the day's board.", path: "/hvac-dispatch-software", anchor: "#dispatch-demo" },
  { title: "Invoice", text: "The completed job drafts the invoice from the approved lines.", path: "/hvac-invoicing-software", anchor: "#invoicing-demo" },
  { title: "Payment", text: "Paid by card from the link, or cash and checks recorded against it.", path: "/hvac-invoicing-software", anchor: "#invoicing-demo" },
];

function WorkflowRail({ current }: { readonly current: SoftwarePagePath }) {
  const overview = current === "/hvac-software";
  return (
    <section aria-labelledby="workflow-heading" className="px-5 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <p className={eyebrowClass}>Where this fits</p>
        <h2 id="workflow-heading" className={h2Class}>
          Estimate to job to invoice to payment, on one record.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#c9bfae] sm:text-base">
          Each part hands the same record to the next, so nothing is typed twice. Every stop has its own hands-on demo.
        </p>
        <ol className="mt-8 grid gap-3 md:grid-cols-4">
          {WORKFLOW.map((stage, index) => {
            const lit = overview || stage.path === current;
            const here = stage.path === current && !overview;
            return (
              <li key={stage.title} className="relative">
                <Link
                  href={here ? stage.anchor : `${stage.path}${stage.anchor}`}
                  className={`group flex h-full flex-col rounded-2xl border p-5 transition-colors ${
                    lit
                      ? "border-[#c2a05a]/55 bg-[linear-gradient(165deg,rgba(50,42,25,0.6),rgba(14,17,13,0.92))]"
                      : "border-[rgba(230,227,220,0.12)] bg-[rgba(14,17,13,0.6)] hover:border-[rgba(230,227,220,0.3)]"
                  } ${focusRing}`}
                >
                  <span className="flex items-center justify-between">
                    <span className={`font-mono text-[11px] font-semibold tracking-[0.14em] ${lit ? "text-[#e8d9ac]" : "text-[#8e826f]"}`}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {here ? (
                      <span className="rounded-full bg-[#a4823a]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#e8d9ac] ring-1 ring-inset ring-[#c2a05a]/35">
                        This page
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-3 text-lg font-semibold text-[#fff9ea]">{stage.title}</span>
                  <span className="mt-1.5 text-sm leading-relaxed text-[#c9bfae]">{stage.text}</span>
                  <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[13px] font-semibold text-[#c2a05a]">
                    {here ? "Try it above" : `See ${SOFTWARE_PAGES[stage.path].label}`}
                    <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
                {index < WORKFLOW.length - 1 ? (
                  <span aria-hidden="true" className="absolute -right-2.5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[#080907] text-[#c2a05a] ring-1 ring-[#c2a05a]/40 md:flex">
                    <ArrowRight className="h-3 w-3" />
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/**
 * The software page template: hero, a hands-on demo, where it fits in the
 * workflow, how it works with real product screens, the feature breakdown,
 * what is not built yet, the plans, the FAQ (the page emits its FAQPage
 * JSON-LD from the same list), free tools and the next step.
 *
 * Server-rendered; only the demo (passed in) and the screenshot lightbox run
 * on the client. Copy lives in shared/lib/site/software-pages.ts.
 */
export function SoftwareLandingPage({
  content,
  demo,
  afterDemo,
  nextSteps,
}: {
  readonly content: SoftwarePageContent;
  readonly demo: React.ReactNode;
  /** Optional section under the demo (the video on /hvac-software). */
  readonly afterDemo?: React.ReactNode;
  readonly nextSteps: readonly NextStepItem[];
}) {
  const trialDays = PRICING_FACTS.trialDays;
  const plans = pricedPlans();
  const fromPrice = plans.length ? Math.min(...plans.map((plan) => plan.monthlyPriceUsd)) : null;
  const siblings = SOFTWARE_PAGE_ORDER.filter((path) => path !== content.path).map((path) => SOFTWARE_PAGES[path]);
  const slug = content.path.replace(/^\//, "");

  return (
    <div className="mc-homepage relative min-h-dvh overflow-x-clip bg-[#080907] text-[#f3ebdd]">
      <HomepageNav />
      <main className="relative">
        {/* ---------------- hero ---------------- */}
        <section className="relative px-5 pb-10 pt-28 sm:px-8 sm:pb-14 sm:pt-36">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_50%_at_70%_20%,rgba(194,160,90,0.12),transparent_70%)]"
          />
          <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
            <div className="text-center lg:text-left">
              <p className="inline-flex items-center rounded-full border border-[rgba(230,227,220,0.14)] bg-[rgba(24,28,22,0.55)] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#c9bfae]">
                {content.hero.eyebrow}
              </p>
              <h1 className="ah-hero-display mt-5 text-[2.1rem] font-normal leading-[1.1] tracking-[-0.015em] text-[#fff9ea] sm:text-[2.8rem] lg:text-[3.1rem]">
                {content.hero.headline}
              </h1>
              <p className="mx-auto mt-5 max-w-[620px] text-[0.95rem] leading-[1.75] text-[#c9bfae] sm:text-lg sm:leading-[1.8] lg:mx-0">
                {content.hero.intro}
              </p>
              <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
                <a href={`#${content.demo.anchor}`} className={primaryButton}>
                  {content.hero.demoLabel}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </a>
                <Link href="/signup" data-cta={`${slug}-hero`} className={secondaryButton}>
                  Start Your {trialDays}-Day Free Trial
                </Link>
              </div>
              <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] text-[#a89c88] lg:justify-start">
                {[
                  "No credit card to start",
                  fromPrice !== null ? `Plans from ${formatUsd(fromPrice)}/month` : null,
                  "One-on-one setup call included",
                ]
                  .filter((fact): fact is string => Boolean(fact))
                  .map((fact) => (
                    <li key={fact} className="flex items-center gap-1.5">
                      <Check aria-hidden="true" className="h-3.5 w-3.5 text-[#c2a05a]" />
                      {fact}
                    </li>
                  ))}
              </ul>
            </div>
            <div className="min-w-0">
              <Shot id={content.hero.shot} />
              <p className="mt-2 text-center text-xs text-[#8e826f] lg:text-right">The real product, with a sample company.</p>
            </div>
          </div>
        </section>

        {/* ---------------- the demo ---------------- */}
        <section aria-labelledby="demo-heading" className="px-3 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <div className="px-2 sm:px-0">
              <p className={eyebrowClass}>{content.demo.eyebrow}</p>
              <h2 id="demo-heading" className={h2Class}>
                {content.demo.heading}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#c9bfae] sm:text-base">{content.demo.intro}</p>
            </div>
            <div className="mt-7">{demo}</div>
          </div>
        </section>

        {afterDemo}

        <WorkflowRail current={content.path} />

        {/* ---------------- how it works, with real screens ---------------- */}
        <section id={content.stepsId ?? "how-it-works"} aria-labelledby="steps-heading" className="scroll-mt-24 px-5 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <p className={eyebrowClass}>How it works</p>
            <h2 id="steps-heading" className={h2Class}>
              {content.stepsHeading}
            </h2>
            <ol className="mt-10 space-y-8 sm:space-y-12">
              {content.steps.map((step, index) => (
                <li
                  key={step.title}
                  className={
                    step.shot
                      ? `flex flex-col gap-5 lg:items-center lg:gap-12 ${index % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"}`
                      : `${card} p-5 sm:p-6 lg:mx-auto lg:max-w-3xl`
                  }
                >
                  {step.shot ? (
                    <div className="min-w-0 flex-1 lg:flex-[1.5]">
                      <Shot id={step.shot} />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1 lg:max-w-md">
                    <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-[#c2a05a]">STEP {index + 1}</p>
                    <h3 className="mt-2 text-lg font-semibold text-[#fff9ea] sm:text-xl">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#c9bfae] sm:text-[15px]">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-10 text-center text-xs text-[#8e826f]">
              Screens from a sample HVAC company; no real customers.{" "}
              <Link href={VIDEO_PAGE_PATH} className={textLink}>
                Watch one job go from first call to paid (2:27)
              </Link>
            </p>
          </div>
        </section>

        {/* ---------------- feature by feature ---------------- */}
        <section aria-labelledby="features-heading" className="px-5 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <p className={eyebrowClass}>Feature by feature</p>
            <h2 id="features-heading" className={h2Class}>
              {content.featuresHeading}
            </h2>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {content.features.map((feature) => (
                <li key={feature.title} className={`${card} p-5`}>
                  <p className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#a4823a]/20 ring-1 ring-inset ring-[#c2a05a]/40">
                      <Check aria-hidden="true" className="h-3 w-3 text-[#e8d9ac]" />
                    </span>
                    <span className="text-base font-semibold text-[#fff9ea]">{feature.title}</span>
                  </p>
                  <p className="mt-2 pl-[1.875rem] text-sm leading-relaxed text-[#c9bfae]">{feature.text}</p>
                </li>
              ))}
            </ul>

            {content.notYet.length ? (
              <div className="mt-8 rounded-2xl border border-[rgba(230,227,220,0.14)] bg-[rgba(8,9,7,0.5)] p-5 sm:p-6">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#fff9ea]">
                  <CircleSlash aria-hidden="true" className="h-4 w-4 text-[#c2a05a]" />
                  Not built yet, so you know before the trial
                </p>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                  {content.notYet.map((item) => (
                    <li key={item.title} className="text-sm leading-relaxed">
                      <span className="block font-semibold text-[#f3ebdd]">{item.title}</span>
                      <span className="block text-[#a89c88]">Today: {item.today}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-[rgba(230,227,220,0.1)] pt-4 text-sm leading-relaxed text-[#a89c88]">
                  {content.scopeNote}{" "}
                  <Link href="/pricing#not-yet" className={textLink}>
                    The full list
                  </Link>
                </p>
              </div>
            ) : null}
          </div>
        </section>

        {/* ---------------- the plans ---------------- */}
        <section aria-labelledby="plans-heading" className="px-5 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className={eyebrowClass}>Price</p>
                <h2 id="plans-heading" className={h2Class}>
                  Every feature on every plan. You pay by team size.
                </h2>
              </div>
              <Link href="/pricing#plan-finder" className={secondaryButton}>
                Price it for my team
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
            <ul className="mt-8 grid gap-3 md:grid-cols-3">
              {plans.map((plan) => (
                <li
                  key={plan.planKey}
                  className={`rounded-2xl border p-5 ${
                    plan.planKey === "growth"
                      ? "border-[#c2a05a]/50 bg-[linear-gradient(165deg,rgba(50,42,25,0.6),rgba(14,17,13,0.92))]"
                      : "border-[rgba(230,227,220,0.12)] bg-[rgba(14,17,13,0.6)]"
                  }`}
                >
                  <p className="text-base font-semibold text-[#fff9ea]">{plan.label}</p>
                  <p className="mt-2">
                    <span className="font-mono text-3xl font-semibold text-[#fff9ea]">{formatUsd(plan.monthlyPriceUsd)}</span>
                    <span className="text-sm text-[#9a9080]"> / month</span>
                  </p>
                  <p className="mt-1 text-sm text-[#9a9080]">
                    or {formatUsd(plan.annualPriceUsd)}/year, save {formatUsd(plan.annualSavingsUsd)}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-[#f3ebdd]">
                    {plan.extraUserMonthlyUsd !== null
                      ? `${plan.includedUsers} users, then ${formatUsd(plan.extraUserMonthlyUsd)}/month each`
                      : plan.includedUsers === 1
                        ? "1 user"
                        : `Up to ${plan.includedUsers} users`}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-[#8e826f]">
              {trialDays}-day free trial with up to {PRICING_FACTS.trialUsers} users, no credit card. Cancel from Settings any
              time.{" "}
              <Link href="/pricing#terms" className={textLink}>
                The terms in plain words
              </Link>
            </p>
          </div>
        </section>

        <MarketingFaqSection
          variant="dark"
          items={content.faq}
          eyebrowText="Questions"
          headingText={content.faqHeading}
          introText="Straight answers, including what it does not do yet."
        />

        {/* ---------------- free tools and guides ---------------- */}
        <section aria-labelledby="tools-heading" className="px-5 pb-6 pt-4 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <p className={eyebrowClass}>Free for owners, no account</p>
            <h2 id="tools-heading" className="mt-3 text-[1.4rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.75rem]">
              {content.toolsHeading}
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {content.tools.map((tool) => (
                <li key={tool.href}>
                  <Link href={tool.href} className={`group flex h-full flex-col p-5 transition-colors hover:border-[#c2a05a]/60 ${card} ${focusRing}`}>
                    {tool.meta ? <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8e826f]">{tool.meta}</span> : null}
                    <span className="mt-1 block text-base font-semibold text-[#fff9ea]">{tool.title}</span>
                    <span className="mt-2 block text-sm leading-relaxed text-[#c9bfae]">{tool.text}</span>
                    <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold text-[#c2a05a]">
                      Open it
                      <ArrowRight aria-hidden="true" className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="px-5 pt-10 sm:px-8">
          <NextStep
            className="mx-auto max-w-6xl"
            tone="dark"
            placement={slug}
            steps={nextSteps}
            eyebrow="Your next step"
            heading="Keep following the job"
            trial={false}
          />
        </div>

        {/* ---------------- closing ---------------- */}
        <section className="px-5 pb-16 pt-10 sm:px-8 sm:pb-20">
          <div className="mx-auto max-w-2xl rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[linear-gradient(165deg,rgba(32,37,29,0.72)_0%,rgba(14,17,13,0.92)_100%)] px-5 py-8 text-center sm:px-8 sm:py-9">
            <h2 className="text-[1.4rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.75rem]">{content.closing.heading}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#c9bfae] sm:text-base">{content.closing.text}</p>
            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link href="/signup" data-cta={`${slug}-closing`} className={primaryButton}>
                Start Your {trialDays}-Day Free Trial
              </Link>
              <Link href={VIDEO_PAGE_PATH} className={secondaryButton}>
                <PlayCircle aria-hidden="true" className="h-4 w-4" />
                Watch one job (2:27)
              </Link>
            </div>
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-[#8e826f]">
            Also:{" "}
            {siblings.map((page, index) => (
              <span key={page.href}>
                {index > 0 ? " · " : ""}
                <Link href={page.href} className={textLink}>
                  {page.label}
                </Link>
              </span>
            ))}
          </p>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
