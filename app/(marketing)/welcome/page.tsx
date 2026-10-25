import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/database/auth";
import { MissionControlHomepage } from "@/shared/components/homepage/MissionControlHomepage";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import {
  buildOrganizationStructuredData,
  buildSoftwareApplicationStructuredData,
} from "@/shared/lib/site/structured-data";

export const metadata: Metadata = {
  // `absolute` opts the logged-out homepage out of the root "%s · Altair OS"
  // template — this title already leads with the product name.
  title: {
    absolute: "Altair OS · The Operating System for Field Service Businesses",
  },
  description:
    "Connect leads, customers, jobs, dispatch, technicians, estimates, invoices, payments, and reporting in one field service operating system.",
  // This page is served at `/` (middleware rewrite), so its canonical and
  // og:url are the root, not /welcome.
  ...buildPublicSocialMetadata({ path: "/" }),
};

/**
 * Internal route rendered for logged-out visitors at `/` via middleware rewrite.
 * Authenticated users are sent to the dashboard.
 */
export default async function WelcomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <>
      {/* Organization + SoftwareApplication/Offer, read from the same plan
          catalog and site constants the visible page renders. */}
      <JsonLdScript data={buildOrganizationStructuredData()} />
      <JsonLdScript data={buildSoftwareApplicationStructuredData()} />
      <MissionControlHomepage />
    </>
  );
}
