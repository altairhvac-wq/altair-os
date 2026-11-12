import type { Metadata } from "next";
import Link from "next/link";
import { SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { CommercialVideoPlayer } from "@/shared/components/marketing/CommercialVideoPlayer";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import {
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

const TITLE = "How Altair OS Works: HVAC Software Demo Video";
const DESCRIPTION =
  "Watch one HVAC job run through Altair OS from first call to paid in full: lead, estimate, customer signature, dispatch, the technician's phone, invoice and payment. Full transcript included.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: VIDEO_PAGE_PATH,
    title: `${TITLE} · Altair Operating System`,
    description: DESCRIPTION,
  }),
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";

/**
 * The commercial's watch page: the video is the main content (what Google's
 * video indexing looks for), with chapters, the full transcript as page text,
 * and a VideoObject. Static; no data reads.
 */
export default function HowItWorksPage() {
  const trialDays = SAAS_TRIAL_CONFIG.durationDays;
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
          <section className="px-5 pb-10 pt-28 sm:px-8 sm:pt-36">
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
              <p className="mt-4 text-[13px] text-[#8e826f]">No credit card to start.</p>
            </div>
          </section>

          <section aria-labelledby="transcript-heading" className="px-5 pb-20 pt-6 sm:px-8">
            <div className="mx-auto max-w-3xl rounded-2xl border border-[rgba(230,227,220,0.1)] bg-[rgba(18,21,17,0.7)] p-6 sm:p-8">
              <h2 id="transcript-heading" className="text-lg font-semibold text-[#fff9ea]">
                Transcript
              </h2>
              <div className="mt-4 space-y-4 text-[0.95rem] leading-[1.8] text-[#c9bfae]">
                {COMMERCIAL_TRANSCRIPT.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </section>
        </main>
        <MarketingFooter />
      </div>
    </>
  );
}
