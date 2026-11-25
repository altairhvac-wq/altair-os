import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Play } from "lucide-react";
import { getLiveOnboardingInfo } from "@/lib/onboarding/live-onboarding";
import { SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { CommercialVideoPlayer } from "@/shared/components/marketing/CommercialVideoPlayer";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { ToolStrip } from "@/shared/components/resources/hub/ToolCards";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { NextStep } from "@/shared/components/site/NextStep";
import { BAND, GOLD_BUTTON, GOLD_SECONDARY_BUTTON, TONE } from "@/shared/lib/site/bands";
import { INTERACTIVE_TOOL_COUNT, hubTool } from "@/shared/lib/resources/tool-hub";
import { NEXT_STEPS } from "@/shared/lib/site/next-steps";
import {
  COMMERCIAL_JOB_STEPS,
  COMMERCIAL_TRANSCRIPT,
  COMMERCIAL_VIDEO,
  VIDEO_PAGE_PATH,
  buildCommercialVideoStructuredData,
} from "@/shared/lib/site/commercial-video";
import {
  PUBLIC_SITE_NAME,
  PUBLIC_SITE_ORIGIN,
  buildPublicSocialMetadata,
} from "@/shared/lib/site/public-site";
import { buildSoftwareApplicationStructuredData } from "@/shared/lib/site/structured-data";

// 24 + " · Altair Operating System" = 50 characters; the description is 151.
const TITLE = "HVAC Software Demo Video";
const SOCIAL_TITLE = "HVAC Software Demo Video: One Job, First Call to Paid";
const DESCRIPTION =
  "Watch one HVAC job go from first call to paid in Altair Operating System: estimate, signature, dispatch, the tech's phone and payment. With transcript.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: VIDEO_PAGE_PATH,
    title: `${SOCIAL_TITLE} · Altair Operating System`,
    description: DESCRIPTION,
  }),
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";

/** The tools strip under the video. */
const TOOLS = ["labor-workspace", "invoice-builder", "break-even", "technician-pay"].map(hubTool);

/**
 * The commercial's watch page: the video is the main content (what Google's
 * video indexing looks for), with chapters, the full transcript as page text,
 * and a VideoObject. Static; no data reads.
 */
export default function HowItWorksPage() {
  const trialDays = SAAS_TRIAL_CONFIG.durationDays;
  // 2026-11-24 (owner): anyone watching the demo can also talk to the founder. Same booking page as /contact.
  const bookingUrl = getLiveOnboardingInfo().joinUrl;
  return (
    <>
      <JsonLdScript
        data={buildCommercialVideoStructuredData({
          origin: PUBLIC_SITE_ORIGIN,
          pageUrl: `${PUBLIC_SITE_ORIGIN}${VIDEO_PAGE_PATH}`,
          publisherName: PUBLIC_SITE_NAME,
        })}
      />
      <JsonLdScript data={buildSoftwareApplicationStructuredData()} />
      <div className="mc-homepage relative min-h-dvh overflow-x-clip bg-[#080907] text-[#f3ebdd]">
        <HomepageNav />
        <main className="relative">
          <section className={`${BAND.hero} px-5 pb-16 pt-28 sm:px-8 sm:pb-20 sm:pt-36`}>
            <div className="mx-auto max-w-4xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">How it works</p>
              <h1 className="ah-hero-display mt-3 text-[2rem] font-normal leading-[1.12] tracking-[-0.015em] text-[#fff9ea] sm:text-[2.8rem]">
                One HVAC job, from first call to paid
              </h1>
              <p className="mt-4 max-w-[660px] text-[0.95rem] leading-[1.75] text-[#c9bfae] sm:text-lg">
                {COMMERCIAL_VIDEO.description} 2 minutes 27 seconds, with sound.
              </p>
              <div className="mt-8">
                <CommercialVideoPlayer />
              </div>
              <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/signup"
                  className={`inline-flex min-h-12 items-center justify-center rounded-lg bg-[#a4823a] px-8 py-3.5 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] ${focusRing}`}
                >
                  Start Your {trialDays}-Day Free Trial
                </Link>
                <Link
                  href="/hvac-software"
                  className={`inline-flex min-h-12 items-center justify-center rounded-lg border border-[rgba(230,227,220,0.18)] px-8 py-3.5 text-sm font-semibold text-[#fbf7ef] transition-colors hover:border-[rgba(230,227,220,0.32)] ${focusRing}`}
                >
                  See everything it runs
                </Link>
              </div>
              <p className="mt-4 text-sm text-[#c9bfae]">
                Rather talk it through?{" "}
                {bookingUrl ? (
                  <a href={bookingUrl} target="_blank" rel="noopener noreferrer" data-cta="how-it-works-demo" className={`font-semibold text-[#c2a05a] underline-offset-4 hover:text-[#e8d9ac] hover:underline ${focusRing}`}>
                    Book a demo call with the founder
                  </a>
                ) : (
                  <Link href="/contact" data-cta="how-it-works-demo" className={`font-semibold text-[#c2a05a] underline-offset-4 hover:text-[#e8d9ac] hover:underline ${focusRing}`}>
                    Ask for a demo
                  </Link>
                )}
              </p>
              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-[#c9bfae]">
                {[
                  "The real product, with sample data",
                  `${COMMERCIAL_JOB_STEPS.length} chapters you can jump to`,
                  "Full transcript below",
                  "No credit card to start",
                ].map((line) => (
                  <li key={line} className="inline-flex items-center gap-1.5">
                    <Check aria-hidden="true" className="h-3.5 w-3.5 text-[#c2a05a]" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* "Jump to the part you care about": every visit that started here
              left after one page (audit, 2026-11-20), so each step of the job
              now plays from its moment and leads to the page for that part. */}
          <section aria-labelledby="job-steps-heading" className={`${BAND.light} px-5 py-16 sm:px-8 sm:py-20`}>
            <div className="mx-auto max-w-6xl">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${TONE.light.eyebrow}`}>See one job</p>
              <h2
                id="job-steps-heading"
                className="mt-3 text-[1.4rem] font-semibold tracking-tight text-[#14120e] sm:text-[1.75rem]"
              >
                Jump to the part you care about.
              </h2>
              <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {COMMERCIAL_JOB_STEPS.map((step, index) => (
                  <li
                    key={step.seconds}
                    className={`flex flex-col p-5 ${TONE.light.card}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#a4823a] text-xs font-semibold text-[#080907]">
                          {index + 1}
                        </span>
                        <h3 className="text-base font-semibold text-[#14120e]">{step.title}</h3>
                      </span>
                      <button
                        type="button"
                        data-seek={step.seconds}
                        aria-label={`Play ${step.title.toLowerCase()} from ${step.at}`}
                        className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#14120e] px-3 text-xs font-semibold text-[#e8d9ac] transition-colors hover:bg-[#2a2620] hover:text-[#fff9ea] ${focusRing} ${TONE.light.ringOffset}`}
                      >
                        <Play aria-hidden="true" className="h-3 w-3 fill-current" />
                        {step.at}
                      </button>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-stone-600">{step.text}</p>
                    <Link
                      href={step.href}
                      data-track={`next-software-step-${step.seconds}`}
                      className={`mt-auto inline-flex items-center gap-1 pt-4 text-[13px] font-semibold text-[#77591B] underline-offset-4 hover:text-[#14120e] hover:underline ${focusRing} ${TONE.light.ringOffset}`}
                    >
                      {step.linkLabel}
                      <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <div className={`${BAND.olive} px-5 py-16 sm:px-8 sm:py-20`}>
            <div className="mx-auto max-w-6xl">
              <ToolStrip
                id="how-tools-heading"
                tone="dark"
                tools={TOOLS}
                eyebrow="Try the tools"
                heading="Free tools you can use today, no account."
                intro="The same numbers the software runs on: your labor rate, your invoices, your break-even and your crew's pay."
                hubLabel={`All ${INTERACTIVE_TOOL_COUNT} free tools`}
              />
            </div>
          </div>

          <div className={`${BAND.light} px-5 py-16 sm:px-8 sm:py-20`}>
            <div className="mx-auto max-w-6xl">
              <NextStep tone="light" placement="how-it-works" steps={NEXT_STEPS.howItWorks} />
            </div>

          <section aria-labelledby="transcript-heading" className="pt-12">
            <div className={`mx-auto grid max-w-6xl gap-6 p-6 sm:p-8 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10 ${TONE.light.card}`}>
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${TONE.light.eyebrow}`}>Read along</p>
                <h2 id="transcript-heading" className="mt-2 text-lg font-semibold text-[#14120e]">
                  Transcript
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">
                  Every word of the narration. Play a chapter from here.
                </p>
                <ol className="mt-4 hidden space-y-1.5 md:block">
                  {COMMERCIAL_JOB_STEPS.map((step) => (
                    <li key={step.seconds}>
                      <button
                        type="button"
                        data-seek={step.seconds}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-stone-600 transition-colors hover:bg-[#f5ecd9] hover:text-[#14120e] ${focusRing} ${TONE.light.ringOffset}`}
                      >
                        <span className="w-9 shrink-0 font-mono text-xs text-[#77591B]">{step.at}</span>
                        <span>{step.title}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="max-w-3xl space-y-4 text-[0.95rem] leading-[1.85] text-stone-700 sm:text-base">
                {COMMERCIAL_TRANSCRIPT.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </section>
          </div>

          {/* The page ends on the job the visitor would run, not on the transcript. */}
          <section className={`${BAND.gold} px-5 py-16 sm:px-8 sm:py-20`}>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-[1.6rem] font-semibold tracking-tight text-[#14120e] sm:text-[2.1rem]">
                Run one of your own jobs through it
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#2a2416] sm:text-base">
                The same steps as the video, with your customer, your price and your technician. {trialDays} days free, no
                credit card.
              </p>
              <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <Link href="/signup" data-cta="how-it-works-end" className={GOLD_BUTTON}>
                  Start Your {trialDays}-Day Free Trial
                </Link>
                <Link href="/pricing#plan-finder" className={GOLD_SECONDARY_BUTTON}>
                  Find your plan
                </Link>
              </div>
            </div>
          </section>
        </main>
        <MarketingFooter />
      </div>
    </>
  );
}
