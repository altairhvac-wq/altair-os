import { calculatorPath, RESOURCES_PATH, type ResourceCalculatorEntry } from "@/shared/lib/resources/catalog";
import { INVOICE_BUILDER_PATH, LABOR_WORKSPACE_PATH } from "@/shared/lib/resources/tool-hub";
import { COMMERCIAL_JOB_START, VIDEO_PAGE_PATH } from "@/shared/lib/site/commercial-video";

/**
 * The "Next step" module's links, chosen by hand for each page.
 *
 * ============ THE RULE ============
 * Each page gets two or three steps that answer the visitor's likely next
 * question on THAT page: usually a free tool, the guide that explains it and
 * the software page for that part of the job. Nothing here is picked
 * automatically. Only pages that exist are named: the guides are the
 * Insights articles published as of 2026-11-20 (the same slugs as
 * shared/lib/site/internal-links.ts), and the directory pages shipped in PR #96.
 *
 * `id` is a short slug for analytics ("next-tool-labor-workspace"); it is
 * written here, never taken from anything a visitor typed.
 */

export type NextStepKind = "tool" | "guide" | "software" | "video" | "hub" | "directory";

export type NextStepItem = {
  readonly kind: NextStepKind;
  readonly id: string;
  readonly href: string;
  readonly title: string;
  readonly text: string;
  /** Small right-hand note, e.g. "Free · about 10 min". */
  readonly meta?: string;
  /** Overrides the kind's default call to action. */
  readonly cta?: string;
};

type CalculatorSlug = ResourceCalculatorEntry["slug"];

// ---------------------------------------------------------------- building blocks

const TOOLS = {
  laborWorkspace: {
    kind: "tool",
    id: "labor-workspace",
    href: LABOR_WORKSPACE_PATH,
    title: "HVAC Labor Cost Workspace",
    text: "Your break-even and recommended hourly rate for the whole crew, with a flat-rate price builder.",
    meta: "Free · about 10 min",
  },
  invoiceBuilder: {
    kind: "tool",
    id: "invoice-builder",
    href: INVOICE_BUILDER_PATH,
    title: "HVAC Invoice Builder",
    text: "A complete, professional invoice with equipment, refrigerant, labor and parts. Print or save as PDF.",
    meta: "Free · about 5 min",
  },
  laborRate: {
    kind: "tool",
    id: "labor-rate",
    href: calculatorPath("labor-rate"),
    title: "Quick labor rate calculator",
    text: "One technician's billable rate from six numbers.",
    meta: "Free · about 2 min",
  },
  breakEven: {
    kind: "tool",
    id: "break-even",
    href: calculatorPath("break-even"),
    title: "HVAC break-even calculator",
    text: "How many jobs a month it takes to cover your fixed costs.",
    meta: "Free · about 2 min",
  },
  jobProfit: {
    kind: "tool",
    id: "job-profitability",
    href: calculatorPath("job-profitability"),
    title: "Job profitability calculator",
    text: "What one job really made once labor, parts and overhead are counted.",
    meta: "Free · about 2 min",
  },
  agreement: {
    kind: "tool",
    id: "maintenance-agreement",
    href: calculatorPath("maintenance-agreement"),
    title: "Maintenance agreement pricing",
    text: "Price an agreement from what the visits and the member discount cost you.",
    meta: "Free · about 3 min",
  },
  techPay: {
    kind: "tool",
    id: "technician-pay",
    href: calculatorPath("technician-pay"),
    title: "Technician pay calculator",
    text: "One real week paid hourly, flat rate and commission, side by side.",
    meta: "Free · about 3 min",
  },
  callback: {
    kind: "tool",
    id: "callback-cost",
    href: calculatorPath("callback-cost"),
    title: "Callback cost calculator",
    text: "What free return trips cost a month and a year, and the hours they take.",
    meta: "Free · about 2 min",
  },
} as const satisfies Record<string, NextStepItem>;

export const GUIDES = {
  serviceCall: {
    kind: "guide",
    id: "service-call",
    href: "/insights/how-to-price-an-hvac-service-call",
    title: "How to price an HVAC service call",
    text: "A worked example that turns your labor rate into a service call fee.",
  },
  whatOnInvoice: {
    kind: "guide",
    id: "what-on-invoice",
    href: "/insights/what-to-put-on-an-hvac-invoice",
    title: "What to put on an HVAC invoice",
    text: "A line-by-line checklist, from the equipment to the payment terms.",
  },
  breakEven: {
    kind: "guide",
    id: "break-even-jobs",
    href: "/insights/hvac-break-even-jobs-per-month",
    title: "HVAC break-even: how many jobs a month?",
    text: "What the break-even number means and how to move it.",
  },
  jobProfit: {
    kind: "guide",
    id: "job-profit",
    href: "/insights/job-profitability-per-job",
    title: "Is that HVAC job making money?",
    text: "Gross and net profit on one job, and the small job that comes back.",
  },
  startAndGrow: {
    kind: "guide",
    id: "start-and-grow",
    href: "/insights/how-to-start-and-grow-an-hvac-company",
    title: "How to start and grow an HVAC company",
    text: "Pricing, first customers, your first hire and cash flow through the seasons.",
  },
  invoiceGap: {
    kind: "guide",
    id: "invoice-gap",
    href: "/insights/job-completion-to-invoice-gap",
    title: "Why invoices lag behind finished jobs",
    text: "Closing the gap between work done and work billed.",
  },
  laborRate: {
    kind: "guide",
    id: "labor-rate-guide",
    href: `${LABOR_WORKSPACE_PATH}#how-it-works`,
    title: "How to calculate an HVAC labor rate",
    text: "Burden, unbilled hours, overhead and margin, step by step with a worked example.",
  },
} as const satisfies Record<string, NextStepItem>;

const SOFTWARE = {
  business: {
    kind: "software",
    id: "hvac-software",
    href: "/hvac-software",
    title: "HVAC business software",
    text: "Leads, jobs, dispatch, estimates, invoices, time clock and reports on one record.",
  },
  dispatch: {
    kind: "software",
    id: "dispatch",
    href: "/hvac-dispatch-software",
    title: "HVAC dispatch software",
    text: "One board for the day's jobs, and the job on the technician's phone.",
  },
  estimating: {
    kind: "software",
    id: "estimating",
    href: "/hvac-estimating-software",
    title: "HVAC estimating software",
    text: "Estimates from your price book that customers approve on their phone.",
  },
  invoicing: {
    kind: "software",
    id: "invoicing",
    href: "/hvac-invoicing-software",
    title: "HVAC invoicing software",
    text: "The finished job becomes the invoice, and the customer pays from a link.",
  },
} as const satisfies Record<string, NextStepItem>;

const VIDEO = {
  kind: "video",
  id: "one-job",
  href: `${VIDEO_PAGE_PATH}?t=${COMMERCIAL_JOB_START}`,
  title: "Watch one job, first call to paid",
  text: "Lead, estimate, signature, dispatch, the tech's phone and payment, in the real product with sample data.",
  meta: "2:27 video",
} as const satisfies NextStepItem;

const HUB = {
  kind: "hub",
  id: "free-tools",
  href: RESOURCES_PATH,
  title: "All the free tools",
  text: "Calculators, two full workspaces and templates, grouped by the job they help with.",
  meta: "No account",
} as const satisfies NextStepItem;

const DIRECTORY = {
  kind: "directory",
  id: "directory-list",
  href: "/directory/list",
  title: "List your business in the directory",
  text: "A free listing with no lead fees, a link to your website and monthly numbers.",
  meta: "Free",
} as const satisfies NextStepItem;

const PRICING = {
  kind: "software",
  id: "pricing",
  href: "/pricing",
  title: "Plans and prices",
  text: "What each plan costs a month, what it includes, and what is not built yet.",
  cta: "See the plans",
} as const satisfies NextStepItem;

// ---------------------------------------------------------------- per page

export const NEXT_STEPS = {
  /** Homepage "Start here": for the visitor who is not ready for a trial. */
  home: [
    { ...TOOLS.laborWorkspace, title: "Price your work", text: "The Labor Cost Workspace works out what every billed hour has to cover, for one tech or a crew." },
    { ...TOOLS.invoiceBuilder, title: "Bill faster", text: "The Invoice Builder makes a complete HVAC invoice you can print or save as a PDF. Nothing is uploaded." },
    { ...VIDEO, title: "See one job start to finish", text: "A call becomes an estimate, she signs on her phone, the tech runs it and it is paid the same day.", meta: "Starts at 0:51" },
  ],
  /** The tools strip sits just above it on that page, so no tool here. */
  howItWorks: [SOFTWARE.business, PRICING, GUIDES.startAndGrow],
  resourcesHub: [GUIDES.startAndGrow, VIDEO, DIRECTORY],
  laborWorkspace: [
    { ...TOOLS.breakEven, text: "Take the rate you just built and see how many jobs a month cover your costs." },
    GUIDES.serviceCall,
    SOFTWARE.estimating,
  ],
  invoiceBuilder: [
    { ...TOOLS.laborWorkspace, text: "The rate that belongs on the labor line, worked out from your own costs." },
    GUIDES.whatOnInvoice,
    SOFTWARE.invoicing,
  ],
  insights: [HUB, VIDEO, SOFTWARE.business],
  pricing: [VIDEO, { ...TOOLS.laborWorkspace, text: "Check what your hours have to bill for before you choose a plan." }, HUB],
  contact: [VIDEO, HUB, SOFTWARE.business],
  /** The page already ends with the video and the trial. */
  about: [GUIDES.startAndGrow, HUB, DIRECTORY],
  forTechs: [
    { ...TOOLS.techPay, text: "Check an offer: one real week paid hourly, flat rate and commission." },
    { ...VIDEO, text: "See the job land on the tech's phone, from the address to closing it out.", meta: "Starts at 0:51" },
    SOFTWARE.dispatch,
  ],
  /** The comparison pages already show the video. */
  comparison: [SOFTWARE.business, PRICING, HUB],
} as const satisfies Record<string, readonly NextStepItem[]>;

/** Each calculator's next tool, guide and software page. */
export const CALCULATOR_NEXT_STEPS: Record<CalculatorSlug, readonly NextStepItem[]> = {
  "labor-rate": [
    { ...TOOLS.laborWorkspace, text: "The full version: the whole crew, itemized burden, a flat-rate price book and an after-hours rate card." },
    GUIDES.serviceCall,
    SOFTWARE.estimating,
  ],
  "job-profitability": [
    { ...TOOLS.breakEven, text: "Put your average job into the month: how many it takes to cover your costs." },
    GUIDES.jobProfit,
    SOFTWARE.invoicing,
  ],
  "break-even": [
    { ...TOOLS.agreement, text: "Agreements add steady revenue to the month. Price one from your cost to serve." },
    GUIDES.breakEven,
    SOFTWARE.dispatch,
  ],
  "maintenance-agreement": [
    { ...TOOLS.laborWorkspace, text: "The cost per billable hour this calculator asks for, worked out for your crew." },
    GUIDES.startAndGrow,
    SOFTWARE.business,
  ],
  "technician-pay": [
    { ...TOOLS.laborWorkspace, text: "See what that pay costs per billed hour once burden, unbilled time and overhead are added." },
    { ...GUIDES.startAndGrow, text: "Includes when to hire your first technician, and pricing so the payroll is covered." },
    SOFTWARE.business,
  ],
  "callback-cost": [
    { ...TOOLS.jobProfit, text: "Run a job that came back: what it made once the free trip is counted." },
    GUIDES.jobProfit,
    SOFTWARE.dispatch,
  ],
};

/** The published Insights articles' next steps, by slug. Others keep the article's own tools list. */
export const ARTICLE_NEXT_STEPS: Readonly<Record<string, readonly NextStepItem[]>> = {
  "job-completion-to-invoice-gap": [TOOLS.invoiceBuilder, GUIDES.whatOnInvoice, SOFTWARE.invoicing],
  "job-profitability-per-job": [TOOLS.jobProfit, GUIDES.breakEven, SOFTWARE.invoicing],
  "hvac-break-even-jobs-per-month": [TOOLS.breakEven, GUIDES.jobProfit, SOFTWARE.dispatch],
  "how-to-start-and-grow-an-hvac-company": [TOOLS.laborWorkspace, GUIDES.breakEven, SOFTWARE.business],
  "what-to-put-on-an-hvac-invoice": [TOOLS.invoiceBuilder, GUIDES.invoiceGap, SOFTWARE.invoicing],
  "how-to-price-an-hvac-service-call": [TOOLS.laborWorkspace, GUIDES.breakEven, SOFTWARE.estimating],
};
