import type { Metadata } from "next";
import { listApplicationsForReview } from "@/lib/affiliates/applications";
import { requirePlatformAdmin } from "@/lib/database/platform-admin";
import { resolveResourceLinkOrigin } from "@/lib/resources/subscribers";
import { AffiliateReviewView } from "@/shared/components/platform-admin/affiliates/AffiliateReviewView";

export const metadata: Metadata = {
  title: "Affiliate applications",
};

/**
 * The owner's review screen for affiliate program applications. Platform
 * admins only. The layout already gates this, and the page checks again
 * because the data below is read with the service role and is all private:
 * applicants' names, email addresses and what they wrote.
 */
export default async function PlatformAffiliatesPage() {
  await requirePlatformAdmin();
  const data = await listApplicationsForReview();
  return <AffiliateReviewView data={data} siteOrigin={resolveResourceLinkOrigin()} />;
}
