import type { Metadata } from "next";
import { PricingPageView } from "@/shared/components/pricing/PricingPageView";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import {
  buildFaqStructuredData,
  buildSoftwareApplicationStructuredData,
} from "@/shared/lib/site/structured-data";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Altair Operating System pricing for field service businesses. Start a 14-day free trial with Starter, Growth, or Pro. No credit card required to start.",
  ...buildPublicSocialMetadata({ path: "/pricing" }),
};

export default function PricingPage() {
  return (
    <>
      {/* The same SoftwareApplication/Offer block as the homepage, from the
          catalog this page renders, and the FAQ the page shows (same list as
          MarketingFaqSection): structured data only describes what is on
          the page. */}
      <JsonLdScript data={buildSoftwareApplicationStructuredData()} />
      <JsonLdScript data={buildFaqStructuredData()} />
      <PricingPageView />
    </>
  );
}
