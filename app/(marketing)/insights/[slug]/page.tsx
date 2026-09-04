import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedSitePageBySlug } from "@/lib/database/queries/marketing-site-pages";
import { SITE_PAGE_PATH_PREFIX, isValidSlug } from "@/shared/types/site-page";
import { SitePageArticle } from "@/shared/components/site/SitePageArticle";

/**
 * A published Altair site page.
 *
 * ============ THIS IS THE PUBLIC SURFACE ============
 * Anonymous, indexable, and read through the ordinary anon-key client so
 * migration 187's `page_state = 'published'` RLS policy is what decides
 * visibility. A draft is invisible here because the database refuses to
 * return it, not because this file remembered to filter — which is the only
 * version of that guarantee worth having.
 *
 * ============ NO HTML IS RENDERED FROM THE DATABASE ============
 * The body is markdown and is rendered as escaped text by
 * `SitePageArticle`. There is no `dangerouslySetInnerHTML` anywhere in this
 * route, so a compromised generator cannot put script on a public page. The
 * one `<script>` here is the JSON-LD block, and its content is serialised
 * with `JSON.stringify` and escaped for `</script>` before it is emitted.
 */

type Params = { readonly slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isValidSlug(slug)) return {};

  const page = await getPublishedSitePageBySlug(slug);
  if (!page) return {};

  return {
    title: page.metaTitle ?? page.title,
    description: page.metaDescription ?? undefined,
    // The canonical is stored, verified against this page's own address
    // before publish, and emitted verbatim. A canonical derived here instead
    // could disagree with the one the publish recorded.
    ...(page.canonicalUrl
      ? { alternates: { canonical: page.canonicalUrl } }
      : {}),
    openGraph: {
      title: page.metaTitle ?? page.title,
      ...(page.metaDescription ? { description: page.metaDescription } : {}),
      ...(page.canonicalUrl ? { url: page.canonicalUrl } : {}),
      type: "article",
      ...(page.publishedAt ? { publishedTime: page.publishedAt } : {}),
    },
  };
}

export default async function SitePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;

  // Refused before the query: an invalid slug cannot match a row, and
  // checking the shape first keeps a malformed segment out of the database
  // round trip entirely.
  if (!isValidSlug(slug)) notFound();

  const page = await getPublishedSitePageBySlug(slug);
  if (!page) notFound();

  return (
    <SitePageArticle
      title={page.title}
      bodyMarkdown={page.bodyMarkdown}
      publishedAt={page.publishedAt}
      updatedAt={page.updatedAt}
      structuredData={page.structuredData}
      internalLinks={page.internalLinks}
      pathPrefix={SITE_PAGE_PATH_PREFIX}
    />
  );
}
