import type { MetadataRoute } from "next";
import { listPublishedSitePages } from "@/lib/database/queries/marketing-site-pages";
import { SITE_PAGE_PATH_PREFIX } from "@/shared/types/site-page";
import { resolveAppBaseUrl } from "@/lib/email/env";

/**
 * The sitemap — the only place a published page announces itself.
 *
 * ============ WHY THE CANONICAL AND NOT A DERIVED URL ============
 * Each entry uses the canonical the publish RECORDED, not one rebuilt from
 * the slug here. The canonical was verified at publish time to address that
 * page on the configured origin, and rebuilding it means a second place the
 * site's address is decided — which is how a sitemap ends up advertising
 * URLs that redirect.
 *
 * Static routes are listed explicitly rather than crawled. A sitemap that
 * enumerates whatever files exist eventually lists an internal page nobody
 * meant to publish.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = resolveAppBaseUrl();
  const origin = base.ok ? base.url.replace(/\/+$/g, "") : null;

  const staticEntries: MetadataRoute.Sitemap = origin
    ? [
        { url: `${origin}/`, changeFrequency: "weekly", priority: 1 },
        { url: `${origin}/pricing`, changeFrequency: "weekly", priority: 0.8 },
        { url: `${origin}/privacy`, changeFrequency: "yearly", priority: 0.2 },
        { url: `${origin}/terms`, changeFrequency: "yearly", priority: 0.2 },
      ]
    : [];

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

  // Referenced so the path prefix has exactly one definition even here.
  void SITE_PAGE_PATH_PREFIX;

  return [...staticEntries, ...pageEntries];
}
