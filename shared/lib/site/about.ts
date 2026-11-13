/**
 * Who builds Altair Operating System, and the two pages that say so.
 *
 * ============ ONLY WHAT THE OWNER HAS STATED ============
 * The site said "built by an HVAC company owner" in several places and named
 * nobody (site audit 2026-11-12). These are the facts the owner has given for
 * public listings: name, title, the year the company started and where it is
 * based. Nothing else about the founder is written anywhere on the site: no
 * years in the trade, no licence, no customer counts. Add a fact here only
 * when the owner has stated it, and the pages pick it up.
 *
 * Pure (no imports), so the middleware can read the paths at the edge.
 */

export const ABOUT_PATH = "/about";
export const FOR_TECHS_PATH = "/for-techs";

/** Public pages added with the About page; listed once for middleware, robots and the sitemap. */
export const COMPANY_PAGE_PATHS: readonly string[] = [ABOUT_PATH, FOR_TECHS_PATH];

export const FOUNDER = {
  name: "Jeremiah Arn",
  title: "Founder and CEO",
} as const;

export const COMPANY_FACTS = {
  foundedYear: "2026",
  location: "Salt Lake County, Utah",
} as const;
