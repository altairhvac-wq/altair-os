import type { Metadata } from "next";
import { MissionControlHomepage } from "@/shared/components/homepage/MissionControlHomepage";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import {
  buildFaqStructuredData,
  buildOrganizationStructuredData,
  buildSoftwareApplicationStructuredData,
} from "@/shared/lib/site/structured-data";

export const metadata: Metadata = {
  // `absolute` opts the logged-out homepage out of the root "%s · Altair OS"
  // template — this title already leads with the product name.
  title: {
    absolute: "Altair Operating System · Software for Field Service Businesses",
  },
  description:
    "Connect leads, customers, jobs, dispatch, technicians, estimates, invoices, payments, and reporting in one field service operating system.",
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
      {/* The FAQ the page renders (MarketingFaqSection), from the same list. */}
      <JsonLdScript data={buildFaqStructuredData()} />
      <MissionControlHomepage />
    </>
  );
}
