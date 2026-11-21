/**
 * The site menu: every public page a visitor might want, grouped the way an
 * owner thinks about them, each with one line saying what it is for.
 *
 * ============ WHY ============
 * Until 2026-11-21 the top bar had six short links ("Product", "How it
 * works", ...) and every other page was reachable only from the footer; below
 * 1280 px wide the links disappeared behind the menu button. The owner: "we
 * can't find any of the other pages from it. It keeps you stuck on the
 * homepage." 76 of the 84 visits that started on the homepage (28 days to
 * 2026-11-20) left after one page.
 *
 * Pure data with no imports, because the menu is a Client Component on every
 * public page: pulling in the tool hub would ship its calculators to every
 * visitor. Paths here must match the routes; scripts/verify-site-menu.mjs
 * checks each one has a page.
 *
 * Copy rule: each line says what the page shows or does, nothing it does not.
 */

export type SiteMenuLink = {
  readonly href: string;
  readonly label: string;
  readonly text: string;
};

export type SiteMenuGroup = {
  readonly id: "software" | "tools" | "learn" | "company";
  readonly label: string;
  readonly links: readonly SiteMenuLink[];
  /** Smaller links under the main list (comparisons, "see all"). */
  readonly more?: readonly { readonly href: string; readonly label: string }[];
  /** The one highlighted box at the side of the panel. */
  readonly feature?: { readonly href: string; readonly eyebrow: string; readonly title: string; readonly text: string };
};

export const SITE_MENU: readonly SiteMenuGroup[] = [
  {
    id: "software",
    label: "Software",
    links: [
      { href: "/hvac-software", label: "HVAC business software", text: "Calls, jobs, estimates, invoices and payments on one record." },
      { href: "/hvac-dispatch-software", label: "Dispatch", text: "Today's board, the job map and the technician's phone." },
      { href: "/hvac-estimating-software", label: "Estimates", text: "Price-book estimates customers sign on their phone." },
      { href: "/hvac-invoicing-software", label: "Invoicing and payments", text: "From finished job to paid, by card, cash or check." },
      { href: "/for-techs", label: "For technicians", text: "What a tech sees and does on their phone." },
      { href: "/how-it-works", label: "How it works", text: "One job from first call to paid, in a 2:27 video." },
    ],
    more: [
      { href: "/servicetitan-alternative", label: "Compare: ServiceTitan" },
      { href: "/jobber-housecall-pro-alternatives", label: "Compare: Jobber and Housecall Pro" },
    ],
    feature: {
      href: "/#home-try-heading",
      eyebrow: "No account needed",
      title: "Try it right now",
      text: "Build an estimate, run the dispatch board and invoice a job with a sample company.",
    },
  },
  {
    id: "tools",
    label: "Free tools",
    links: [
      { href: "/insights/how-to-calculate-hvac-labor-rate", label: "Labor Cost Workspace", text: "What a billed hour has to cover for your whole crew." },
      { href: "/insights/hvac-invoice-template", label: "Invoice Builder", text: "A complete HVAC invoice you can print or save as a PDF." },
      { href: "/resources/calculators/technician-pay", label: "Technician pay", text: "Would a week pay more hourly, flat rate or commission?" },
      { href: "/resources/calculators/break-even", label: "Break-even", text: "How many jobs a month before the business stops losing money." },
      { href: "/resources/calculators/job-profitability", label: "Job profitability", text: "Did a job make money once labor, parts and overhead count?" },
      { href: "/resources/calculators/maintenance-agreement", label: "Maintenance agreements", text: "What a plan should cost so the visits and discount are paid for." },
      { href: "/resources/calculators/callback-cost", label: "Callback cost", text: "What free return trips are costing you every month." },
      { href: "/resources/templates", label: "Templates", text: "Estimate, pricing worksheet, agreement and checklist: PDF, Excel, Word." },
    ],
    more: [
      { href: "/resources/calculators", label: "All calculators" },
      { href: "/resources", label: "All free tools" },
    ],
    feature: {
      href: "/insights/how-to-calculate-hvac-labor-rate",
      eyebrow: "Most used",
      title: "Find your real labor rate",
      text: "Break-even and recommended rates, a flat-rate price builder and an after-hours rate card. About 10 minutes.",
    },
  },
  {
    id: "learn",
    label: "Learn",
    links: [
      { href: "/insights", label: "Articles", text: "Pricing, invoicing and running an HVAC shop, with worked numbers." },
      { href: "/resources/guides", label: "Learning path", text: "The guides and tools a new owner needs, in order." },
      { href: "/resources/library", label: "Resource library", text: "Search every article and video from both Altair channels." },
      { href: "/directory", label: "Contractor directory", text: "Find HVAC and trade companies near you." },
      { href: "/directory/list", label: "List your business free", text: "No lead fees, a link to your website. A person checks every listing." },
    ],
    feature: {
      href: "/how-it-works",
      eyebrow: "2:27 video",
      title: "Watch one job, first call to paid",
      text: "A call becomes a lead, an estimate, a signed job, a tech's visit and a paid invoice.",
    },
  },
  {
    id: "company",
    label: "Company",
    links: [
      { href: "/about", label: "About", text: "Who builds it, and why: an HVAC company owner." },
      { href: "/contact", label: "Contact", text: "Questions before you try it, answered by the founder." },
      { href: "/affiliates", label: "Affiliate program", text: "A share of what each shop you refer pays, for 12 months." },
    ],
  },
] as const;

/** The plain links beside the menus. */
export const SITE_MENU_PRICING = { href: "/pricing", label: "Pricing" } as const;

export function siteMenuGroupForPath(pathname: string): SiteMenuGroup["id"] | null {
  for (const group of SITE_MENU) {
    const paths = [...group.links.map((link) => link.href), ...(group.more ?? []).map((link) => link.href)];
    if (paths.some((href) => href !== "/" && (pathname === href || pathname.startsWith(`${href}/`)))) return group.id;
  }
  if (pathname.startsWith("/insights/")) return "learn";
  return null;
}
