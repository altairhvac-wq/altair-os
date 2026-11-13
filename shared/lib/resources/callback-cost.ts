/**
 * Callback cost — the pure math behind /resources/calculators/callback-cost.
 *
 * No React, no imports: the verifier (`scripts/verify-resource-center.mjs`)
 * loads this module directly and drives it with the worked example.
 *
 * ============ THE MODEL ============
 * A callback is a return trip the customer does not pay for. What it costs:
 *
 *   callback rate          = callbacks per month / jobs per month
 *   cost per callback      = hours per callback x cost per billable hour + parts per callback
 *   callback cost per month = callbacks per month x cost per callback
 *   callback cost per year  = callback cost per month x 12
 *
 * and, shown beside it rather than added to it:
 *
 *   hours lost per month   = callbacks per month x hours per callback
 *   revenue not billed     = hours lost per month x billable rate
 *
 * ============ WHY THE TWO ARE NOT ADDED TOGETHER ============
 * "Cost per billable hour" already pays for the technician's hour and the
 * overhead riding on it. "Revenue not billed" is what that same hour would
 * have brought in on a paying job. Adding them counts the hour twice. Which
 * one is the true cost depends on the shop: with a full board the hour really
 * was taken from a paying job, so the revenue figure is the loss; with open
 * time on the board the truck would have sat, and the direct cost is closer.
 * The page shows both and says this.
 *
 * "Cost per billable hour" is the same figure the labor rate calculator
 * produces.
 */

export type CallbackCostInput = {
  /** Unpaid return trips in a month. */
  callbacksPerMonth: number;
  /** All jobs completed in the same month. */
  jobsPerMonth: number;
  /** Hours per callback, including the drive. */
  hoursPerCallback: number;
  /** Cost of one billable hour: labor, burden, unbillable time and overhead. */
  costPerBillableHour: number;
  /** Parts and materials given away on a typical callback, dollars. */
  partsPerCallback: number;
  /** What the shop bills per hour, dollars. */
  billableRate: number;
};

export type CallbackCostResult = {
  /** Callbacks as a fraction of jobs; null when no jobs were entered. */
  callbackRate: number | null;
  costPerCallback: number;
  costPerMonth: number;
  costPerYear: number;
  hoursLostPerMonth: number;
  revenueNotBilledPerMonth: number;
};

export const CALLBACK_COST_DEFAULTS: CallbackCostInput = {
  callbacksPerMonth: 6,
  jobsPerMonth: 120,
  hoursPerCallback: 1.5,
  costPerBillableHour: 96,
  partsPerCallback: 25,
  billableRate: 121,
};

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function calculateCallbackCost(input: CallbackCostInput): CallbackCostResult | null {
  const callbacks = Math.max(0, finite(input.callbacksPerMonth));
  const jobs = Math.max(0, finite(input.jobsPerMonth));
  const hours = Math.max(0, finite(input.hoursPerCallback));
  const hourCost = Math.max(0, finite(input.costPerBillableHour));
  const parts = Math.max(0, finite(input.partsPerCallback));
  const rate = Math.max(0, finite(input.billableRate));

  // More callbacks than jobs means the two numbers are for different periods;
  // the page asks for them to be corrected rather than showing a rate over 100%.
  if (jobs > 0 && callbacks > jobs) return null;

  const costPerCallback = hours * hourCost + parts;
  const costPerMonth = callbacks * costPerCallback;
  const hoursLostPerMonth = callbacks * hours;

  return {
    callbackRate: jobs > 0 ? callbacks / jobs : null,
    costPerCallback,
    costPerMonth,
    costPerYear: costPerMonth * 12,
    hoursLostPerMonth,
    revenueNotBilledPerMonth: hoursLostPerMonth * rate,
  };
}
