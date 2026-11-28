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

/**
 * Why the company exists, in the words of docs/foundation/The_Altair_Mission.md
 * (section 26.1, the last sentence, unchanged).
 */
export const MISSION_STATEMENT =
  "Altair exists to give business owners their time, clarity, and confidence back, so they can focus on growing the business they imagined instead of managing the chaos they inherited.";

/**
 * How decisions get made, from docs/foundation/The_Altair_Principles.md
 * (section 26.5, the five questions, unchanged).
 */
export const DECISION_QUESTIONS: readonly string[] = [
  "Does this make someone's day simpler?",
  "Does this reduce friction?",
  "Does this earn trust?",
  "Does this help people build better businesses?",
  "Would we be proud to support this ten years from now?",
];

/**
 * ============ THE TIMELINE ON /about ============
 * Only dates that can be checked in this repository: each entry is the day
 * the work reached the main branch (which Vercel deploys), from `git log`.
 * The commit or pull request is named beside each one. Month precision on
 * the page, so a deploy that landed a day later never makes it wrong.
 *
 * Not here on purpose: a "public launch" date (none is recorded anywhere in
 * the repository or docs) and anything about the founder's own history. The
 * owner adds those in his own words.
 */
export type AboutTimelineEntry = {
  /** ISO month, for <time dateTime>. */
  readonly month: string;
  /** As shown: "May 2026". */
  readonly label: string;
  readonly items: readonly { readonly text: string; readonly href?: string }[];
};

export const ABOUT_TIMELINE: readonly AboutTimelineEntry[] = [
  {
    month: "2026-05",
    label: "May 2026",
    items: [
      // f0657c11 / 16b34442 (2026-05-24/25), 1a198d4b (2026-05-25)
      { text: "First build: customer records, jobs, dispatch and the technician's job steps." },
      // 50ae672f (2026-05-28), ee2375d7 (2026-05-29)
      { text: "Estimates customers approve from a link, and invoices they pay from a link." },
    ],
  },
  {
    month: "2026-07",
    label: "July 2026",
    // df05bf63 (2026-07-30)
    items: [{ text: "Monthly and annual plans, paid by card through Stripe.", href: "/pricing" }],
  },
  {
    month: "2026-10",
    label: "October 2026",
    items: [
      // d2266074, merged in PR #12 (2026-10-18)
      { text: "The free trial with no credit card." },
      // cabc4cbb (2026-10-24)
      { text: "Insights: articles on pricing, invoicing and running a shop.", href: "/insights" },
      // PR #24 (2026-10-25)
      { text: "The first free calculators and templates.", href: "/resources" },
    ],
  },
  {
    month: "2026-11",
    label: "November 2026",
    items: [
      // PR #57 (2026-11-11)
      { text: "A two-minute video of one job, from the first call to paid.", href: "/how-it-works" },
      // PR #79 (2026-11-12)
      { text: "The free contractor directory.", href: "/directory" },
      // PR #91 (2026-11-13)
      { text: "The affiliate program, with ten founding places.", href: "/affiliates" },
      // PRs #95 and #97 (2026-11-20)
      { text: "The Labor Cost Workspace, the Invoice Builder and the free tools hub.", href: "/resources" },
      // PR #98 (2026-11-21)
      { text: "A plan finder on the pricing page.", href: "/pricing#plan-finder" },
    ],
  },
];
