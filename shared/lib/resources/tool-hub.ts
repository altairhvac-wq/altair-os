import { SAMPLE_INVOICE } from "@/shared/components/resources/invoice/invoice-state";
import { BREAK_EVEN_DEFAULTS, calculateBreakEven } from "@/shared/lib/resources/break-even";
import { CALLBACK_COST_DEFAULTS, calculateCallbackCost } from "@/shared/lib/resources/callback-cost";
import { calculatorPath, RESOURCES_FLAT_RATE_PATH, RESOURCES_TEMPLATES_PATH } from "@/shared/lib/resources/catalog";
import { FLAT_RATE_SAMPLE_AFTER_HOURS, FLAT_RATE_SAMPLE_RATE, FLAT_RATE_SAMPLE_TASKS, priceListLine } from "@/shared/lib/resources/flat-rate-list";
import { calculateInvoiceTotals, formatCents } from "@/shared/lib/resources/invoice-builder";
import {
  JOB_PROFITABILITY_DEFAULTS,
  calculateJobProfitability,
} from "@/shared/lib/resources/job-profitability";
import { LABOR_RATE_DEFAULTS, calculateLaborRate } from "@/shared/lib/resources/labor-rate";
import { NEW_HIRE_DEFAULTS, calculateNewHire } from "@/shared/lib/resources/new-hire";
import { SERVICE_CALL_FEE_DEFAULTS, calculateServiceCallFee } from "@/shared/lib/resources/service-call-fee";
import {
  MAINTENANCE_AGREEMENT_DEFAULTS,
  calculateMaintenanceAgreement,
} from "@/shared/lib/resources/maintenance-agreement";
import { TECHNICIAN_PAY_DEFAULTS, calculateTechnicianPay } from "@/shared/lib/resources/technician-pay";
import { TRUCK_COST_DEFAULTS, calculateTruckCost } from "@/shared/lib/resources/truck-cost";

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
const SERVICE_CALL = calculateServiceCallFee(SERVICE_CALL_FEE_DEFAULTS)!;
const NEW_HIRE = calculateNewHire(NEW_HIRE_DEFAULTS)!;
const TRUCK = calculateTruckCost(TRUCK_COST_DEFAULTS)!;
const FLAT_RATE_LINES = FLAT_RATE_SAMPLE_TASKS.slice(0, 3).map((task) => ({
  description: task.name,
  amount: usd0(priceListLine(task, FLAT_RATE_SAMPLE_RATE, FLAT_RATE_SAMPLE_AFTER_HOURS, "dollar").standard),
}));

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
    id: "flat-rate-price-list",
    title: "Flat-rate price list builder",
    shortTitle: "Flat-rate price list",
    href: RESOURCES_FLAT_RATE_PATH,
    job: "price",
    solves: "What should each common repair cost, as one price the customer hears up front?",
    youGet: "A price per task from your own labor rate, with after-hours prices, printed as a sheet for the truck.",
    minutes: 10,
    inputs: null,
    workspace: false,
    preview: {
      kind: "invoice",
      lines: FLAT_RATE_LINES,
      total: `at $${FLAT_RATE_SAMPLE_RATE}/hr`,
    },
  },
  {
    id: "service-call-fee",
    title: "HVAC service call fee calculator",
    shortTitle: "Service call fee",
    href: calculatorPath("service-call-fee"),
    job: "price",
    solves: "What should a service call cost, and is my fee losing money?",
    youGet: "The fee at your rate, the cost floor, and what a low or free call costs a year.",
    minutes: 2,
    inputs: Object.keys(SERVICE_CALL_FEE_DEFAULTS).length,
    workspace: false,
    preview: {
      kind: "figure",
      figure: usd0(SERVICE_CALL.feeAtRate),
      unit: "fee at your rate",
      detail: `A ${usd0(SERVICE_CALL_FEE_DEFAULTS.currentFee)} fee loses ${usd0(SERVICE_CALL.lostPerYear)} a year`,
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
    id: "hiring-a-technician",
    title: "Hiring calculator",
    shortTitle: "Hiring a technician",
    href: calculatorPath("hiring-a-technician"),
    job: "team",
    solves: "Can I afford another technician, and how many hours do they have to bill?",
    youGet: "The billed hours that pay for the hire, what is left once busy, and the cash the first weeks take.",
    minutes: 3,
    inputs: Object.keys(NEW_HIRE_DEFAULTS).length,
    workspace: false,
    preview: {
      kind: "figure",
      figure: `${NEW_HIRE.breakEvenHoursPerWeek.toFixed(1)} hrs`,
      unit: "billed a week to pay for the hire",
      detail: `Costs ${usd0(NEW_HIRE.monthlyCost)} a month`,
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
    id: "truck-cost",
    title: "Service truck cost calculator",
    shortTitle: "Truck cost",
    href: calculatorPath("truck-cost"),
    job: "plan",
    solves: "What does one truck cost me a day, and is my rate covering it?",
    youGet: "The cost per working day, per billed hour and per job, and what a parked day still costs.",
    minutes: 3,
    inputs: Object.keys(TRUCK_COST_DEFAULTS).length,
    workspace: false,
    preview: {
      kind: "figure",
      figure: usd(TRUCK.perWorkingDay),
      unit: "every working day",
      detail: `${usd(TRUCK.perBilledHour ?? 0)} of every billed hour`,
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

/**
 * "New in the tools": what changed lately, newest first, shown on the free
 * tools page so a returning owner sees there is something new to open.
 *
 * Copy rule: one line saying what the visitor can now do, dated the day it
 * went live. Add to the top; the page shows the first three. Nothing goes
 * here before it is live.
 */
export const TOOL_UPDATES: readonly { readonly iso: string; readonly label: string; readonly text: string; readonly href: string }[] = [
  {
    iso: "2026-11-27",
    label: "Nov 27",
    text: "New: the flat-rate price list builder. One price per task from your own labor rate, printed as a sheet for the truck.",
    href: "/resources/flat-rate-price-list",
  },
  {
    iso: "2026-11-27",
    label: "Nov 27",
    text: "New: the truck cost calculator. What one service truck costs per day, per billed hour and per job.",
    href: "/resources/calculators/truck-cost",
  },
  {
    iso: "2026-11-27",
    label: "Nov 27",
    text: "New: the hiring calculator. What another technician costs a month, and the billed hours a week that pay for them.",
    href: "/resources/calculators/hiring-a-technician",
  },
  {
    iso: "2026-11-27",
    label: "Nov 27",
    text: "New: the service call fee calculator. What to charge at the door, and what a low or free call costs a year.",
    href: "/resources/calculators/service-call-fee",
  },
  {
    iso: "2026-11-27",
    label: "Nov 27",
    text: "The labor rate calculator now tells you where the rate you charge today stands, and what the gap is worth in a year.",
    href: LABOR_WORKSPACE_PATH,
  },
  {
    iso: "2026-11-27",
    label: "Nov 27",
    text: "Every box in every calculator says which report, pay stub or bill has the number.",
    href: "/resources/calculators",
  },
  {
    iso: "2026-11-25",
    label: "Nov 25",
    text: "Utah HVAC labor rates: what technicians earn in each area, and what a shop there has to charge.",
    href: "/utah/hvac-labor-rates",
  },
];

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
