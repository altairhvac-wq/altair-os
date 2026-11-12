/**
 * Paths of the competitor comparison pages.
 *
 * Imports nothing from the app, so the middleware (public routes) can read
 * it at the edge; robots.txt and the sitemap read the same list.
 */
export const COMPARISON_PAGE_PATHS = ["/servicetitan-alternative", "/jobber-housecall-pro-alternatives"] as const;

export type ComparisonPagePath = (typeof COMPARISON_PAGE_PATHS)[number];
