import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedSitePages } from "@/lib/database/queries/marketing-site-pages";
import {
  ResourceCard,
  ResourcePageShell,
  resourceLinkClass,
} from "@/shared/components/resources/ResourcePageShell";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { RESOURCES_GUIDES_PATH } from "@/shared/lib/resources/catalog";
import { buildResourceCollectionStructuredData } from "@/shared/lib/resources/structured-data";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import { SITE_PAGE_PATH_PREFIX } from "@/shared/types/site-page";

/**
 * Guides are Insights articles: the same published pages, read through the
 * same anon-key query, so migration 187's RLS policy decides what appears.
 * There is no second publishing path for guides.
 */

const TITLE = "Guides for contractors";
const DESCRIPTION =
  "Practical guides for HVAC and trade business owners on pricing, estimates, dispatch, invoicing and running the office, published as Altair Insights articles.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: RESOURCES_GUIDES_PATH,
    title: TITLE,
    description: DESCRIPTION,
  }),
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ResourceGuidesPage() {
  const pages = await listPublishedSitePages();

  return (
    <ResourcePageShell
      eyebrow="Guides"
      title={TITLE}
      crumbs={[{ label: "Guides" }]}
      intro={
        <p>
          {DESCRIPTION} The full archive lives on{" "}
          <Link href={SITE_PAGE_PATH_PREFIX} className={resourceLinkClass}>
            Insights
          </Link>
          .
        </p>
      }
    >
      <JsonLdScript
        data={buildResourceCollectionStructuredData({
          name: TITLE,
          description: DESCRIPTION,
          path: RESOURCES_GUIDES_PATH,
          parts: pages.map((page) => ({
            name: page.title,
            path: `${SITE_PAGE_PATH_PREFIX}/${page.slug}`,
          })),
        })}
      />

      {pages.length === 0 ? (
        <p className="mt-12 rounded-2xl border border-stone-200/80 bg-white px-6 py-10 text-center text-sm text-stone-600">
          No guides have been published yet. In the meantime, try the{" "}
          <Link href="/resources/calculators" className={resourceLinkClass}>
            calculators
          </Link>{" "}
          and{" "}
          <Link href="/resources/templates" className={resourceLinkClass}>
            templates
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-12 space-y-4">
          {pages.map((page) => (
            <li key={page.id}>
              <ResourceCard>
                <h2 className="text-lg font-semibold tracking-tight text-[#0A0A0A]">
                  <Link
                    href={`${SITE_PAGE_PATH_PREFIX}/${page.slug}`}
                    className="hover:text-[#77591B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40"
                  >
                    {page.title}
                  </Link>
                </h2>
                {page.metaDescription ? (
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">
                    {page.metaDescription}
                  </p>
                ) : null}
                {page.publishedAt ? (
                  <p className="mt-3 text-xs text-stone-500">
                    <time dateTime={page.publishedAt}>{formatDate(page.publishedAt)}</time>
                  </p>
                ) : null}
              </ResourceCard>
            </li>
          ))}
        </ul>
      )}
    </ResourcePageShell>
  );
}
