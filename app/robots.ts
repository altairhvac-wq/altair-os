import type { MetadataRoute } from "next";
import { VIDEO_PAGE_PATH } from "@/shared/lib/site/commercial-video";
import { COMPARISON_PAGE_PATHS } from "@/shared/lib/site/comparison-paths";
import { LANDING_PAGE_PATHS } from "@/shared/lib/site/landing-pages";
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
          "/contact",
          ...LANDING_PAGE_PATHS,
          // The commercial's watch page (it is in the sitemap; without this
          // line Search Console rejects it as blocked by robots.txt).
          VIDEO_PAGE_PATH,
          ...COMPARISON_PAGE_PATHS,
          "/insights",
          "/resources",
          // The sitemap itself: with `disallow: "/"` below, an unlisted
          // /sitemap.xml is blocked and Search Console reports "Couldn't fetch".
          "/sitemap.xml",
          "/og.png",
          "/icons/",
          "/favicon.svg",
          "/apple-touch-icon.png",
          // Public marketing media: the commercial (VideoObject contentUrl and
          // thumbnail), its poster, the hero image and the product screenshots.
          "/marketing/",
          // The built CSS/JS and optimised images. Google renders pages before
          // indexing them; with these blocked it sees every page unstyled.
          "/_next/static/",
          "/_next/image",
        ],
        disallow: "/",
      },
    ],
    sitemap: `${PUBLIC_SITE_ORIGIN}/sitemap.xml`,
  };
}
