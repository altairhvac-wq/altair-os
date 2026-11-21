import type { Metadata } from "next";
import { DispatchDemo } from "@/shared/components/marketing/demos/DispatchDemo";
import { SoftwareLandingPage } from "@/shared/components/marketing/software/SoftwareLandingPage";
import { softwarePageMetadata } from "@/shared/components/marketing/software/software-page-metadata";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { NEXT_STEPS } from "@/shared/lib/site/next-steps";
import { SOFTWARE_PAGE_CONTENT } from "@/shared/lib/site/software-pages";
import {
  buildFaqPageStructuredData,
  buildSoftwareApplicationStructuredData,
} from "@/shared/lib/site/structured-data";

const CONTENT = SOFTWARE_PAGE_CONTENT["/hvac-dispatch-software"];

export const metadata: Metadata = softwarePageMetadata(CONTENT.path);

/**
 * HVAC dispatch software. The demo is a sample day board that assigns,
 * reassigns and unassigns by technician (the product does not drag) and
 * shows each technician's phone; the FAQPage JSON-LD is built from the
 * questions the page renders.
 */
export default function HvacDispatchSoftwarePage() {
  return (
    <>
      <JsonLdScript data={buildSoftwareApplicationStructuredData()} />
      <JsonLdScript data={buildFaqPageStructuredData(CONTENT.faq)} />
      <SoftwareLandingPage content={CONTENT} demo={<DispatchDemo />} nextSteps={NEXT_STEPS.dispatchSoftware} />
    </>
  );
}
