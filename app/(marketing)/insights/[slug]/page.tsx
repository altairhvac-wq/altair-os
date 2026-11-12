import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPublishedSitePageBySlug,
  listPublishedSitePages,
} from "@/lib/database/queries/marketing-site-pages";
import { SITE_PAGE_PATH_PREFIX, isValidSlug } from "@/shared/types/site-page";
import { SitePageArticle } from "@/shared/components/site/SitePageArticle";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import {
  PUBLIC_SITE_ORIGIN,
  buildPublicSocialMetadata,
} from "@/shared/lib/site/public-site";

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

  // The root layout appends " · Altair Operating System"; a stored meta title
  // that already ends in the brand would otherwise carry it twice.
  const title = (page.metaTitle ?? page.title).replace(
    /\s*[|·-]\s*Altair OS\s*$/i,
    "",
  );
  const description = page.metaDescription ?? undefined;

  // Composed with the shared helper rather than written by hand: Next merges
  // `openGraph` shallowly, so a page-level block without `images` silently
  // drops the layout's og.png from every article preview (SEO audit bug 1).
  //
  // The canonical is stored, verified against this page's own address before
  // publish, and emitted verbatim as both canonical and og:url. A canonical
  // derived here instead could disagree with the one the publish recorded.
  const social = buildPublicSocialMetadata({
    title,
    description,
    path: page.canonicalUrl ?? "./",
  });

  return {
    title,
    description,
    ...social,
    openGraph: {
      ...social.openGraph,
      type: "article",
      ...(page.publishedAt ? { publishedTime: page.publishedAt } : {}),
      modifiedTime: page.updatedAt,
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

  const others = (await listPublishedSitePages())
    .filter((other) => other.slug !== page.slug)
    .map((other) => ({
      slug: other.slug,
      title: other.title,
      metaDescription: other.metaDescription,
    }));
  const pageUrl = `${PUBLIC_SITE_ORIGIN}${SITE_PAGE_PATH_PREFIX}/${page.slug}`;

  return (
    <>
      <JsonLdScript
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Insights",
              item: `${PUBLIC_SITE_ORIGIN}${SITE_PAGE_PATH_PREFIX}`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: page.title,
              item: pageUrl,
            },
          ],
        }}
      />
      <SitePageArticle
        title={page.title}
        bodyMarkdown={page.bodyMarkdown}
        publishedAt={page.publishedAt}
        updatedAt={page.updatedAt}
        structuredData={page.structuredData}
        internalLinks={page.internalLinks}
        pathPrefix={SITE_PAGE_PATH_PREFIX}
        moreArticles={others}
      />
    </>
  );
}
