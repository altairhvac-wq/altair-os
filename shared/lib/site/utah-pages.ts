/**
 * The Utah pages: a set of public pages written for Utah HVAC shops.
 *
 * Owner decision 2026-11-25: build Utah on top of the national site, one page
 * at a time, without changing the existing pages. Each page is added to this
 * list when it ships, and the middleware, robots.txt and the sitemap all read
 * the list, so a page is public, crawlable and listed in one step.
 *
 * Pure (no imports), so the middleware can read the paths at the edge.
 */

export const UTAH_LABOR_RATES_PATH = "/utah/hvac-labor-rates";

export const UTAH_PAGE_PATHS: readonly string[] = [UTAH_LABOR_RATES_PATH];
