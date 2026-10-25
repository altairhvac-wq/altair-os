import type { Metadata } from "next";
import { PricingPageView } from "@/shared/components/pricing/PricingPageView";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import { buildSoftwareApplicationStructuredData } from "@/shared/lib/site/structured-data";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Altair OS pricing for field service businesses. Start a 14-day free trial with Starter, Growth, or Pro. No credit card required to start.",
  ...buildPublicSocialMetadata({ path: "/pricing" }),
};

export default function PricingPage() {
  return (
    <>
      {/* The same SoftwareApplication/Offer block as the homepage, from the
          catalog this page renders. No FAQPage: the pricing page carries no
          FAQ copy, and structured data may only describe what is on the page. */}
      <JsonLdScript data={buildSoftwareApplicationStructuredData()} />
      <PricingPageView />
    </>
  );
}
