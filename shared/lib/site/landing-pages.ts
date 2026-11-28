/**
 * The four software pages: their addresses, search titles and descriptions.
 *
 * This file imports nothing from the app, so the middleware can read the
 * path list at the edge, and robots.ts and sitemap.ts allow and list every
 * path here. The words on the pages, the demos' copy, the FAQ and the
 * evidence for each claim live in shared/lib/site/software-pages.ts; the
 * page template is shared/components/marketing/software/SoftwareLandingPage.tsx.
 *
 * ============ TITLES AND DESCRIPTIONS (2026-11-20 audit) ============
 * The root layout appends " · Altair Operating System" (26 characters) to
 * each title, so a title here is at most 34 characters to stay within the
 * roughly 60 a search result shows. Descriptions stay at or under 155.
 * scripts/verify-pricing-calculator.mjs checks both.
 */
export type LandingPageConfig = {
  path: string;
  /** Short name for links between the pages and the footer. */
  navLabel: string;
  /** Browser tab and search result title (the product suffix is added). */
  title: string;
  description: string;
};

export const LANDING_PAGES: readonly LandingPageConfig[] = [
  {
    path: "/hvac-software",
    navLabel: "HVAC software",
    title: "HVAC Business Software",
    description:
      "HVAC software for the whole company: leads, jobs, dispatch, estimates, invoices, time clock and reports on one record. 14-day free trial, no card.",
  },
  {
    path: "/hvac-dispatch-software",
    navLabel: "Dispatch software",
    title: "HVAC Dispatch Software",
    description:
      "HVAC dispatch software: the day's jobs on one board, assign and reassign technicians, a map of job addresses, each job on the tech's phone. Free trial.",
  },
  {
    path: "/hvac-estimating-software",
    navLabel: "Estimating software",
    title: "HVAC Estimating Software",
    description:
      "HVAC estimating software: price-book estimates customers approve and sign on their phone, then the job and the invoice. Try the demo. 14-day free trial.",
  },
  {
    path: "/hvac-invoicing-software",
    navLabel: "Invoicing software",
    title: "HVAC Invoicing Software & App",
    description:
      "HVAC invoicing software: the finished job becomes the invoice, customers pay by card from a link, and every payment is tracked. Try the demo, free.",
  },
];

export const LANDING_PAGE_PATHS: readonly string[] = LANDING_PAGES.map((page) => page.path);

export function findLandingPage(path: string): LandingPageConfig | undefined {
  return LANDING_PAGES.find((page) => page.path === path);
}
