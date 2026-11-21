import type { Metadata } from "next";
import { InvoiceDemo } from "@/shared/components/marketing/demos/InvoiceDemo";
import { SoftwareLandingPage } from "@/shared/components/marketing/software/SoftwareLandingPage";
import { softwarePageMetadata } from "@/shared/components/marketing/software/software-page-metadata";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { NEXT_STEPS } from "@/shared/lib/site/next-steps";
import { SOFTWARE_PAGE_CONTENT } from "@/shared/lib/site/software-pages";
import {
  buildFaqPageStructuredData,
  buildSoftwareApplicationStructuredData,
} from "@/shared/lib/site/structured-data";

const CONTENT = SOFTWARE_PAGE_CONTENT["/hvac-invoicing-software"];

export const metadata: Metadata = softwarePageMetadata(CONTENT.path);

/**
 * HVAC invoicing software: the site's most-searched non-brand page. A
 * hands-on invoicing demo built from the Invoice Builder's parts, the
 * workflow with real sample-company screens, the feature breakdown and an
 * FAQ whose FAQPage JSON-LD is built from the same list the page renders.
 */
export default function HvacInvoicingSoftwarePage() {
  return (
    <>
      <JsonLdScript data={buildSoftwareApplicationStructuredData()} />
      <JsonLdScript data={buildFaqPageStructuredData(CONTENT.faq)} />
      <SoftwareLandingPage content={CONTENT} demo={<InvoiceDemo />} nextSteps={NEXT_STEPS.invoicingSoftware} />
    </>
  );
}
