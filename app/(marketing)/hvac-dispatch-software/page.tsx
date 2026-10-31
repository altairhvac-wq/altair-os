import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingLandingPage } from "@/shared/components/marketing/MarketingLandingPage";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { findLandingPage } from "@/shared/lib/site/landing-pages";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import {
  buildFaqStructuredData,
  buildSoftwareApplicationStructuredData,
} from "@/shared/lib/site/structured-data";

const PAGE = findLandingPage("/hvac-dispatch-software");

export const metadata: Metadata = PAGE
  ? {
      title: PAGE.title,
      description: PAGE.description,
      ...buildPublicSocialMetadata({
        path: PAGE.path,
        title: `${PAGE.title} · Altair Operating System`,
        description: PAGE.description,
      }),
    }
  : {};

/** Search landing page; the copy lives in shared/lib/site/landing-pages.ts. */
export default function LandingPage() {
  if (!PAGE) notFound();
  return (
    <>
      <JsonLdScript data={buildSoftwareApplicationStructuredData()} />
      <JsonLdScript data={buildFaqStructuredData()} />
      <MarketingLandingPage page={PAGE} />
    </>
  );
}
