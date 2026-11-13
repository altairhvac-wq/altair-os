/**
 * One calculator result as plain text lines: a headline and the working.
 *
 * ============ WHY THIS EXISTS ============
 * "Email me my results" (lib/resources/results-email.ts) has to state the
 * result in an email. The browser already knows the result, but the server
 * must not trust a result it is handed: an email that repeats whatever number
 * arrived in a request is a way to make Altair send someone a made-up figure.
 * So the request carries only the INPUTS, and the server recomputes the result
 * here with the same pure functions the page uses.
 *
 * The three newer calculators also render from these summaries, so their page
 * and their email cannot disagree.
 *
 * Pure: relative imports only, so the verifier can load it directly.
 */
import { calculateBreakEven } from "./break-even";
import { calculateCallbackCost } from "./callback-cost";
import type { ResourceCalculatorEntry } from "./catalog";
import { calculateJobProfitability } from "./job-profitability";
import { calculateLaborRate } from "./labor-rate";
import { calculateMaintenanceAgreement } from "./maintenance-agreement";
import { calculateTechnicianPay, type PayPlan } from "./technician-pay";

export type CalculatorSlug = ResourceCalculatorEntry["slug"];

export type SummaryLine = { label: string; value: string; emphasis?: boolean };

export type CalculatorSummary = {
  headlineLabel: string;
  headlineValue: string;
  headlineNote?: string;
  lines: SummaryLine[];
};

/** The input keys each calculator's form uses, in the order the form shows them. */
export const CALCULATOR_FIELD_KEYS: Record<CalculatorSlug, readonly string[]> = {
  "labor-rate": [
    "hourlyWage",
    "burdenPercent",
    "billableHoursPerWeek",
    "nonBillableHoursPerWeek",
    "monthlyOverhead",
    "targetMarginPercent",
  ],
  "job-profitability": [
    "revenue",
    "laborHours",
    "loadedLaborRate",
    "materialsCost",
    "subcontractCost",
    "overheadPercent",
  ],
  "break-even": ["fixedMonthlyCosts", "averageJobRevenue", "variableCostPercent"],
  "maintenance-agreement": [
    "visitsPerYear",
    "hoursPerVisit",
    "costPerBillableHour",
    "materialsPerVisit",
    "officeCostPerYear",
    "expectedRepairSpendPerYear",
    "repairDiscountPercent",
    "targetMarginPercent",
  ],
  "technician-pay": [
    "hourlyWage",
    "hoursOnClock",
    "bookHours",
    "payPerBookHour",
    "revenueProduced",
    "commissionPercent",
  ],
  "callback-cost": [
    "callbacksPerMonth",
    "jobsPerMonth",
    "hoursPerCallback",
    "costPerBillableHour",
    "partsPerCallback",
    "billableRate",
  ],
};

/** A number as typed into a field: digits with an optional decimal part. */
const VALUE_PATTERN = /^-?\d{1,9}(\.\d{0,4})?$/;

/**
 * Keeps only this calculator's own keys, and only number-shaped values. The
 * request body and the page's query string are both read through this, so
 * neither can carry anything but numbers.
 */
export function pickCalculatorValues(
  slug: CalculatorSlug,
  source: Record<string, unknown>,
): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const key of CALCULATOR_FIELD_KEYS[slug]) {
    const value = source[key];
    if (typeof value !== "string" || !VALUE_PATTERN.test(value)) return null;
    out[key] = value;
  }
  return out;
}

const currencyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const usd = (value: number) => currencyFormat.format(value);
const pct = (fraction: number | null) =>
  fraction === null || !Number.isFinite(fraction) ? "—" : `${(fraction * 100).toFixed(1)}%`;
const num = (raw: string) => {
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
};

const PLAN_NAMES: Record<PayPlan, string> = {
  hourly: "Hourly",
  "flat-rate": "Flat rate",
  commission: "Commission",
};

/** The result for these inputs, or null when the inputs have no answer. */
export function summarizeCalculator(
  slug: CalculatorSlug,
  values: Record<string, string>,
): CalculatorSummary | null {
  switch (slug) {
    case "labor-rate": {
      const r = calculateLaborRate({
        hourlyWage: num(values.hourlyWage),
        burdenRate: num(values.burdenPercent) / 100,
        billableHoursPerWeek: num(values.billableHoursPerWeek),
        nonBillableHoursPerWeek: num(values.nonBillableHoursPerWeek),
        monthlyOverhead: num(values.monthlyOverhead),
        targetNetMargin: num(values.targetMarginPercent) / 100,
      });
      if (!r) return null;
      return {
        headlineLabel: "Billable hourly rate",
        headlineValue: usd(r.billableHourlyRate),
        headlineNote: `About ${usd(r.billableHourlyRateRounded)} rounded up to the next dollar.`,
        lines: [
          { label: "Loaded hourly cost", value: usd(r.loadedHourlyCost) },
          { label: "Paid hours per week", value: r.paidHoursPerWeek.toFixed(1) },
          { label: "Weekly labor cost", value: usd(r.weeklyLaborCost) },
          { label: "Weekly overhead", value: usd(r.weeklyOverhead) },
          { label: "Cost per billable hour", value: usd(r.costPerBillableHour), emphasis: true },
        ],
      };
    }
    case "job-profitability": {
      const revenue = num(values.revenue);
      if (revenue <= 0) return null;
      const r = calculateJobProfitability({
        revenue,
        laborHours: num(values.laborHours),
        loadedLaborRate: num(values.loadedLaborRate),
        materialsCost: num(values.materialsCost),
        subcontractCost: num(values.subcontractCost),
        overheadAllocationRate: num(values.overheadPercent) / 100,
      });
      return {
        headlineLabel: "Net profit on this job",
        headlineValue: usd(r.netProfit),
        headlineNote: `Net margin ${pct(r.netMargin)}`,
        lines: [
          { label: "Labor cost", value: usd(r.laborCost) },
          { label: "Direct cost (labor + materials + sub)", value: usd(r.directCost) },
          { label: "Gross profit", value: usd(r.grossProfit), emphasis: true },
          { label: "Gross margin", value: pct(r.grossMargin) },
          { label: "Overhead allocated", value: usd(r.overheadAllocated) },
          { label: "Net margin", value: pct(r.netMargin) },
        ],
      };
    }
    case "break-even": {
      const r = calculateBreakEven({
        fixedMonthlyCosts: num(values.fixedMonthlyCosts),
        averageJobRevenue: num(values.averageJobRevenue),
        variableCostRate: num(values.variableCostPercent) / 100,
      });
      if (!r) return null;
      return {
        headlineLabel: "Break-even jobs per month",
        headlineValue: String(r.breakEvenJobs),
        headlineNote: `${r.breakEvenJobsExact.toFixed(1)} jobs exactly, rounded up. About ${r.breakEvenJobsPerWeek.toFixed(1)} per week.`,
        lines: [
          { label: "Break-even revenue per month", value: usd(r.breakEvenRevenue), emphasis: true },
          { label: "Contribution per job", value: usd(r.contributionPerJob) },
          { label: "Contribution margin", value: pct(r.contributionMarginRate) },
        ],
      };
    }
    case "maintenance-agreement": {
      const r = calculateMaintenanceAgreement({
        visitsPerYear: num(values.visitsPerYear),
        hoursPerVisit: num(values.hoursPerVisit),
        costPerBillableHour: num(values.costPerBillableHour),
        materialsPerVisit: num(values.materialsPerVisit),
        officeCostPerYear: num(values.officeCostPerYear),
        expectedRepairSpendPerYear: num(values.expectedRepairSpendPerYear),
        repairDiscountRate: num(values.repairDiscountPercent) / 100,
        targetNetMargin: num(values.targetMarginPercent) / 100,
      });
      if (!r) return null;
      return {
        headlineLabel: "Agreement price per month",
        headlineValue: usd(r.monthlyPrice),
        headlineNote: `${usd(r.annualPrice)} a year.`,
        lines: [
          { label: "Cost per visit", value: usd(r.costPerVisit) },
          { label: "Visits per year, at cost", value: usd(r.visitCostPerYear) },
          { label: "Repair discount given", value: usd(r.repairDiscountGiven) },
          { label: "Cost to serve per year", value: usd(r.costToServePerYear), emphasis: true },
          { label: "Left per agreement per year", value: usd(r.profitPerAgreement) },
        ],
      };
    }
    case "technician-pay": {
      const r = calculateTechnicianPay({
        hourlyWage: num(values.hourlyWage),
        hoursOnClock: num(values.hoursOnClock),
        bookHours: num(values.bookHours),
        payPerBookHour: num(values.payPerBookHour),
        revenueProduced: num(values.revenueProduced),
        commissionRate: num(values.commissionPercent) / 100,
      });
      if (!r) return null;
      const perHour = (plan: PayPlan) => {
        const value = r.effectiveHourly[plan];
        return value === null ? "" : ` (${usd(value)}/hr)`;
      };
      const pay: Record<PayPlan, number> = {
        hourly: r.hourlyPay,
        "flat-rate": r.flatRatePay,
        commission: r.commissionPay,
      };
      return {
        headlineLabel: "Highest pay this week",
        headlineValue: `${PLAN_NAMES[r.highest]}: ${usd(pay[r.highest])}`,
        headlineNote:
          r.overtimeHours > 0
            ? `Hourly includes ${r.overtimeHours.toFixed(1)} overtime hours at time and a half. Per-hour figures are per hour on the clock.`
            : "No overtime hours this week. Per-hour figures are per hour on the clock.",
        lines: [
          { label: "Hourly", value: `${usd(r.hourlyPay)}${perHour("hourly")}`, emphasis: r.highest === "hourly" },
          {
            label: "Flat rate",
            value: `${usd(r.flatRatePay)}${perHour("flat-rate")}`,
            emphasis: r.highest === "flat-rate",
          },
          {
            label: "Commission",
            value: `${usd(r.commissionPay)}${perHour("commission")}`,
            emphasis: r.highest === "commission",
          },
          {
            label: "Book hours for flat rate to match hourly",
            value: r.bookHoursToMatchHourly === null ? "—" : r.bookHoursToMatchHourly.toFixed(1),
          },
          {
            label: "Revenue for commission to match hourly",
            value: r.revenueToMatchHourly === null ? "—" : usd(r.revenueToMatchHourly),
          },
        ],
      };
    }
    case "callback-cost": {
      const r = calculateCallbackCost({
        callbacksPerMonth: num(values.callbacksPerMonth),
        jobsPerMonth: num(values.jobsPerMonth),
        hoursPerCallback: num(values.hoursPerCallback),
        costPerBillableHour: num(values.costPerBillableHour),
        partsPerCallback: num(values.partsPerCallback),
        billableRate: num(values.billableRate),
      });
      if (!r) return null;
      return {
        headlineLabel: "Callbacks cost per month",
        headlineValue: usd(r.costPerMonth),
        headlineNote: `${usd(r.costPerYear)} a year at this pace.`,
        lines: [
          { label: "Callback rate", value: pct(r.callbackRate), emphasis: true },
          { label: "Cost per callback", value: usd(r.costPerCallback) },
          { label: "Technician hours lost per month", value: r.hoursLostPerMonth.toFixed(1) },
          { label: "Revenue those hours would bill", value: usd(r.revenueNotBilledPerMonth) },
        ],
      };
    }
  }
}
