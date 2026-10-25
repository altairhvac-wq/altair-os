import type { MetadataRoute } from "next";
import { PUBLIC_SITE_ORIGIN } from "@/shared/lib/site/public-site";

/**
 * Crawl policy for the public origin.
 *
 * ============ WHY AN ALLOW-LIST ============
 * Everything that is not the marketing site is a signed-in product surface or
 * a tokenised customer page (estimate approval, invoice payment). None of it
 * should be indexed, and most of it answers a crawler with a redirect to
 * /login anyway, so letting bots wander it only burns crawl budget. The
 * public pages are few and known, so they are named.
 *
 * `/$` allows exactly the homepage without also allowing every path under it
 * (the longest-match rule used by Google and Bing). `/insights` covers the
 * index and every published article beneath it; `/resources` covers the
 * Resource Center hub, calculators, templates (downloads included), guides
 * and library.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/$",
          "/pricing",
          "/privacy",
          "/terms",
          "/install",
          "/insights",
          "/resources",
          "/og.png",
          "/icons/",
          "/favicon.svg",
          "/apple-touch-icon.png",
        ],
        disallow: "/",
      },
    ],
    sitemap: `${PUBLIC_SITE_ORIGIN}/sitemap.xml`,
  };
}
