/**
 * Job profitability — the pure math behind
 * /resources/calculators/job-profitability.
 *
 *   direct cost    = labor hours x loaded labor rate + materials + subcontract
 *   gross profit   = revenue - direct cost
 *   gross margin   = gross profit / revenue
 *   overhead       = revenue x overhead allocation %
 *   net profit     = gross profit - overhead
 *   net margin     = net profit / revenue
 *
 * Overhead is allocated as a percentage of revenue because that is the
 * number most small shops have (total overhead / total sales for the year).
 * A shop that allocates overhead per labor hour instead can use the labor
 * rate calculator and enter a fully loaded rate here with 0% overhead.
 */

export type JobProfitabilityInput = {
  revenue: number;
  laborHours: number;
  /** Fully loaded hourly labor cost (wage + burden), dollars. */
  loadedLaborRate: number;
  materialsCost: number;
  subcontractCost: number;
  /** Overhead allocated to the job as a fraction of revenue (0.25 = 25%). */
  overheadAllocationRate: number;
};

export type JobProfitabilityResult = {
  laborCost: number;
  directCost: number;
  grossProfit: number;
  /** Fraction of revenue; null when revenue is zero. */
  grossMargin: number | null;
  overheadAllocated: number;
  netProfit: number;
  netMargin: number | null;
};

export const JOB_PROFITABILITY_DEFAULTS: JobProfitabilityInput = {
  revenue: 2500,
  laborHours: 6,
  loadedLaborRate: 45,
  materialsCost: 900,
  subcontractCost: 0,
  overheadAllocationRate: 0.25,
};

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function calculateJobProfitability(
  input: JobProfitabilityInput,
): JobProfitabilityResult {
  const revenue = Math.max(0, finite(input.revenue));
  const laborHours = Math.max(0, finite(input.laborHours));
  const loadedRate = Math.max(0, finite(input.loadedLaborRate));
  const materials = Math.max(0, finite(input.materialsCost));
  const subcontract = Math.max(0, finite(input.subcontractCost));
  const overheadRate = Math.max(0, finite(input.overheadAllocationRate));

  const laborCost = laborHours * loadedRate;
  const directCost = laborCost + materials + subcontract;
  const grossProfit = revenue - directCost;
  const overheadAllocated = revenue * overheadRate;
  const netProfit = grossProfit - overheadAllocated;

  return {
    laborCost,
    directCost,
    grossProfit,
    grossMargin: revenue > 0 ? grossProfit / revenue : null,
    overheadAllocated,
    netProfit,
    netMargin: revenue > 0 ? netProfit / revenue : null,
  };
}
