import type { MetadataRoute } from "next";
import { listPublishedSitePages } from "@/lib/database/queries/marketing-site-pages";
import { SITE_PAGE_PATH_PREFIX } from "@/shared/types/site-page";
import { PUBLIC_SITE_ORIGIN } from "@/shared/lib/site/public-site";
import { RESOURCE_STATIC_PATHS, RESOURCES_PATH } from "@/shared/lib/resources/catalog";

/**
 * The sitemap — the only place a published page announces itself.
 *
 * ============ ONE ORIGIN ============
 * The static entries use the same public origin robots.txt and the Open Graph
 * tags use (`PUBLIC_SITE_ORIGIN`). They used to be rebuilt from
 * `NEXT_PUBLIC_APP_URL`, so a deployment whose app URL differed from the
 * public name advertised one origin in the sitemap and another in robots and
 * the link previews. `ALTAIR_SITE_ORIGIN` still overrides, explicitly, for
 * the case the marketing site is served from a different host than the app —
 * the same override the page publisher honours.
 *
 * ============ WHY THE CANONICAL AND NOT A DERIVED URL ============
 * Each PAGE entry uses the canonical the publish RECORDED, not one rebuilt
 * from the slug here. The canonical was verified at publish time to address
 * that page on the configured origin, and rebuilding it means a second place
 * the site's address is decided — which is how a sitemap ends up advertising
 * URLs that redirect.
 *
 * Static routes are listed explicitly rather than crawled. A sitemap that
 * enumerates whatever files exist eventually lists an internal page nobody
 * meant to publish.
 */
export const dynamic = "force-dynamic";

function resolveSitemapOrigin(): string {
  const explicit = process.env.ALTAIR_SITE_ORIGIN?.trim().replace(/\/+$/g, "");
  // https only, host only — the same shape the page publisher accepts.
  if (explicit && /^https:\/\/[a-z0-9.-]+$/i.test(explicit)) return explicit;
  return PUBLIC_SITE_ORIGIN;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = resolveSitemapOrigin();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${origin}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/pricing`, changeFrequency: "weekly", priority: 0.8 },
    {
      url: `${origin}${SITE_PAGE_PATH_PREFIX}`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    // The Resource Center: hub first, then its tools and indexes. Template
    // downloads are files, not pages, and are not listed.
    ...RESOURCE_STATIC_PATHS.map((path) => ({
      url: `${origin}${path}`,
      changeFrequency: "monthly" as const,
      priority: path === RESOURCES_PATH ? 0.7 : 0.6,
    })),
    { url: `${origin}/contact`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${origin}/install`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${origin}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${origin}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const pages = await listPublishedSitePages();

  const pageEntries: MetadataRoute.Sitemap = pages
    // A published page without a canonical cannot be advertised: there is no
    // address to give. It should be impossible (migration 187 requires one
    // to publish), so it is skipped rather than papered over with a guess.
    .filter((page) => Boolean(page.canonicalUrl))
    .map((page) => ({
      url: page.canonicalUrl as string,
      lastModified: new Date(page.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  return [...staticEntries, ...pageEntries];
}
