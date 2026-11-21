import { SAMPLE_INVOICE } from "@/shared/components/resources/invoice/invoice-state";
import { BREAK_EVEN_DEFAULTS, calculateBreakEven } from "@/shared/lib/resources/break-even";
import { CALLBACK_COST_DEFAULTS, calculateCallbackCost } from "@/shared/lib/resources/callback-cost";
import { calculatorPath, RESOURCES_TEMPLATES_PATH } from "@/shared/lib/resources/catalog";
import { calculateInvoiceTotals, formatCents } from "@/shared/lib/resources/invoice-builder";
import {
  JOB_PROFITABILITY_DEFAULTS,
  calculateJobProfitability,
} from "@/shared/lib/resources/job-profitability";
import { LABOR_RATE_DEFAULTS, calculateLaborRate } from "@/shared/lib/resources/labor-rate";
import {
  MAINTENANCE_AGREEMENT_DEFAULTS,
  calculateMaintenanceAgreement,
} from "@/shared/lib/resources/maintenance-agreement";
import { TECHNICIAN_PAY_DEFAULTS, calculateTechnicianPay } from "@/shared/lib/resources/technician-pay";

/**
 * Every free tool on the site, in one list: the /resources hub, the homepage
 * and /how-it-works tool strips and the "Next step" module all read it.
 *
 * ============ WHERE THE PREVIEW NUMBERS COME FROM ============
 * Each card shows the tool's own worked example, computed here by the same
 * function the tool runs, from the same defaults the tool opens with. They
 * are sample inputs (labelled "Worked example" on the card), not industry
 * data and not anyone's real figures. Change a default and the card follows.
 *
 * "inputs" is the number of fields the tool asks for in its quick form; the
 * minutes are our own estimate of a first run, shown as "about".
 */

export const LABOR_WORKSPACE_PATH = "/insights/how-to-calculate-hvac-labor-rate";
export const INVOICE_BUILDER_PATH = "/insights/hvac-invoice-template";

export type ToolJob = "price" | "team" | "paid" | "plan";

export const TOOL_JOBS: readonly {
  readonly id: ToolJob;
  readonly title: string;
  readonly text: string;
}[] = [
  {
    id: "price",
    title: "Price your work",
    text: "What an hour has to bill for, and what a maintenance agreement should cost.",
  },
  {
    id: "team",
    title: "Pay your team",
    text: "Compare pay plans on a real week, and see what free return trips cost your crew.",
  },
  {
    id: "paid",
    title: "Get paid",
    text: "A professional invoice in minutes, and templates for the paperwork around it.",
  },
  {
    id: "plan",
    title: "Plan the business",
    text: "How many jobs cover the month, and whether each job really made money.",
  },
];

export type ToolPreview =
  | { readonly kind: "rate"; readonly breakEven: number; readonly rate: number; readonly rounded: number }
  | { readonly kind: "figure"; readonly figure: string; readonly unit: string; readonly detail: string }
  | {
      readonly kind: "bars";
      readonly unit: string;
      readonly bars: readonly { readonly label: string; readonly value: number; readonly display: string }[];
    }
  | {
      readonly kind: "split";
      readonly total: string;
      readonly parts: readonly { readonly label: string; readonly value: number; readonly display: string; readonly tone: "cost" | "profit" | "neutral" }[];
    }
  | {
      readonly kind: "invoice";
      readonly lines: readonly { readonly description: string; readonly amount: string }[];
      readonly total: string;
    }
  | { readonly kind: "files"; readonly files: readonly string[] };

export type HubTool = {
  /** Short slug, also the analytics label for "next step" clicks. */
  readonly id: string;
  readonly title: string;
  readonly shortTitle: string;
  readonly href: string;
  readonly job: ToolJob;
  /** The question it answers, in the owner's words. */
  readonly solves: string;
  /** What you leave with. */
  readonly youGet: string;
  readonly minutes: number;
  readonly inputs: number | null;
  /** A full workspace rather than a single calculator. */
  readonly workspace: boolean;
  readonly preview: ToolPreview;
};

const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const usd0 = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const pct = (value: number) => `${(value * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;

const LABOR = calculateLaborRate(LABOR_RATE_DEFAULTS)!;
const AGREEMENT = calculateMaintenanceAgreement(MAINTENANCE_AGREEMENT_DEFAULTS)!;
const PAY = calculateTechnicianPay(TECHNICIAN_PAY_DEFAULTS)!;
const CALLBACK = calculateCallbackCost(CALLBACK_COST_DEFAULTS)!;
const BREAK_EVEN = calculateBreakEven(BREAK_EVEN_DEFAULTS)!;
const JOB = calculateJobProfitability(JOB_PROFITABILITY_DEFAULTS);
const INVOICE = calculateInvoiceTotals(SAMPLE_INVOICE);

export const HUB_TOOLS: readonly HubTool[] = [
  {
    id: "labor-workspace",
    title: "HVAC Labor Cost Workspace",
    shortTitle: "Labor Cost Workspace",
    href: LABOR_WORKSPACE_PATH,
    job: "price",
    solves: "What does a billed hour have to cover for my whole crew?",
    youGet: "Break-even and recommended rates, a flat-rate price builder and an after-hours rate card.",
    minutes: 10,
    inputs: null,
    workspace: true,
    preview: {
      kind: "rate",
      breakEven: LABOR.costPerBillableHour,
      rate: LABOR.billableHourlyRate,
      rounded: LABOR.billableHourlyRateRounded,
    },
  },
  {
    id: "labor-rate",
    title: "HVAC labor rate calculator",
    shortTitle: "Quick labor rate",
    href: calculatorPath("labor-rate"),
    job: "price",
    solves: "What should one technician's hour bill for?",
    youGet: "One billable rate from six numbers, with the formula shown.",
    minutes: 2,
    inputs: Object.keys(LABOR_RATE_DEFAULTS).length,
    workspace: false,
    preview: {
      kind: "figure",
      figure: usd0(LABOR.billableHourlyRateRounded),
      unit: "per billable hour",
      detail: `Break-even ${usd(LABOR.costPerBillableHour)}`,
    },
  },
  {
    id: "maintenance-agreement",
    title: "Maintenance agreement pricing calculator",
    shortTitle: "Maintenance agreement price",
    href: calculatorPath("maintenance-agreement"),
    job: "price",
    solves: "What should an agreement cost so the visits and member discount are paid for?",
    youGet: "A monthly and yearly price built from your cost to serve.",
    minutes: 3,
    inputs: Object.keys(MAINTENANCE_AGREEMENT_DEFAULTS).length,
    workspace: false,
    preview: {
      kind: "split",
      total: `${usd(AGREEMENT.monthlyPrice)}/mo`,
      parts: [
        { label: "Cost to serve", value: AGREEMENT.costToServePerYear, display: usd0(AGREEMENT.costToServePerYear), tone: "cost" },
        { label: "Left per agreement", value: AGREEMENT.profitPerAgreement, display: usd0(AGREEMENT.profitPerAgreement), tone: "profit" },
      ],
    },
  },
  {
    id: "technician-pay",
    title: "Technician pay calculator",
    shortTitle: "Technician pay",
    href: calculatorPath("technician-pay"),
    job: "team",
    solves: "Would this week pay more on hourly, flat rate or commission?",
    youGet: "One real week paid three ways, side by side, with pay per clock hour.",
    minutes: 3,
    inputs: Object.keys(TECHNICIAN_PAY_DEFAULTS).length,
    workspace: false,
    preview: {
      kind: "bars",
      unit: "one week",
      bars: [
        { label: "Hourly", value: PAY.hourlyPay, display: usd0(PAY.hourlyPay) },
        { label: "Flat rate", value: PAY.flatRatePay, display: usd0(PAY.flatRatePay) },
        { label: "Commission", value: PAY.commissionPay, display: usd0(PAY.commissionPay) },
      ],
    },
  },
  {
    id: "callback-cost",
    title: "Callback cost calculator",
    shortTitle: "Callback cost",
    href: calculatorPath("callback-cost"),
    job: "team",
    solves: "What are free return trips costing every month?",
    youGet: "The monthly and yearly cost, your callback rate and the hours lost.",
    minutes: 2,
    inputs: Object.keys(CALLBACK_COST_DEFAULTS).length,
    workspace: false,
    preview: {
      kind: "figure",
      figure: usd0(CALLBACK.costPerMonth),
      unit: "a month",
      detail: `${usd0(CALLBACK.costPerYear)} a year · ${CALLBACK.hoursLostPerMonth.toLocaleString("en-US")} hours lost`,
    },
  },
  {
    id: "invoice-builder",
    title: "HVAC Invoice Builder",
    shortTitle: "Invoice Builder",
    href: INVOICE_BUILDER_PATH,
    job: "paid",
    solves: "How do I send a clean, complete invoice without software?",
    youGet: "A printable invoice with labor, parts, refrigerant, tax and deposits, saved as PDF.",
    minutes: 5,
    inputs: null,
    workspace: true,
    preview: {
      kind: "invoice",
      lines: SAMPLE_INVOICE.lines.slice(0, 3).map((line, index) => ({
        description: line.description,
        amount: formatCents(INVOICE.lineCents[index] ?? 0),
      })),
      total: formatCents(INVOICE.totalCents),
    },
  },
  {
    id: "templates",
    title: "Free templates",
    shortTitle: "Templates",
    href: RESOURCES_TEMPLATES_PATH,
    job: "paid",
    solves: "Where do I start on an estimate or an agreement?",
    youGet: "An estimate, pricing worksheet, agreement outline and daily checklist: PDF, Excel or Word, each with a filled-in HVAC example.",
    minutes: 1,
    inputs: null,
    workspace: false,
    preview: {
      kind: "files",
      files: ["Estimate template", "Pricing worksheet", "Agreement outline", "Daily checklist"],
    },
  },
  {
    id: "break-even",
    title: "HVAC break-even calculator",
    shortTitle: "Break-even",
    href: calculatorPath("break-even"),
    job: "plan",
    solves: "How many jobs a month before the business stops losing money?",
    youGet: "Break-even jobs a month and a week, and the revenue that covers your costs.",
    minutes: 2,
    inputs: Object.keys(BREAK_EVEN_DEFAULTS).length,
    workspace: false,
    preview: {
      kind: "figure",
      figure: String(BREAK_EVEN.breakEvenJobs),
      unit: "jobs a month",
      detail: `${usd0(BREAK_EVEN.breakEvenRevenue)} of revenue`,
    },
  },
  {
    id: "job-profitability",
    title: "Job profitability calculator",
    shortTitle: "Job profit",
    href: calculatorPath("job-profitability"),
    job: "plan",
    solves: "Did that job make money once labor, parts and overhead are counted?",
    youGet: "Gross and net profit and margin for one job.",
    minutes: 2,
    inputs: Object.keys(JOB_PROFITABILITY_DEFAULTS).length,
    workspace: false,
    preview: {
      kind: "split",
      total: `${JOB.netMargin === null ? "–" : pct(JOB.netMargin)} net`,
      parts: [
        { label: "Direct cost", value: JOB.directCost, display: usd0(JOB.directCost), tone: "cost" },
        { label: "Overhead", value: JOB.overheadAllocated, display: usd0(JOB.overheadAllocated), tone: "neutral" },
        { label: "Net profit", value: Math.max(0, JOB.netProfit), display: usd0(JOB.netProfit), tone: "profit" },
      ],
    },
  },
];

export function hubTool(id: string): HubTool {
  const tool = HUB_TOOLS.find((entry) => entry.id === id);
  if (!tool) throw new Error(`Unknown hub tool: ${id}`);
  return tool;
}

export function toolsForJob(job: ToolJob): readonly HubTool[] {
  return HUB_TOOLS.filter((tool) => tool.job === job);
}

/** Tools you open and use (templates are downloads, not a tool). */
export const INTERACTIVE_TOOL_COUNT = HUB_TOOLS.filter((tool) => tool.id !== "templates").length;

/** The first-time owner's path: rate, then the month, then the bill. */
export const FIRST_TIME_PATH: readonly { readonly toolId: string; readonly step: string; readonly why: string }[] = [
  {
    toolId: "labor-workspace",
    step: "Know your rate",
    why: "Everything else is priced from it. Start with the worked example and swap in your own numbers.",
  },
  {
    toolId: "break-even",
    step: "Know your month",
    why: "Turn your fixed costs and average ticket into the number of jobs that keeps the lights on.",
  },
  {
    toolId: "invoice-builder",
    step: "Bill it properly",
    why: "Put that rate on a complete, professional invoice and save it as a PDF.",
  },
];
