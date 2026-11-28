import type { MetadataRoute } from "next";
import { VIDEO_PAGE_PATH } from "@/shared/lib/site/commercial-video";
import { COMPETITOR_PAGE_PATHS } from "@/shared/lib/site/comparison-paths";
import { LANDING_PAGE_PATHS } from "@/shared/lib/site/landing-pages";
import { PUBLIC_SITE_ORIGIN } from "@/shared/lib/site/public-site";
import { COMPANY_PAGE_PATHS } from "@/shared/lib/site/about";
import { UTAH_PAGE_PATHS } from "@/shared/lib/site/utah-pages";
import { HOW_TO_PATH } from "@/shared/lib/help/paths";

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
 * and library; `/directory` covers the contractor directory.
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
          // The trial sign-up page is indexed (it carries a canonical without
          // its query string). /login is crawlable only so Google can read
          // its noindex and canonical: in November 2026 Search Console still
          // held two old /login?next=... redirect targets as "Duplicate
          // without user-selected canonical", and a blocked page can never
          // tell Google it should be dropped.
          "/signup",
          "/login",
          ...COMPANY_PAGE_PATHS,
          ...LANDING_PAGE_PATHS,
          // The Utah pages, each by its exact path (shared/lib/site/utah-pages.ts).
          ...UTAH_PAGE_PATHS,
          // The commercial's watch page (it is in the sitemap; without this
          // line Search Console rejects it as blocked by robots.txt).
          VIDEO_PAGE_PATH,
          ...COMPETITOR_PAGE_PATHS,
          "/insights",
          "/resources",
          // The how-to library: the index and one page per note.
          HOW_TO_PATH,
          // The contractor directory: search, listings and the listing form.
          // The manage page is under it and marks itself noindex.
          "/directory",
          // The sitemap itself: with `disallow: "/"` below, an unlisted
          // /sitemap.xml is blocked and Search Console reports "Couldn't fetch".
          "/sitemap.xml",
          // The description of the company written for AI assistants (app/llms.txt/route.ts).
          "/llms.txt",
          "/og.png",
          "/icons/",
          "/favicon.svg",
          // Next links app/favicon.ico from every page; Search Console listed
          // it as "Blocked by robots.txt", and Google uses it in results.
          "/favicon.ico",
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
