import type { Metadata } from "next";
import { ComparisonPage } from "@/shared/components/marketing/ComparisonPage";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { buildComparisonFaqStructuredData, getComparisonPage } from "@/shared/lib/site/comparison-pages";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

const PAGE = getComparisonPage("/servicetitan-alternative");

export const metadata: Metadata = {
  title: { absolute: PAGE.metaTitle },
  description: PAGE.metaDescription,
  ...buildPublicSocialMetadata({ path: PAGE.path, title: PAGE.metaTitle, description: PAGE.metaDescription }),
};

/** Competitor comparison; content and sources live in shared/lib/site/comparison-pages.ts. */
export default function Page() {
  return (
    <>
      <JsonLdScript data={buildComparisonFaqStructuredData(PAGE)} />
      <ComparisonPage page={PAGE} />
    </>
  );
}
