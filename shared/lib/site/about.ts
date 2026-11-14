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
/**
 * The affiliate program page and its application (shared/types/affiliates.ts,
 * migration 213). The page itself reads no data; the form posts to a Server
 * Action that checks everything itself (app/actions/affiliates.ts).
 */
export const AFFILIATES_PATH = "/affiliates";

/** Public pages added with the About page; listed once for middleware, robots and the sitemap. */
export const COMPANY_PAGE_PATHS: readonly string[] = [ABOUT_PATH, FOR_TECHS_PATH, AFFILIATES_PATH];

export const FOUNDER = {
  name: "Jeremiah Arn",
  title: "Founder and CEO",
} as const;

/**
 * The picture on /about, supplied by the owner on 2026-11-12 "for now".
 *
 * ============ SMALL ON PURPOSE ============
 * The owner asked that nobody be able to zoom in on it: the picture has flaws
 * that show when it is enlarged. A browser cannot be stopped from zooming, so
 * the limit is in the file itself. public/marketing/about/founder-family.webp
 * is 480 x 640 and is the only copy on the site; the page shows it about
 * 240 px wide, links to nothing larger, and serves it as it is (no generated
 * larger variants). Do not replace it with a bigger file, and do not add a
 * click-to-enlarge. When the owner supplies a better photo, swap the file and
 * these numbers together.
 */
export const FOUNDER_PHOTO = {
  src: "/marketing/about/founder-family.webp",
  width: 480,
  height: 640,
  alt: "Jeremiah Arn with family and the family dog, standing on red rock at sunset.",
} as const;

export const COMPANY_FACTS = {
  foundedYear: "2026",
  location: "Salt Lake County, Utah",
} as const;
