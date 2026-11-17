import type { Metadata } from "next";
import { InvoicingLandingPage } from "@/shared/components/marketing/InvoicingLandingPage";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { INVOICING_FAQ, INVOICING_META, INVOICING_PAGE_PATH } from "@/shared/lib/site/invoicing-page";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import {
  buildFaqPageStructuredData,
  buildSoftwareApplicationStructuredData,
} from "@/shared/lib/site/structured-data";

export const metadata: Metadata = {
  title: INVOICING_META.title,
  description: INVOICING_META.description,
  ...buildPublicSocialMetadata({
    path: INVOICING_PAGE_PATH,
    title: `${INVOICING_META.title} · Altair Operating System`,
    description: INVOICING_META.description,
  }),
};

/**
 * HVAC invoicing software. Its own component and copy
 * (shared/lib/site/invoicing-page.ts); the FAQPage JSON-LD is built from the
 * same questions the page renders, and the site-wide FAQ is not on this page.
 */
export default function HvacInvoicingSoftwarePage() {
  return (
    <>
      <JsonLdScript data={buildSoftwareApplicationStructuredData()} />
      <JsonLdScript data={buildFaqPageStructuredData(INVOICING_FAQ)} />
      <InvoicingLandingPage />
    </>
  );
}
