import Link from "next/link";
import { CalendarCheck, Check } from "lucide-react";
import { SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { SwitchAppTabs } from "@/shared/components/marketing/switch/SwitchAppTabs";
import { BAND, GOLD_BUTTON, GOLD_SECONDARY_BUTTON, TONE } from "@/shared/lib/site/bands";
import { SWITCH_FACTS_CHECKED, SWITCH_FACTS_CHECKED_ISO, SWITCH_FAQ, SWITCH_PAGE } from "@/shared/lib/site/switch-page";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";

/** Three things the product does today, for the owner who is about to move. */
const WHY_STAY = [
  {
    title: "Prices on the website",
    text: "Starter, Growth and Pro, billed monthly or yearly. No long contract, and you cancel from Settings.",
  },
  {
    title: "Customers approve from their phone",
    text: "Estimates go out as a link. The customer approves on their phone and the office sees it right away.",
  },
  {
    title: "Technicians get a phone view",
    text: "Today’s jobs and addresses, with arrive and finish buttons, in the browser on any phone. Nothing to install.",
  },
] as const;

/**
 * /switch: moving to Altair from another app, one tab per app.
 * Content and sources: shared/lib/site/switch-page.ts.
 */
export function SwitchPage({ bookingUrl }: { bookingUrl: string | null }) {
  const trialDays = SAAS_TRIAL_CONFIG.durationDays;

  return (
    <div className="mc-homepage relative min-h-dvh overflow-x-clip bg-[#080907] text-[#f3ebdd]">
      <HomepageNav />
      <main className="relative">
        {/* hero */}
        <section className={`${BAND.hero} px-5 pb-14 pt-28 sm:px-8 sm:pb-20 sm:pt-36`}>
          <div className="mx-auto max-w-5xl">
            <p className="inline-flex items-center rounded-full border border-[rgba(194,160,90,0.35)] bg-[rgba(164,130,58,0.12)] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e8d9ac]">
              {SWITCH_PAGE.eyebrow}
            </p>
            <h1 className="ah-hero-display mt-5 max-w-3xl text-[2.2rem] font-normal leading-[1.1] tracking-[-0.015em] text-[#fff9ea] sm:text-[3.3rem] sm:leading-[1.05]">
              {SWITCH_PAGE.headline}
            </h1>
            <p className="mt-5 max-w-2xl text-[1rem] leading-[1.75] text-[#d6ccba] sm:text-lg sm:leading-[1.8]">
              {SWITCH_PAGE.intro}
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                data-track="switch-hero-trial"
                className={`inline-flex min-h-12 items-center justify-center rounded-lg bg-[#a4823a] px-8 py-3.5 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] ${focusRing}`}
              >
                Start your {trialDays}-day trial
              </Link>
              {bookingUrl ? (
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="switch-hero-call"
                  className={`inline-flex min-h-12 items-center justify-center rounded-lg border border-[rgba(230,227,220,0.18)] px-8 py-3.5 text-sm font-semibold text-[#fbf7ef] transition-colors hover:border-[rgba(230,227,220,0.32)] ${focusRing}`}
                >
                  Book a setup call
                </a>
              ) : null}
            </div>
            <p className="mt-4 text-[13px] text-[#8e826f] sm:text-sm">No credit card for the trial. Cancel anytime.</p>
            <ul className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-x-7">
              {SWITCH_PAGE.facts.map((fact) => (
                <li key={fact} className="flex items-start gap-2 text-sm text-[#f3ebdd]">
                  <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#c2a05a]" strokeWidth={3} />
                  {fact}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* the apps */}
        <section aria-label="Steps for your current app" className={`${BAND.light} px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14`}>
          <div className="mx-auto max-w-5xl">
            <SwitchAppTabs />
          </div>
        </section>

        {/* why stay */}
        <section aria-labelledby="switch-why-heading" className={`${BAND.dark} px-5 py-16 sm:px-8 sm:py-20`}>
          <div className="mx-auto max-w-5xl">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${TONE.dark.eyebrow}`}>After the move</p>
            <h2 id="switch-why-heading" className={`mt-3 text-[1.6rem] font-semibold tracking-tight sm:text-[2rem] ${TONE.dark.heading}`}>
              Why shops that switch stay
            </h2>
            <p className={`mt-2 max-w-2xl text-[15px] leading-relaxed ${TONE.dark.body}`}>Every line here is something the product does today.</p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {WHY_STAY.map((item) => (
                <div key={item.title} className={`p-5 ${TONE.dark.card}`}>
                  <h3 className={`text-base font-semibold ${TONE.dark.heading}`}>{item.title}</h3>
                  <p className={`mt-2 text-[14.5px] leading-relaxed ${TONE.dark.body}`}>{item.text}</p>
                </div>
              ))}
            </div>
            <p className={`mt-6 text-sm ${TONE.dark.muted}`}>
              Comparing first?{" "}
              <Link href="/servicetitan-alternative" className={TONE.dark.link}>
                Altair and ServiceTitan
              </Link>{" "}
              ·{" "}
              <Link href="/jobber-housecall-pro-alternatives" className={TONE.dark.link}>
                Altair, Jobber and Housecall Pro
              </Link>{" "}
              ·{" "}
              <Link href="/pricing" className={TONE.dark.link}>
                Pricing
              </Link>
            </p>
          </div>
        </section>

        {/* questions */}
        <section aria-labelledby="switch-faq-heading" className={`${BAND.light} px-5 py-16 sm:px-8 sm:py-20`}>
          <div className="mx-auto max-w-3xl">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${TONE.light.eyebrow}`}>Before you move</p>
            <h2 id="switch-faq-heading" className={`mt-3 text-[1.6rem] font-semibold tracking-tight sm:text-[2rem] ${TONE.light.heading}`}>
              Questions owners ask about switching
            </h2>
            <div className="mt-7 space-y-3">
              {SWITCH_FAQ.map((entry) => (
                <details key={entry.id} className={`group ${TONE.light.card}`}>
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3.5 text-[15px] font-semibold text-[#14120e] [&::-webkit-details-marker]:hidden">
                    {entry.question}
                    <span aria-hidden="true" className="text-xl leading-none text-[#77591B] transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="px-5 pb-4 text-[14.5px] leading-relaxed text-stone-600">{entry.answer}</p>
                </details>
              ))}
            </div>
            <p className="mt-8 flex items-center gap-2 text-xs text-stone-500">
              <CalendarCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>
                Export steps checked on <time dateTime={SWITCH_FACTS_CHECKED_ISO}>{SWITCH_FACTS_CHECKED}</time> against each
                company’s own help pages, linked under each tab. Altair Operating System is not affiliated with or endorsed
                by any company named on this page.
              </span>
            </p>
          </div>
        </section>

        {/* closing */}
        <section className={`${BAND.gold} px-5 py-16 sm:px-8 sm:py-20`}>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-[1.6rem] font-semibold tracking-tight text-[#14120e] sm:text-[2.1rem]">
              Move over this week. Keep the old app until you’re sure.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#2a2416] sm:text-base">
              {trialDays} days with the whole system and no credit card. Bring your customers, prices and unpaid invoices,
              run a real job, then decide.
            </p>
            <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link href="/signup" data-track="switch-closing-trial" className={GOLD_BUTTON}>
                Start your {trialDays}-day trial
              </Link>
              {bookingUrl ? (
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="switch-closing-call"
                  className={GOLD_SECONDARY_BUTTON}
                >
                  Book a setup call
                </a>
              ) : (
                <Link href="/pricing" className={GOLD_SECONDARY_BUTTON}>
                  See pricing
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
