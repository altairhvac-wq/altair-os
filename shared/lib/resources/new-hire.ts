/**
 * Hiring a technician — the pure math behind /resources/calculators/hiring-a-technician.
 *
 * No React, no imports: the verifier (`scripts/verify-resource-center.mjs`)
 * loads this module directly and drives it with the worked example.
 *
 * ============ THE QUESTION ============
 * "Can I afford another technician?" comes down to one number: how many
 * hours a week the new technician has to bill before the hire pays for
 * itself. Everything else follows from it.
 *
 *   weekly cost          = wage x (1 + payroll costs) x paid hours + truck and tools per month x 12 / 52
 *   break-even hours     = weekly cost / billable rate
 *   weekly revenue       = billed hours x billable rate
 *   left over per month  = (weekly revenue - weekly cost) x 52 / 12
 *
 * ============ THE FIRST WEEKS ============
 * A new technician does not bill a full week on day one. The model assumes
 * billing grows evenly from nothing to the expected hours over the ramp
 * weeks: in week w of N the technician bills w/N of the expected hours.
 * "Cash to carry the hire" is the sum of the weeks that cost more than they
 * bring in. With no ramp (0 weeks) it is 0.
 *
 * ============ WHAT IS NOT COUNTED ============
 * Only what the hire adds. The shop's existing overhead is already being
 * paid by the technicians it has, so it is left out; extra office time the
 * hire needs can be added to "truck and tools". Parts margin on the jobs the
 * new technician runs is left out too, so the real result is usually a
 * little better than the one shown. Hiring costs (ads, training days, a
 * second set of tools up front) are not in the weekly figure.
 */

export type NewHireInput = {
  /** Base hourly wage offered, dollars. */
  hourlyWage: number;
  /** Payroll taxes, workers' comp, insurance and benefits, as a percent of the wage. */
  burdenPercent: number;
  /** Hours a week the technician is paid for. */
  paidHoursPerWeek: number;
  /** Truck payment, fuel, insurance, tools and phone for this technician, dollars a month. */
  truckPerMonth: number;
  /** What one billed hour is quoted at, dollars. */
  billableRate: number;
  /** Hours a week the technician is expected to bill once busy. */
  billedHoursPerWeek: number;
  /** Weeks until the technician is billing that much. 0 means from the first week. */
  rampWeeks: number;
};

export type NewHireResult = {
  weeklyCost: number;
  monthlyCost: number;
  yearlyCost: number;
  /** Billed hours a week at which the hire costs nothing. */
  breakEvenHoursPerWeek: number;
  /** Break-even hours as a share of paid hours. */
  breakEvenShare: number;
  weeklyRevenue: number;
  /** What is left after the hire's own cost, once busy. Negative when the hire loses money. */
  monthlyLeftOver: number;
  yearlyLeftOver: number;
  /** True when the expected billed hours cover the hire. */
  pays: boolean;
  /** Sum of the ramp weeks that cost more than they bring in. */
  cashToCarry: number;
  /** First ramp week that brings in at least what it costs; null when none does, or there is no ramp. */
  firstWeekInTheBlack: number | null;
};

/** A $28 technician with a truck, a $121 rate, 28 billed hours a week after an eight-week ramp. Sample values. */
export const NEW_HIRE_DEFAULTS: NewHireInput = {
  hourlyWage: 28,
  burdenPercent: 25,
  paidHoursPerWeek: 40,
  truckPerMonth: 1200,
  billableRate: 121,
  billedHoursPerWeek: 28,
  rampWeeks: 8,
};

const WEEKS_PER_YEAR = 52;
const MAX_RAMP_WEEKS = 52;

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function calculateNewHire(input: NewHireInput): NewHireResult | null {
  const wage = finite(input.hourlyWage);
  const burden = Math.max(0, finite(input.burdenPercent)) / 100;
  const paid = finite(input.paidHoursPerWeek);
  const truck = Math.max(0, finite(input.truckPerMonth));
  const rate = finite(input.billableRate);
  const billed = Math.max(0, finite(input.billedHoursPerWeek));
  const ramp = Math.min(MAX_RAMP_WEEKS, Math.max(0, Math.round(finite(input.rampWeeks))));

  // No wage, no hours or no rate: nothing to weigh. Billing more hours than are paid is a typing mistake.
  if (wage <= 0 || paid <= 0 || rate <= 0 || billed > paid) return null;

  const weeklyCost = wage * (1 + burden) * paid + (truck * 12) / WEEKS_PER_YEAR;
  const weeklyRevenue = billed * rate;
  const weeklyLeftOver = weeklyRevenue - weeklyCost;

  let cashToCarry = 0;
  let firstWeekInTheBlack: number | null = null;
  for (let week = 1; week <= ramp; week += 1) {
    const result = (weeklyRevenue * week) / ramp - weeklyCost;
    if (result < 0) cashToCarry -= result;
    else if (firstWeekInTheBlack === null) firstWeekInTheBlack = week;
  }

  return {
    weeklyCost,
    monthlyCost: (weeklyCost * WEEKS_PER_YEAR) / 12,
    yearlyCost: weeklyCost * WEEKS_PER_YEAR,
    breakEvenHoursPerWeek: weeklyCost / rate,
    breakEvenShare: weeklyCost / rate / paid,
    weeklyRevenue,
    monthlyLeftOver: (weeklyLeftOver * WEEKS_PER_YEAR) / 12,
    yearlyLeftOver: weeklyLeftOver * WEEKS_PER_YEAR,
    pays: weeklyLeftOver >= 0,
    cashToCarry,
    firstWeekInTheBlack,
  };
}
