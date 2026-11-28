/**
 * A job's profit after labor and shop costs, and the month's jobs against
 * the company's target. Both are worked out from the company's business
 * numbers (./derive.ts), so they use the same cost of an hour the owner sees
 * in Settings > Numbers and on the public calculators.
 *
 * ============ WHY A SECOND PROFIT LINE ============
 * A job's "gross profit" in the product is what the customer paid minus the
 * job's own parts and expenses. It leaves out the two biggest costs: the
 * technician's time and the shop that stands behind them. This adds them,
 * as a second line beside the first, never instead of it:
 *
 *     profit after labor and shop costs
 *       = gross profit - hours x (labor per billed hour + shop costs per billed hour)
 *
 * The hours are the job's closed labor time. They are priced at what a
 * BILLED hour costs, which already carries the paid hours nobody is billed
 * for (driving, shop time), the same way the labor rate calculator does.
 *
 * Pure: safe on the server and in the browser. Imports are relative so
 * scripts/verify-business-numbers.mjs can load this file as it is.
 */

import type { DerivedBusinessNumbers } from "./derive";

export type JobProfitAfterLabor =
  /** The company has not said what an hour costs it yet. */
  | { readonly status: "needs-numbers" }
  /** No closed labor time on the job, so there is nothing to price. */
  | { readonly status: "no-hours" }
  | {
      readonly status: "ready";
      readonly hours: number;
      /** Labor for one billed hour: wage, payroll costs and the paid time that is not billed. */
      readonly laborPerHour: number;
      /** Shop costs carried by one billed hour. */
      readonly overheadPerHour: number;
      readonly laborCost: number;
      readonly overheadCost: number;
      readonly profit: number;
      /** Percent of what the customer paid; null when nothing has been collected. */
      readonly marginPercent: number | null;
    };

function cents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function computeJobProfitAfterLabor(
  job: { readonly grossProfit: number; readonly collected: number; readonly laborHours: number },
  derived: Pick<DerivedBusinessNumbers, "laborPerBilledHour" | "overheadPerBilledHour">,
): JobProfitAfterLabor {
  if (derived.laborPerBilledHour === null || derived.overheadPerBilledHour === null) {
    return { status: "needs-numbers" };
  }
  if (!Number.isFinite(job.laborHours) || job.laborHours <= 0) {
    return { status: "no-hours" };
  }

  const laborCost = cents(job.laborHours * derived.laborPerBilledHour);
  const overheadCost = cents(job.laborHours * derived.overheadPerBilledHour);
  const profit = cents(job.grossProfit - laborCost - overheadCost);
  return {
    status: "ready",
    hours: job.laborHours,
    laborPerHour: derived.laborPerBilledHour,
    overheadPerHour: derived.overheadPerBilledHour,
    laborCost,
    overheadCost,
    profit,
    marginPercent: job.collected > 0 ? Math.round((profit / job.collected) * 1000) / 10 : null,
  };
}

export type MonthlyTargetProgress = {
  /** Jobs finished so far this month. */
  readonly done: number;
  /** Jobs that cover the month's shop costs. */
  readonly target: number;
  /** How many are still needed; 0 once the target is met. */
  readonly remaining: number;
  /** 0 to 100, for a bar. */
  readonly percent: number;
  readonly met: boolean;
};

/** This month's finished jobs against the break-even target. Null when the company has no target. */
export function computeMonthlyTargetProgress(jobsDoneThisMonth: number, breakEvenJobs: number | null): MonthlyTargetProgress | null {
  if (breakEvenJobs === null || !Number.isFinite(breakEvenJobs) || breakEvenJobs <= 0) return null;
  const done = Number.isFinite(jobsDoneThisMonth) && jobsDoneThisMonth > 0 ? Math.floor(jobsDoneThisMonth) : 0;
  const remaining = Math.max(0, breakEvenJobs - done);
  return {
    done,
    target: breakEvenJobs,
    remaining,
    percent: Math.min(100, Math.round((done / breakEvenJobs) * 100)),
    met: remaining === 0,
  };
}
