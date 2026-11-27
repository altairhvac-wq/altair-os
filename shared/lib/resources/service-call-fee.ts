/**
 * Service call fee — the pure math behind /resources/calculators/service-call-fee.
 *
 * No React, no imports: the verifier (`scripts/verify-resource-center.mjs`)
 * loads this module directly and drives it with the worked example.
 *
 * ============ THE MODEL ============
 * A service call fee (trip charge, diagnostic fee) pays for getting a
 * technician to the door and finding the problem. The visit costs the same
 * whether or not a repair follows, so the fee is checked against two lines:
 *
 *   fee at your rate   = hours the fee covers x billable rate
 *   cost floor         = hours the fee covers x cost per billable hour
 *
 * Charge the first and the visit earns the target margin. Charge less than
 * the second and every visit that ends without a repair loses money:
 *
 *   short of cost per visit = cost floor - fee            (when the fee is under the floor)
 *   visits with no repair   = calls per month x share that end with no repair
 *   lost per month          = visits with no repair x short of cost per visit
 *   lost per year           = lost per month x 12
 *
 * ============ WHAT IS NOT COUNTED ============
 * Calls that do turn into a repair are left out of the loss: the repair's own
 * price can make up a low fee, and whether it does is the job profitability
 * calculator's question. So "lost per month" is the floor of the damage, not
 * the whole of it.
 *
 * "Cost per billable hour" and "billable rate" are the same two figures the
 * labor rate calculator produces.
 */

export type ServiceCallFeeInput = {
  /** What one billed hour is quoted at, dollars. */
  billableRate: number;
  /** Cost of one billable hour: labor, burden, unbillable time and overhead. */
  costPerBillableHour: number;
  /** Hours the fee pays for: the trip and the diagnosis. */
  hoursCovered: number;
  /** The fee charged or advertised today, dollars. 0 is a free service call. */
  currentFee: number;
  /** Service calls run in a month. */
  callsPerMonth: number;
  /** Share of those calls that end with no repair, 0 to 100. */
  noRepairPercent: number;
};

export type ServiceCallFeeStatus = "below-cost" | "below-rate" | "at-rate";

export type ServiceCallFeeResult = {
  feeAtRate: number;
  costFloor: number;
  status: ServiceCallFeeStatus;
  /** Dollars the fee is under the cost floor on one visit; 0 when it covers cost. */
  shortOfCostPerVisit: number;
  /** Dollars the fee is under the fee at your rate; 0 when it is at or above it. */
  shortOfRatePerVisit: number;
  noRepairVisitsPerMonth: number;
  lostPerMonth: number;
  lostPerYear: number;
};

/** The article's example: a $121 rate, $96.15 an hour of cost, a one-hour fee advertised at $49. */
export const SERVICE_CALL_FEE_DEFAULTS: ServiceCallFeeInput = {
  billableRate: 121,
  costPerBillableHour: 96.15,
  hoursCovered: 1,
  currentFee: 49,
  callsPerMonth: 80,
  noRepairPercent: 25,
};

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function calculateServiceCallFee(input: ServiceCallFeeInput): ServiceCallFeeResult | null {
  const rate = finite(input.billableRate);
  const cost = finite(input.costPerBillableHour);
  const hours = finite(input.hoursCovered);
  const fee = Math.max(0, finite(input.currentFee));
  const calls = Math.max(0, finite(input.callsPerMonth));
  const share = Math.min(100, Math.max(0, finite(input.noRepairPercent))) / 100;

  // Without a rate, a cost and some time there is nothing to check the fee against.
  if (rate <= 0 || cost <= 0 || hours <= 0) return null;

  const feeAtRate = rate * hours;
  const costFloor = cost * hours;
  const shortOfCostPerVisit = Math.max(0, costFloor - fee);
  const shortOfRatePerVisit = Math.max(0, feeAtRate - fee);
  const noRepairVisitsPerMonth = calls * share;
  const lostPerMonth = noRepairVisitsPerMonth * shortOfCostPerVisit;

  return {
    feeAtRate,
    costFloor,
    status: fee < costFloor ? "below-cost" : fee < feeAtRate ? "below-rate" : "at-rate",
    shortOfCostPerVisit,
    shortOfRatePerVisit,
    noRepairVisitsPerMonth,
    lostPerMonth,
    lostPerYear: lostPerMonth * 12,
  };
}
