/**
 * Technician pay compared — the pure math behind
 * /resources/calculators/technician-pay.
 *
 * No React, no imports: the verifier (`scripts/verify-resource-center.mjs`)
 * loads this module directly and drives it with the worked example.
 *
 * ============ THE MODEL ============
 * The same week of work, paid three ways:
 *
 *   hourly pay       = wage x regular hours + wage x 1.5 x overtime hours
 *                      (regular = up to 40 hours on the clock; overtime = the rest)
 *   flat-rate pay    = book hours turned x pay per book hour
 *   commission pay   = revenue produced x commission rate
 *
 *   effective hourly = pay / hours on the clock        (for each of the three)
 *
 * and the two numbers a technician or an owner actually argues about:
 *
 *   book hours to match hourly = hourly pay / pay per book hour
 *   revenue to match hourly    = hourly pay / commission rate
 *
 * ============ WHAT THIS DOES NOT DO ============
 * It compares gross pay for one week as entered. It does not work out the
 * overtime a flat-rate or commission technician may be owed: in the United
 * States most technicians are entitled to overtime however they are paid, and
 * how it is calculated on flat-rate or commission pay depends on federal and
 * state rules. The page says so and sends the reader to their payroll
 * provider. Overtime on hourly pay uses the federal weekly standard (time and
 * a half past 40 hours); some states also count daily overtime.
 */

export const OVERTIME_THRESHOLD_HOURS = 40;
export const OVERTIME_MULTIPLIER = 1.5;

export type TechnicianPayInput = {
  /** Hourly wage, dollars. */
  hourlyWage: number;
  /** Hours on the clock in the week. */
  hoursOnClock: number;
  /** Flat-rate (book) hours turned in the week. */
  bookHours: number;
  /** Pay per book hour, dollars. */
  payPerBookHour: number;
  /** Revenue the technician produced in the week, dollars. */
  revenueProduced: number;
  /** Commission as a fraction of revenue (0.12 = 12%). */
  commissionRate: number;
};

export type PayPlan = "hourly" | "flat-rate" | "commission";

export type TechnicianPayResult = {
  regularHours: number;
  overtimeHours: number;
  hourlyPay: number;
  flatRatePay: number;
  commissionPay: number;
  /** Pay divided by hours on the clock; null when no hours were entered. */
  effectiveHourly: Record<PayPlan, number | null>;
  /** Which plan paid the most this week. Ties go to the first in this order. */
  highest: PayPlan;
  /** Book hours needed for flat rate to match the hourly pay; null with no flat rate. */
  bookHoursToMatchHourly: number | null;
  /** Revenue needed for commission to match the hourly pay; null with no commission rate. */
  revenueToMatchHourly: number | null;
};

export const TECHNICIAN_PAY_DEFAULTS: TechnicianPayInput = {
  hourlyWage: 30,
  hoursOnClock: 45,
  bookHours: 38,
  payPerBookHour: 34,
  revenueProduced: 7500,
  commissionRate: 0.12,
};

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function calculateTechnicianPay(input: TechnicianPayInput): TechnicianPayResult | null {
  const wage = Math.max(0, finite(input.hourlyWage));
  const hours = Math.max(0, finite(input.hoursOnClock));
  const bookHours = Math.max(0, finite(input.bookHours));
  const bookRate = Math.max(0, finite(input.payPerBookHour));
  const revenue = Math.max(0, finite(input.revenueProduced));
  const commissionRate = finite(input.commissionRate);

  // A week has 168 hours, and a commission above 100% pays out more than came in.
  if (hours > 168 || commissionRate < 0 || commissionRate > 1) return null;

  const regularHours = Math.min(hours, OVERTIME_THRESHOLD_HOURS);
  const overtimeHours = Math.max(0, hours - OVERTIME_THRESHOLD_HOURS);
  const hourlyPay = wage * regularHours + wage * OVERTIME_MULTIPLIER * overtimeHours;
  const flatRatePay = bookHours * bookRate;
  const commissionPay = revenue * commissionRate;

  const perHour = (pay: number) => (hours > 0 ? pay / hours : null);

  let highest: PayPlan = "hourly";
  if (flatRatePay > hourlyPay && flatRatePay >= commissionPay) highest = "flat-rate";
  else if (commissionPay > hourlyPay && commissionPay > flatRatePay) highest = "commission";

  return {
    regularHours,
    overtimeHours,
    hourlyPay,
    flatRatePay,
    commissionPay,
    effectiveHourly: {
      hourly: perHour(hourlyPay),
      "flat-rate": perHour(flatRatePay),
      commission: perHour(commissionPay),
    },
    highest,
    bookHoursToMatchHourly: bookRate > 0 ? hourlyPay / bookRate : null,
    revenueToMatchHourly: commissionRate > 0 ? hourlyPay / commissionRate : null,
  };
}
