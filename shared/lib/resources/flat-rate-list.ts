/**
 * Flat-rate price list — the pure math behind /resources/flat-rate-price-list.
 *
 * No React, no imports: the verifier (`scripts/verify-resource-center.mjs`)
 * loads this module directly.
 *
 * ============ THE MODEL ============
 * A flat-rate price is the labor and the part, worked out once, so the
 * customer hears one number:
 *
 *   labor        = book hours x labor rate
 *   part         = part cost x (1 + markup)
 *   price        = labor + part
 *   after hours  = labor x after-hours multiplier + part
 *
 * The multiplier applies to labor only: the part costs the same at midnight.
 * It is the same formula the Labor Cost Workspace's price builder uses
 * (priceFlatRateTask in labor-workspace.ts, with no service call fee).
 *
 * ============ ROUNDING ============
 * A printed price list reads better in whole dollars. Rounding always goes
 * UP to the next step ($1 or $5), never down: a price rounded down is a
 * price below what the labor and the part cost to deliver.
 */

export type PriceRounding = "exact" | "dollar" | "five";

export type PriceListTask = {
  /** Hours the task is priced at, whatever it takes on the day. */
  bookHours: number;
  /** What the part costs the shop, dollars. */
  partCost: number;
  /** Markup on the part as a percent of its cost. 100 doubles it. */
  markupPercent: number;
};

export type PriceListLine = {
  labor: number;
  part: number;
  /** Labor plus part before rounding. */
  unrounded: number;
  standard: number;
  afterHours: number;
};

const nonNegative = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

/** Rounds a price up to the list's step. Exact keeps cents. */
export function roundPriceUp(value: number, rounding: PriceRounding): number {
  const price = nonNegative(value);
  if (rounding === "exact") return Math.round(price * 100) / 100;
  const step = rounding === "five" ? 5 : 1;
  // The small allowance keeps 126.999999 (floating-point for 127) from becoming 128.
  return Math.ceil(price / step - 1e-9) * step;
}

export function priceListLine(task: PriceListTask, laborRate: number, afterHoursMultiplier: number, rounding: PriceRounding): PriceListLine {
  const labor = nonNegative(task.bookHours) * nonNegative(laborRate);
  const part = nonNegative(task.partCost) * (1 + nonNegative(task.markupPercent) / 100);
  const multiplier = Number.isFinite(afterHoursMultiplier) ? Math.max(1, afterHoursMultiplier) : 1;
  return {
    labor,
    part,
    unrounded: labor + part,
    standard: roundPriceUp(labor + part, rounding),
    afterHours: roundPriceUp(labor * multiplier + part, rounding),
  };
}

/** A markup on cost as the margin it leaves on the selling price: 100% markup is a 50% margin. */
export function markupToMargin(markupPercent: number): number {
  const markup = nonNegative(markupPercent) / 100;
  return markup / (1 + markup);
}

export type SamplePriceListTask = PriceListTask & { name: string };

/**
 * Eight common residential service tasks to start a list from. The book
 * hours and part costs are made-up samples so the list has something in it;
 * a shop's own job history and supplier prices replace them.
 */
export const FLAT_RATE_SAMPLE_TASKS: readonly SamplePriceListTask[] = [
  { name: "Replace run capacitor", bookHours: 0.75, partCost: 18, markupPercent: 100 },
  { name: "Replace contactor", bookHours: 0.5, partCost: 22, markupPercent: 100 },
  { name: "Clean condenser coil", bookHours: 1, partCost: 12, markupPercent: 100 },
  { name: "Clear condensate drain", bookHours: 0.75, partCost: 8, markupPercent: 100 },
  { name: "Replace hot surface igniter", bookHours: 0.75, partCost: 35, markupPercent: 100 },
  { name: "Replace flame sensor", bookHours: 0.5, partCost: 15, markupPercent: 100 },
  { name: "Replace condenser fan motor", bookHours: 1.5, partCost: 140, markupPercent: 60 },
  { name: "Replace thermostat", bookHours: 1, partCost: 60, markupPercent: 80 },
];

/** The sample list is priced at the labor rate calculator's worked-example rate. */
export const FLAT_RATE_SAMPLE_RATE = 121;
export const FLAT_RATE_SAMPLE_AFTER_HOURS = 1.5;
