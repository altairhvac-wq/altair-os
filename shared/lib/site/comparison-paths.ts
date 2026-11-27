/**
 * Paths of the competitor comparison pages.
 *
 * Imports nothing from the app, so the middleware (public routes) can read
 * it at the edge; robots.txt and the sitemap read the same list.
 */
export const COMPARISON_PAGE_PATHS = ["/servicetitan-alternative", "/jobber-housecall-pro-alternatives"] as const;

export type ComparisonPagePath = (typeof COMPARISON_PAGE_PATHS)[number];

/** The page for owners moving from another app (shared/lib/site/switch-page.ts). */
export const SWITCH_PAGE_PATH = "/switch";

/** Every competitor-related public page: the comparisons and /switch. */
export const COMPETITOR_PAGE_PATHS: readonly string[] = [...COMPARISON_PAGE_PATHS, SWITCH_PAGE_PATH];
