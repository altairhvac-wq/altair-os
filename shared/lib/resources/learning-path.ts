import { calculatorPath } from "@/shared/lib/resources/catalog";
import { INVOICE_BUILDER_PATH, LABOR_WORKSPACE_PATH } from "@/shared/lib/resources/tool-hub";

/**
 * /resources/guides as a learning path: the guides and free tools a new HVAC
 * owner needs, in the order they need them. /insights lists every article by
 * topic; this page is a sequence, and mixes in the tools.
 *
 * ============ ONLY PAGES THAT EXIST ============
 * A guide step names an Insights slug; the page shows it only while the
 * database says that article is published (its title and read time come
 * from the row), and otherwise falls back to the step's tool, or drops the
 * step. Tool steps point at the tool pages shipped in batches 1 and 2. The
 * minutes for a tool are the hub's own "about" estimate (tool-hub.ts).
 *
 * The order follows the start-and-grow guide: the basics, then pricing
 * (rate, service call, agreements), then the month (break-even, job profit),
 * then billing, then the first hire.
 */

export type PathStage = "Set up" | "Price your work" | "Know your numbers" | "Get paid" | "Grow the team";

export type PathLink =
  | { readonly kind: "guide"; readonly slug: string }
  | { readonly kind: "tool"; readonly href: string; readonly title: string; readonly hubId: string };

export type PathStep = {
  readonly id: string;
  readonly stage: PathStage;
  readonly title: string;
  /** What you leave the step with. */
  readonly outcome: string;
  readonly primary: PathLink;
  readonly secondary?: PathLink;
};

export const LEARNING_PATH_STAGES: readonly PathStage[] = ["Set up", "Price your work", "Know your numbers", "Get paid", "Grow the team"];

export const LEARNING_PATH: readonly PathStep[] = [
  {
    id: "basics",
    stage: "Set up",
    title: "Get the basics right before the first job",
    outcome: "What to confirm with your state licensing board, what to budget for, and the signs it is time to hire.",
    primary: { kind: "guide", slug: "how-to-start-and-grow-an-hvac-company" },
  },
  {
    id: "rate",
    stage: "Price your work",
    title: "Work out what one billed hour has to cover",
    outcome: "Your break-even and recommended hourly rate, from wages, burden, unbilled time, overhead and margin.",
    primary: { kind: "tool", href: LABOR_WORKSPACE_PATH, title: "HVAC Labor Cost Workspace", hubId: "labor-workspace" },
    secondary: { kind: "tool", href: calculatorPath("labor-rate"), title: "Quick labor rate calculator", hubId: "labor-rate" },
  },
  {
    id: "service-call",
    stage: "Price your work",
    title: "Price the service call from that rate",
    outcome: "A diagnostic fee that covers the visit, and what a cheap or free one really costs you.",
    primary: { kind: "guide", slug: "how-to-price-an-hvac-service-call" },
  },
  {
    id: "agreement",
    stage: "Price your work",
    title: "Price a maintenance agreement",
    outcome: "An agreement price from what the visits and the member discount cost you, for steadier shoulder seasons.",
    primary: { kind: "tool", href: calculatorPath("maintenance-agreement"), title: "Maintenance agreement pricing calculator", hubId: "maintenance-agreement" },
  },
  {
    id: "break-even",
    stage: "Know your numbers",
    title: "Find how many jobs cover the month",
    outcome: "Your break-even jobs and revenue, and the two levers that move it.",
    primary: { kind: "guide", slug: "hvac-break-even-jobs-per-month" },
    secondary: { kind: "tool", href: calculatorPath("break-even"), title: "Break-even calculator", hubId: "break-even" },
  },
  {
    id: "job-profit",
    stage: "Know your numbers",
    title: "Check what each job really made",
    outcome: "Gross and net profit on one job, and how one callback can turn it into a loss.",
    primary: { kind: "guide", slug: "job-profitability-per-job" },
    secondary: { kind: "tool", href: calculatorPath("job-profitability"), title: "Job profitability calculator", hubId: "job-profitability" },
  },
  {
    id: "invoice",
    stage: "Get paid",
    title: "Put everything on the invoice",
    outcome: "A line-by-line checklist, from the equipment serial to the way to pay.",
    primary: { kind: "guide", slug: "what-to-put-on-an-hvac-invoice" },
    secondary: { kind: "tool", href: INVOICE_BUILDER_PATH, title: "HVAC Invoice Builder", hubId: "invoice-builder" },
  },
  {
    id: "invoice-gap",
    stage: "Get paid",
    title: "Close the gap between done and billed",
    outcome: "Where finished work waits to be invoiced, and the one number worth tracking.",
    primary: { kind: "guide", slug: "job-completion-to-invoice-gap" },
  },
  {
    id: "first-hire",
    stage: "Grow the team",
    title: "Compare pay plans before your first hire",
    outcome: "One real week paid hourly, flat rate and commission, side by side.",
    primary: { kind: "tool", href: calculatorPath("technician-pay"), title: "Technician pay calculator", hubId: "technician-pay" },
    secondary: { kind: "tool", href: calculatorPath("callback-cost"), title: "Callback cost calculator", hubId: "callback-cost" },
  },
];
