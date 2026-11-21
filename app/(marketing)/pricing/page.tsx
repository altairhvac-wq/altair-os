import type { Metadata } from "next";
import { PricingPageView } from "@/shared/components/pricing/PricingPageView";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { PRICING_FAQ, PRICING_META, PRICING_PATH } from "@/shared/lib/pricing/pricing-page";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import {
  buildFaqPageStructuredData,
  buildSoftwareApplicationStructuredData,
} from "@/shared/lib/site/structured-data";

export const metadata: Metadata = {
  title: PRICING_META.title,
  description: PRICING_META.description,
  ...buildPublicSocialMetadata({
    path: PRICING_PATH,
    title: `${PRICING_META.title} · Altair Operating System`,
    description: PRICING_META.description,
  }),
};

export default function PricingPage() {
  return (
    <>
      {/* The same SoftwareApplication/Offer block as the homepage, from the
          catalog this page renders, and the pricing FAQ the page shows (the
          same list feeds both): structured data only describes what is on
          the page. */}
      <JsonLdScript data={buildSoftwareApplicationStructuredData()} />
      <JsonLdScript data={buildFaqPageStructuredData(PRICING_FAQ)} />
      <PricingPageView />
    </>
  );
}
