import type { Metadata } from "next";
import { LoginLandingPage } from "@/shared/components/homepage/LoginLandingPage";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import {
  buildPublicSocialMetadata,
  PUBLIC_SITE_DESCRIPTION,
  PUBLIC_SITE_NAME,
  PUBLIC_SITE_ORIGIN,
  PUBLIC_SITE_TITLE,
} from "@/shared/lib/site/public-site";
import { VIDEO_PAGE_PATH, buildCommercialVideoStructuredData } from "@/shared/lib/site/commercial-video";
import {
  buildOrganizationStructuredData,
  buildSoftwareApplicationStructuredData,
} from "@/shared/lib/site/structured-data";

export const metadata: Metadata = {
  // `absolute` opts the logged-out homepage out of the root "%s · Altair Operating System"
  // template — this title already leads with the product name.
  title: {
    absolute: PUBLIC_SITE_TITLE,
  },
  description: PUBLIC_SITE_DESCRIPTION,
  // This page is served at `/` (middleware rewrite), so its canonical and
  // og:url are the root, not /welcome.
  ...buildPublicSocialMetadata({ path: "/" }),
};

/**
 * Internal route rendered for logged-out visitors at `/` via middleware rewrite.
 * Signed-in users who reach /welcome directly are sent to the dashboard by the
 * middleware, so this page reads no cookies and prerenders as static HTML:
 * one request to Supabase fewer per visit, and a cacheable response.
 */
export default function WelcomePage() {
  return (
    <>
      {/* Organization + SoftwareApplication/Offer, read from the same plan
          catalog and site constants the visible page renders. */}
      <JsonLdScript data={buildOrganizationStructuredData()} />
      <JsonLdScript data={buildSoftwareApplicationStructuredData()} />
      {/* The commercial in the hero; its watch page is /how-it-works. */}
      <JsonLdScript
        data={buildCommercialVideoStructuredData({
          origin: PUBLIC_SITE_ORIGIN,
          pageUrl: `${PUBLIC_SITE_ORIGIN}${VIDEO_PAGE_PATH}`,
          publisherName: PUBLIC_SITE_NAME,
        })}
      />
      <LoginLandingPage />
    </>
  );
}
