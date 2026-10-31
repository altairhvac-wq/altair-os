import type { Metadata } from "next";
import Link from "next/link";
import { listPublicSaasCatalogPlans, SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { HomepageOnboardingSection } from "@/shared/components/homepage/HomepageOnboardingSection";
import { HomepagePricingSection } from "@/shared/components/homepage/HomepagePricingSection";
import { MarketingFaqSection } from "@/shared/components/marketing/MarketingFaqSection";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import {
  buildFaqStructuredData,
  buildSoftwareApplicationStructuredData,
} from "@/shared/lib/site/structured-data";

const TITLE = "HVAC Business Software";
const DESCRIPTION =
  "HVAC software for the whole company: leads, customers and equipment, jobs and dispatch, a technician view for the field, estimates customers approve from their phone, invoices with payment links, time clock, expenses, payroll and reports. 14-day free trial, no credit card.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: "/hvac-software",
    title: `${TITLE} · Altair Operating System`,
    description: DESCRIPTION,
  }),
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";

/**
 * What the product does today, one line each, in the order a job moves.
 * Every item is a shipped module with its own route in the office app
 * (leads, customers, jobs, dispatch, technician, estimates, invoices,
 * time-clock, expenses, payroll, reports). Nothing planned is listed.
 */
const MODULES = [
  {
    title: "Leads",
    text: "Every call and web inquiry becomes a lead with a next step, so nothing waits in a voicemail.",
  },
  {
    title: "Customers and their equipment",
    text: "One record per customer: contacts, addresses, the units on site, service history, estimates and invoices.",
  },
  {
    title: "Jobs and dispatch",
    text: "Scope the job, put it on the board, assign the technician, and move it when the day changes.",
  },
  {
    title: "A technician view for the field",
    text: "Technicians open the day's jobs on their phone, see the customer and the equipment, and record what they did.",
  },
  {
    title: "Estimates customers approve from their phone",
    text: "Build the estimate, send a link, and get the approval back without chasing. Approved work becomes the scheduled job.",
  },
  {
    title: "Invoices and payment links",
    text: "Completed work becomes the invoice with the job attached. With Stripe connected, customers pay from the link.",
  },
  {
    title: "Time clock, expenses and payroll",
    text: "Hours, receipts and pay periods live next to the jobs they belong to, so the books match the work.",
  },
  {
    title: "Reports",
    text: "Revenue, job activity and team performance from the same records your team works in, not a spreadsheet export.",
  },
] as const;

function lowestMonthlyPrice(): number | null {
  const prices = listPublicSaasCatalogPlans()
    .map((plan) => plan.monthlyPriceUsd)
    .filter((price): price is number => typeof price === "number");
  return prices.length ? Math.min(...prices) : null;
}

/**
 * The page an HVAC owner searching for software should land on: what Altair
 * runs, how the trial works, the price, and the questions that stop people,
 * in plain words. It reuses the homepage's onboarding, pricing and FAQ
 * sections so the facts cannot drift between pages.
 */
export default function HvacSoftwarePage() {
  const fromPrice = lowestMonthlyPrice();
  const trialDays = SAAS_TRIAL_CONFIG.durationDays;

  return (
    <>
      <JsonLdScript data={buildSoftwareApplicationStructuredData()} />
      <JsonLdScript data={buildFaqStructuredData()} />
      <div className="mc-homepage relative min-h-dvh overflow-x-clip bg-[#080907] text-[#f3ebdd]">
        <HomepageNav />
        <main className="relative">
          <section className="px-5 pb-12 pt-28 sm:px-8 sm:pb-16 sm:pt-36">
            <div className="mx-auto max-w-3xl text-center">
              <p className="inline-flex items-center rounded-full border border-[rgba(230,227,220,0.14)] bg-[rgba(24,28,22,0.55)] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#c9bfae]">
                HVAC software
              </p>
              <h1 className="ah-hero-display mt-5 text-[2.2rem] font-normal leading-[1.12] tracking-[-0.015em] text-[#fff9ea] sm:text-[3rem] sm:leading-[1.08] lg:text-[3.6rem]">
                Software for running an HVAC company, from the first call to the paid invoice.
              </h1>
              <p className="mx-auto mt-5 max-w-[620px] text-[0.95rem] leading-[1.75] text-[#c9bfae] sm:text-lg sm:leading-[1.8]">
                Altair keeps the customer, the job, the technician and the money
                on one record. The office and the field see the same day, and
                nothing is retyped into a second tool.
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

          <section
            aria-labelledby="hvac-modules-heading"
            className="px-5 py-14 sm:px-8 sm:py-20"
          >
            <div className="mx-auto max-w-5xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">
                What it runs
              </p>
              <h2
                id="hvac-modules-heading"
                className="mt-3 max-w-2xl text-[1.6rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[2rem] sm:leading-[1.2]"
              >
                The whole job, in the order it happens.
              </h2>
              <ol className="mt-8 grid gap-4 sm:grid-cols-2">
                {MODULES.map((module, index) => (
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
              <p className="mt-6 text-sm text-[#8e826f]">
                Built by an HVAC company owner, for HVAC companies first. Plumbing,
                electrical and other field service trades run on the same workflow.
              </p>
            </div>
          </section>

          <section
            aria-labelledby="hvac-trial-heading"
            className="px-5 py-14 sm:px-8 sm:py-20"
          >
            <div className="mx-auto max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">
                How the trial works
              </p>
              <h2
                id="hvac-trial-heading"
                className="mt-3 text-[1.6rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[2rem] sm:leading-[1.2]"
              >
                {trialDays} days with the whole system. Then decide.
              </h2>
              <ol className="mt-8 space-y-4">
                {[
                  ["Create your account", "Name, company, email, password. No card."],
                  ["Confirm your email", "One link in your inbox opens your workspace."],
                  [
                    "Look around with sample data, or bring a real job",
                    "Load sample customers and jobs from Settings and clear them in one step, or take one real job from estimate to paid invoice. That is the test that matters.",
                  ],
                  [
                    "Choose a plan, or let it end",
                    `On day ${trialDays} nothing is charged. Pick a plan and add a card to keep going; otherwise the trial ends and your records stay put.`,
                  ],
                ].map(([title, text], index) => (
                  <li key={title} className="flex items-start gap-4">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#a4823a] font-mono text-xs font-semibold text-[#080907]">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-base font-semibold text-[#fff9ea]">{title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-[#c9bfae]">{text}</p>
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
                Run one real job through it this week.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#c9bfae] sm:text-base">
                Estimate, approval, dispatch, invoice, payment. If it holds up
                on a real job, it will hold up on the rest.
              </p>
              <Link
                href="/signup"
                className={`mt-6 inline-flex items-center justify-center rounded-lg bg-[#a4823a] px-5 py-3.5 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] ${focusRing}`}
              >
                Start Your {trialDays}-Day Free Trial
              </Link>
            </div>
          </section>
        </main>
        <MarketingFooter />
      </div>
    </>
  );
}
