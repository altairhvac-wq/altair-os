import type { Metadata } from "next";
import { EstimateDemo } from "@/shared/components/marketing/demos/EstimateDemo";
import { SoftwareLandingPage } from "@/shared/components/marketing/software/SoftwareLandingPage";
import { softwarePageMetadata } from "@/shared/components/marketing/software/software-page-metadata";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { NEXT_STEPS } from "@/shared/lib/site/next-steps";
import { SOFTWARE_PAGE_CONTENT } from "@/shared/lib/site/software-pages";
import {
  buildFaqPageStructuredData,
  buildSoftwareApplicationStructuredData,
} from "@/shared/lib/site/structured-data";

const CONTENT = SOFTWARE_PAGE_CONTENT["/hvac-estimating-software"];

export const metadata: Metadata = softwarePageMetadata(CONTENT.path);

/**
 * HVAC estimating software. The demo prices a repair with the Labor Cost
 * Workspace's flat-rate builder and runs the product's own approval
 * (printed name, drawn signature, authorization); the FAQPage JSON-LD is
 * built from the questions the page renders.
 */
export default function HvacEstimatingSoftwarePage() {
  return (
    <>
      <JsonLdScript data={buildSoftwareApplicationStructuredData()} />
      <JsonLdScript data={buildFaqPageStructuredData(CONTENT.faq)} />
      <SoftwareLandingPage content={CONTENT} demo={<EstimateDemo />} nextSteps={NEXT_STEPS.estimatingSoftware} />
    </>
  );
}
