import type { Metadata } from "next";
import Link from "next/link";
import { CommercialVideoPlayer } from "@/shared/components/marketing/CommercialVideoPlayer";
import { JobJourney } from "@/shared/components/marketing/demos/JobJourney";
import { SoftwareLandingPage } from "@/shared/components/marketing/software/SoftwareLandingPage";
import { softwarePageMetadata } from "@/shared/components/marketing/software/software-page-metadata";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { VIDEO_PAGE_PATH } from "@/shared/lib/site/commercial-video";
import { NEXT_STEPS } from "@/shared/lib/site/next-steps";
import { SOFTWARE_PAGE_CONTENT } from "@/shared/lib/site/software-pages";
import {
  buildFaqPageStructuredData,
  buildSoftwareApplicationStructuredData,
} from "@/shared/lib/site/structured-data";

const CONTENT = SOFTWARE_PAGE_CONTENT["/hvac-software"];

export const metadata: Metadata = softwarePageMetadata(CONTENT.path);

/**
 * HVAC business software: the overview. One job through the five stops of
 * the product with the sample-company screens, the 2:27 film of the same
 * job, then the shared software-page sections. The FAQPage JSON-LD is built
 * from the questions the page renders.
 */
export default function HvacSoftwarePage() {
  return (
    <>
      <JsonLdScript data={buildSoftwareApplicationStructuredData()} />
      <JsonLdScript data={buildFaqPageStructuredData(CONTENT.faq)} />
      <SoftwareLandingPage
        content={CONTENT}
        demo={<JobJourney />}
        nextSteps={NEXT_STEPS.businessSoftware}
        afterDemo={
          <section aria-labelledby="landing-video-heading" className="px-5 pb-4 pt-6 sm:px-8">
            <div className="mx-auto max-w-4xl">
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">See it run</p>
              <h2
                id="landing-video-heading"
                className="mt-3 text-center text-[1.4rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.8rem]"
              >
                The same job on film, from first call to paid
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-center text-sm text-[#c9bfae]">
                2 minutes 27 seconds, with sound.
              </p>
              <div className="mt-6">
                <CommercialVideoPlayer />
              </div>
              <p className="mt-3 text-center text-xs text-[#8e826f]">
                <Link
                  href={VIDEO_PAGE_PATH}
                  className="font-semibold text-[#c2a05a] underline-offset-4 hover:text-[#e8d9ac] hover:underline"
                >
                  Read the full transcript
                </Link>
              </p>
            </div>
          </section>
        }
      />
    </>
  );
}
