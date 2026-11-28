import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import {
  getPublishedSitePageBySlug,
  listPublishedSitePages,
} from "@/lib/database/queries/marketing-site-pages";
import { SITE_PAGE_PATH_PREFIX, isValidSlug } from "@/shared/types/site-page";
import { SitePageArticle } from "@/shared/components/site/SitePageArticle";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { buildArticleView } from "@/shared/lib/site/article-view";
import { readingMinutes } from "@/shared/lib/site/article-markdown";
import { buildInsightsArticleStructuredData } from "@/shared/lib/site/structured-data";
import {
  PUBLIC_SITE_NAME,
  PUBLIC_SITE_ORIGIN,
  buildPublicSocialMetadata,
} from "@/shared/lib/site/public-site";

/**
 * A published Altair site page, in the Insights article template.
 *
 * ============ THIS IS THE PUBLIC SURFACE ============
 * Anonymous, indexable, and read through the ordinary anon-key client so
 * migration 187's `page_state = 'published'` RLS policy is what decides
 * visibility. A draft is invisible here because the database refuses to
 * return it, not because this file remembered to filter — which is the only
 * version of that guarantee worth having.
 *
 * ============ NO HTML IS RENDERED FROM THE DATABASE ============
 * The body is markdown, parsed into blocks by
 * shared/lib/site/article-markdown.ts and rendered as React elements, so
 * every character of it is escaped text. The one `<script>` here is the
 * JSON-LD block: built in code from the row's fields, serialised with
 * `JSON.stringify` and escaped for `</script>` by JsonLdScript.
 */

type Params = { readonly slug: string };

/** The root layout's title template adds this to every page title. */
const TITLE_SUFFIX = ` · ${PUBLIC_SITE_NAME}`;
/** Google shows about 60 characters of a title. */
const TITLE_MAX = 60;

/**
 * One lookup per request, shared by `generateMetadata` and the page.
 *
 * A missing or unpublished slug calls `notFound()` in both places. This route
 * sits in the (articles) group, outside the marketing `loading.tsx`, so
 * nothing has streamed yet and the answer is a real `404` rather than a
 * `200` with `noindex` (see app/(articles)/layout.tsx).
 */
const loadPublishedPage = cache(getPublishedSitePageBySlug);

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();

  const page = await loadPublishedPage(slug);
  if (!page) notFound();

  // The root layout appends " · Altair Operating System"; a stored meta title
  // that already ends in the brand would otherwise carry it twice.
  const title = (page.metaTitle ?? page.title).replace(
    /\s*[|·-]\s*Altair (?:OS|Operating System)\s*$/i,
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
    // With the brand suffix most article titles ran 77 to 82 characters and
    // were cut off in results (site audit 2026-11-20). A stored title that
    // fits with the suffix keeps it; a longer one (60 or under on its own) is
    // used as the whole title.
    title: title.length + TITLE_SUFFIX.length <= TITLE_MAX ? title : { absolute: title },
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

  const page = await loadPublishedPage(slug);
  if (!page) notFound();

  // Only PUBLISHED pages are linked from here (related reading, links in the
  // text): a slug the database does not return would send readers to a 404.
  const others = (await listPublishedSitePages())
    .filter((other) => other.slug !== page.slug)
    .map((other) => ({
      slug: other.slug,
      title: other.title,
      metaDescription: other.metaDescription,
      minutes: readingMinutes(other.bodyMarkdown),
    }));
  const view = buildArticleView(page.slug, page.bodyMarkdown);
  const pageUrl = page.canonicalUrl ?? `${PUBLIC_SITE_ORIGIN}${SITE_PAGE_PATH_PREFIX}/${page.slug}`;

  // The stored structured data is the publisher's Article block; the graph
  // below says the same and more (author, section, FAQ), so the stored copy
  // is emitted only when it is something else, never as a second Article.
  const stored = page.structuredData;
  const storedType = typeof stored["@type"] === "string" ? stored["@type"] : null;
  const extraStored = storedType && !["Article", "BlogPosting", "NewsArticle"].includes(storedType) ? stored : null;

  return (
    <>
      <JsonLdScript
        data={buildInsightsArticleStructuredData({
          title: page.title,
          description: page.metaDescription,
          url: pageUrl,
          publishedAt: page.publishedAt,
          updatedAt: page.updatedAt,
          section: view.topic.label,
          wordCount: view.wordCount,
          faq: view.faq,
        })}
      />
      {extraStored ? <JsonLdScript data={extraStored} /> : null}
      <SitePageArticle
        slug={page.slug}
        title={page.title}
        summary={page.metaDescription}
        view={view}
        publishedAt={page.publishedAt}
        updatedAt={page.updatedAt}
        pathPrefix={SITE_PAGE_PATH_PREFIX}
        others={others}
      />
    </>
  );
}
