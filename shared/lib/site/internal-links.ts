import type { ResourceCalculatorEntry } from "@/shared/lib/resources/catalog";

/**
 * Which public pages point at which, in one place.
 *
 * ============ WHY A MAP AND NOT LINKS TYPED INTO EACH PAGE ============
 * Search Console (28 days to 2026-11-15) showed the product pages ranking far
 * below the free tools and articles that should feed them: the invoicing page
 * at position 71, dispatch at 14, while the calculators and articles reached
 * page one for their own questions. Google learns what a page is about partly
 * from the words other pages use to link to it, and the old links said "See
 * Price Book", "Dispatch" or "Invoicing". Every link here names the page the
 * way an owner searches for it ("HVAC invoicing software"), and every
 * calculator, article and software page links to its neighbours through this
 * file, so a new page is wired in by adding one entry.
 *
 * Only pages that exist are named. Article slugs are the published Insights
 * pages as of 2026-11-17; the software pages read them through
 * `SOFTWARE_PAGE_RELATED`, and the article page itself only ever links to
 * articles the database says are published.
 *
 * Type-only import, so the module stays pure.
 */

export type CalculatorSlug = ResourceCalculatorEntry["slug"];

export type SoftwarePagePath =
  | "/hvac-software"
  | "/hvac-dispatch-software"
  | "/hvac-estimating-software"
  | "/hvac-invoicing-software";

export type SoftwarePageLink = {
  readonly href: SoftwarePagePath;
  /** The anchor text: the search the page is built for. */
  readonly label: string;
  /** One sentence on what the visitor finds there. */
  readonly text: string;
};

export const SOFTWARE_PAGES: Record<SoftwarePagePath, SoftwarePageLink> = {
  "/hvac-software": {
    href: "/hvac-software",
    label: "HVAC business software",
    text: "Leads, jobs, dispatch, estimates, invoices, time clock and reports on one record.",
  },
  "/hvac-dispatch-software": {
    href: "/hvac-dispatch-software",
    label: "HVAC dispatch software",
    text: "One board for the day's jobs, a map of the work, and the job on the technician's phone.",
  },
  "/hvac-estimating-software": {
    href: "/hvac-estimating-software",
    label: "HVAC estimating software",
    text: "Estimates from your price book that customers approve and sign on their phone.",
  },
  "/hvac-invoicing-software": {
    href: "/hvac-invoicing-software",
    label: "HVAC invoicing software",
    text: "The finished job becomes the invoice, and the customer pays from a link.",
  },
};

export const SOFTWARE_PAGE_ORDER: readonly SoftwarePagePath[] = [
  "/hvac-invoicing-software",
  "/hvac-dispatch-software",
  "/hvac-estimating-software",
  "/hvac-software",
];

/** The software page (or two) each calculator's numbers feed into. */
export const CALCULATOR_SOFTWARE: Record<CalculatorSlug, readonly SoftwarePagePath[]> = {
  "labor-rate": ["/hvac-invoicing-software", "/hvac-estimating-software"],
  "job-profitability": ["/hvac-invoicing-software", "/hvac-software"],
  "break-even": ["/hvac-dispatch-software", "/hvac-invoicing-software"],
  "maintenance-agreement": ["/hvac-software", "/hvac-dispatch-software"],
  "technician-pay": ["/hvac-software", "/hvac-dispatch-software"],
  "callback-cost": ["/hvac-dispatch-software", "/hvac-software"],
  "service-call-fee": ["/hvac-estimating-software", "/hvac-dispatch-software"],
};

export type ArticleLinks = {
  readonly software: SoftwarePagePath;
  readonly tools: readonly CalculatorSlug[];
};

/** Published Insights articles: the software page and the tools that answer their next question. */
export const ARTICLE_LINKS: Record<string, ArticleLinks> = {
  "job-completion-to-invoice-gap": {
    software: "/hvac-invoicing-software",
    tools: ["job-profitability", "labor-rate", "break-even"],
  },
  "job-profitability-per-job": {
    software: "/hvac-invoicing-software",
    tools: ["job-profitability", "labor-rate", "callback-cost"],
  },
  "how-to-calculate-hvac-labor-rate": {
    software: "/hvac-estimating-software",
    tools: ["labor-rate", "technician-pay", "break-even"],
  },
  "hvac-break-even-jobs-per-month": {
    software: "/hvac-dispatch-software",
    tools: ["break-even", "job-profitability", "labor-rate"],
  },
  "how-to-start-and-grow-an-hvac-company": {
    software: "/hvac-software",
    tools: ["break-even", "labor-rate", "maintenance-agreement"],
  },
  "what-to-put-on-an-hvac-invoice": {
    software: "/hvac-invoicing-software",
    tools: ["job-profitability", "labor-rate", "break-even"],
  },
  "hvac-invoice-template": {
    software: "/hvac-invoicing-software",
    tools: ["job-profitability", "labor-rate", "callback-cost"],
  },
  "how-to-price-an-hvac-service-call": {
    software: "/hvac-estimating-software",
    tools: ["labor-rate", "break-even", "job-profitability"],
  },
};

/** An article not listed above (a newer one) still gets a software page and tools. */
export const DEFAULT_ARTICLE_LINKS: ArticleLinks = {
  software: "/hvac-software",
  tools: ["labor-rate", "job-profitability", "break-even"],
};

export function articleLinksFor(slug: string): ArticleLinks {
  return ARTICLE_LINKS[slug] ?? DEFAULT_ARTICLE_LINKS;
}

export type ArticleReference = { readonly slug: string; readonly title: string };

/** Articles and tools each software page links to. Titles are the articles' own. */
export const SOFTWARE_PAGE_RELATED: Record<
  SoftwarePagePath,
  { readonly tools: readonly CalculatorSlug[]; readonly articles: readonly ArticleReference[] }
> = {
  "/hvac-software": {
    tools: ["labor-rate", "job-profitability", "break-even"],
    articles: [
      { slug: "how-to-start-and-grow-an-hvac-company", title: "How to Start and Grow an HVAC Company" },
      { slug: "job-completion-to-invoice-gap", title: "Why Invoices Lag Behind Finished Jobs" },
    ],
  },
  "/hvac-dispatch-software": {
    tools: ["break-even", "callback-cost", "technician-pay"],
    articles: [
      { slug: "hvac-break-even-jobs-per-month", title: "HVAC Break-Even: How Many Jobs a Month?" },
      { slug: "how-to-start-and-grow-an-hvac-company", title: "How to Start and Grow an HVAC Company" },
    ],
  },
  "/hvac-estimating-software": {
    tools: ["labor-rate", "job-profitability", "maintenance-agreement"],
    articles: [
      { slug: "how-to-price-an-hvac-service-call", title: "How to Price an HVAC Service Call: A Worked Example" },
      { slug: "how-to-calculate-hvac-labor-rate", title: "HVAC labor rate calculator and cost workspace" },
      { slug: "job-profitability-per-job", title: "Is That HVAC Job Making Money?" },
    ],
  },
  "/hvac-invoicing-software": {
    tools: ["labor-rate", "job-profitability", "break-even"],
    articles: [
      { slug: "what-to-put-on-an-hvac-invoice", title: "What to Put on an HVAC Invoice: A Line-by-Line Checklist" },
      { slug: "hvac-invoice-template", title: "HVAC invoice template and builder" },
      { slug: "job-completion-to-invoice-gap", title: "Why Invoices Lag Behind Finished Jobs" },
    ],
  },
};
