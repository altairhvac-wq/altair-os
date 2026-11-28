import type { Metadata } from "next";
import { HowToIndexPage } from "@/shared/components/site/HowToPages";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { HELP_NOTES } from "@/shared/lib/help/catalog";
import { HOW_TO_PATH } from "@/shared/lib/help/paths";
import {
  HOW_TO_SECTION_NAME,
  buildHowToIndexStructuredData,
} from "@/shared/lib/help/structured-data";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

// 14 + " · Altair Operating System" = 40 characters; the description is 146.
const TITLE = HOW_TO_SECTION_NAME;
const DESCRIPTION =
  "Step-by-step help for Altair Operating System: customers, jobs, estimates, invoices, the technician phone view and settings, button by button.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: HOW_TO_PATH,
    title: `${TITLE} · Altair Operating System`,
    description: DESCRIPTION,
  }),
};

/**
 * The public index of the how-to library (shared/lib/help). Static: it reads
 * the catalog and nothing else. It lives in the (articles) group, which has
 * no loading.tsx, so an unknown note under it is a real 404.
 */
export default function HowToPage() {
  return (
    <>
      <JsonLdScript
        data={buildHowToIndexStructuredData({ description: DESCRIPTION, notes: HELP_NOTES })}
      />
      <HowToIndexPage />
    </>
  );
}
