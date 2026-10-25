/**
 * Billable labor rate — the pure math behind /resources/calculators/labor-rate.
 *
 * No React, no imports: the verifier (`scripts/verify-resource-center.mjs`)
 * loads this module directly and drives it with a worked example, so the
 * numbers the page shows are the numbers the test proves.
 *
 * ============ THE MODEL ============
 * A technician costs more than the wage on the pay stub (payroll taxes,
 * insurance, benefits = burden), is paid for hours nobody can bill (drive
 * time, shop time, training), and has to carry a share of the office. All of
 * that cost is recovered only through the hours that ARE billed, and the
 * business still needs to keep a margin on top.
 *
 *   loaded hourly cost      = wage x (1 + burden)
 *   weekly labor cost       = loaded hourly cost x (billable + non-billable hours)
 *   weekly overhead         = monthly overhead x 12 / 52
 *   cost per billable hour  = (weekly labor cost + weekly overhead) / billable hours
 *   billable rate           = cost per billable hour / (1 - target net margin)
 *
 * This is one common way to build a rate, not the only one. Every input is
 * an estimate the owner supplies; the page says so and sends them to their
 * accountant.
 */

export type LaborRateInput = {
  /** Technician base wage, dollars per hour. */
  hourlyWage: number;
  /** Payroll taxes, insurance and benefits as a fraction of wage (0.25 = 25%). */
  burdenRate: number;
  /** Paid hours per week that cannot be billed to a customer. */
  nonBillableHoursPerWeek: number;
  /** Hours per week actually billed to customers. */
  billableHoursPerWeek: number;
  /** Monthly overhead allocated to this technician, dollars. */
  monthlyOverhead: number;
  /** Desired net margin on the billed rate as a fraction (0.2 = 20%). */
  targetNetMargin: number;
};

export type LaborRateResult = {
  loadedHourlyCost: number;
  paidHoursPerWeek: number;
  weeklyLaborCost: number;
  weeklyOverhead: number;
  weeklyTotalCost: number;
  costPerBillableHour: number;
  billableHourlyRate: number;
  /** Rate rounded up to the next whole dollar, the number most shops quote. */
  billableHourlyRateRounded: number;
};

export const LABOR_RATE_DEFAULTS: LaborRateInput = {
  hourlyWage: 30,
  burdenRate: 0.25,
  nonBillableHoursPerWeek: 10,
  billableHoursPerWeek: 30,
  monthlyOverhead: 6000,
  targetNetMargin: 0.2,
};

const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function calculateLaborRate(input: LaborRateInput): LaborRateResult | null {
  const wage = Math.max(0, finite(input.hourlyWage));
  const burden = Math.max(0, finite(input.burdenRate));
  const nonBillable = Math.max(0, finite(input.nonBillableHoursPerWeek));
  const billable = finite(input.billableHoursPerWeek);
  const overhead = Math.max(0, finite(input.monthlyOverhead));
  const margin = finite(input.targetNetMargin);

  // No billable hours means nothing to spread the cost over; a margin of
  // 100% or more has no finite rate. Both are "fix your inputs", not a number.
  if (billable <= 0 || margin >= 1 || margin < 0) return null;

  const loadedHourlyCost = wage * (1 + burden);
  const paidHoursPerWeek = billable + nonBillable;
  const weeklyLaborCost = loadedHourlyCost * paidHoursPerWeek;
  const weeklyOverhead = (overhead * MONTHS_PER_YEAR) / WEEKS_PER_YEAR;
  const weeklyTotalCost = weeklyLaborCost + weeklyOverhead;
  const costPerBillableHour = weeklyTotalCost / billable;
  const billableHourlyRate = costPerBillableHour / (1 - margin);

  return {
    loadedHourlyCost,
    paidHoursPerWeek,
    weeklyLaborCost,
    weeklyOverhead,
    weeklyTotalCost,
    costPerBillableHour,
    billableHourlyRate,
    billableHourlyRateRounded: Math.ceil(billableHourlyRate),
  };
}
