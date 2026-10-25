/**
 * Break-even — the pure math behind /resources/calculators/break-even.
 *
 *   contribution per job  = average job revenue x (1 - variable cost %)
 *   break-even jobs       = fixed monthly costs / contribution per job
 *   break-even revenue    = fixed monthly costs / (1 - variable cost %)
 *
 * "Fixed" means costs that arrive whether or not a truck rolls (rent,
 * insurance, office salaries, software, loan payments). "Variable" means
 * costs that scale with each job (parts, field labor paid per job, permits,
 * card fees). Jobs are shown both as the exact figure and rounded up, since
 * nobody completes 0.6 of a job.
 */

export type BreakEvenInput = {
  fixedMonthlyCosts: number;
  averageJobRevenue: number;
  /** Variable cost as a fraction of revenue (0.35 = 35%). */
  variableCostRate: number;
};

export type BreakEvenResult = {
  contributionPerJob: number;
  /** Contribution margin as a fraction of revenue. */
  contributionMarginRate: number;
  breakEvenJobsExact: number;
  breakEvenJobs: number;
  breakEvenRevenue: number;
  /** Jobs per week, using the same 52-week / 12-month year as the other tools. */
  breakEvenJobsPerWeek: number;
};

export const BREAK_EVEN_DEFAULTS: BreakEvenInput = {
  fixedMonthlyCosts: 18000,
  averageJobRevenue: 650,
  variableCostRate: 0.35,
};

const WEEKS_PER_MONTH = 52 / 12;

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function calculateBreakEven(input: BreakEvenInput): BreakEvenResult | null {
  const fixed = Math.max(0, finite(input.fixedMonthlyCosts));
  const avgRevenue = finite(input.averageJobRevenue);
  const variableRate = finite(input.variableCostRate);

  // A job that brings in nothing, or costs as much as it earns, never breaks
  // even; the page shows a hint instead of a number.
  if (avgRevenue <= 0 || variableRate >= 1 || variableRate < 0) return null;

  const contributionMarginRate = 1 - variableRate;
  const contributionPerJob = avgRevenue * contributionMarginRate;
  const breakEvenJobsExact = fixed / contributionPerJob;

  return {
    contributionPerJob,
    contributionMarginRate,
    breakEvenJobsExact,
    breakEvenJobs: Math.ceil(breakEvenJobsExact),
    breakEvenRevenue: fixed / contributionMarginRate,
    breakEvenJobsPerWeek: breakEvenJobsExact / WEEKS_PER_MONTH,
  };
}
