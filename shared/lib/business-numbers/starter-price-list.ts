/**
 * The price list a new company starts from in the guided setup, and how each
 * line on it is priced.
 *
 * ============ ONE FORMULA ============
 * A line's price is the public flat-rate price list's formula, called, not
 * copied: priceListLine() from shared/lib/resources/flat-rate-list.ts.
 *
 *     price = book hours x labor rate + part cost x (1 + markup)
 *
 * rounded up to the next whole dollar. The after-hours price multiplies the
 * labor part only.
 *
 * ============ THE LISTS ============
 * HVAC gets the ten common repairs below; their hours and part costs are the
 * website's own examples, there to be corrected, not trusted. Every other
 * trade gets a short list by size of job, because a list of somebody else's
 * trade would be worse than none.
 *
 * Each task has a stable `key`. It is stored on the price book item
 * (service_items.setup_key, migration 219) so that running the setup again
 * updates that item and does not make a second one. Keys are never renamed.
 *
 * Pure: safe on the server and in the browser. Imports are relative so
 * scripts/verify-business-numbers.mjs can load this file as it is.
 */

import { priceListLine, type PriceListLine } from "../resources/flat-rate-list";

export type StarterTask = {
  /** Stable name for the price book item this becomes. Lower case, digits and underscores. */
  readonly key: string;
  readonly name: string;
  readonly bookHours: number;
  /** What the part costs the company, before markup. 0 for labor-only work. */
  readonly partCost: number;
  /** Ticked when the list first opens. */
  readonly common: boolean;
};

/** The price book item the service call step keeps in step with the fee. */
export const SERVICE_CALL_SETUP_KEY = "service_call";
export const SERVICE_CALL_ITEM_NAME = "Service call";

/**
 * Labor, as a price book item. Estimates, invoices and the technician's
 * estimate form all pick their lines from the price book, so the way to put
 * "labor at your rate" on every one of them is to keep it there: one item at
 * the labor rate, picked with the hours as the quantity. A second one at the
 * after-hours rate exists once the company has an after-hours multiplier.
 */
export const LABOR_SETUP_KEY = "labor_hour";
export const LABOR_ITEM_NAME = "Labor (per hour)";
export const AFTER_HOURS_LABOR_SETUP_KEY = "labor_hour_after";
export const AFTER_HOURS_LABOR_ITEM_NAME = "After-hours labor (per hour)";

/**
 * Items that mirror one of the company's numbers exactly (the fee, the rate)
 * rather than being a job on the price list. They follow the number by
 * themselves; the price list step never lists them and never counts them.
 */
export const NUMBER_ITEM_KEYS: ReadonlySet<string> = new Set([SERVICE_CALL_SETUP_KEY, LABOR_SETUP_KEY, AFTER_HOURS_LABOR_SETUP_KEY]);

/** The category every setup-made price book item is filed under. */
export const STARTER_CATEGORY = "Flat rate";

/** Parts markup the list opens with when the company has not set one. */
export const STARTER_MARKUP_PERCENT = 100;
/** After-hours multiplier the list shows when the company has not set one. */
export const STARTER_AFTER_HOURS_MULTIPLIER = 1.5;

/** A list this long is a price book, not a starting point. */
export const STARTER_MAX_TASKS = 40;

const HVAC_TASKS: readonly StarterTask[] = [
  { key: "hvac_capacitor", name: "Replace run capacitor", bookHours: 0.75, partCost: 18, common: true },
  { key: "hvac_contactor", name: "Replace contactor", bookHours: 0.5, partCost: 22, common: true },
  { key: "hvac_condenser_coil_clean", name: "Clean condenser coil", bookHours: 1, partCost: 12, common: true },
  { key: "hvac_condensate_drain", name: "Clear condensate drain", bookHours: 0.75, partCost: 8, common: true },
  { key: "hvac_igniter", name: "Replace hot surface igniter", bookHours: 0.75, partCost: 35, common: true },
  { key: "hvac_flame_sensor", name: "Replace flame sensor", bookHours: 0.5, partCost: 15, common: true },
  { key: "hvac_condenser_fan_motor", name: "Replace condenser fan motor", bookHours: 1.5, partCost: 140, common: true },
  { key: "hvac_thermostat", name: "Replace thermostat", bookHours: 1, partCost: 60, common: true },
  { key: "hvac_tune_up", name: "Seasonal tune-up", bookHours: 1, partCost: 8, common: false },
  { key: "hvac_blower_motor", name: "Replace blower motor", bookHours: 2, partCost: 185, common: false },
];

const GENERAL_TASKS: readonly StarterTask[] = [
  { key: "general_minor_repair", name: "Minor repair (up to 1 hour)", bookHours: 1, partCost: 0, common: true },
  { key: "general_standard_repair", name: "Standard repair (up to 2 hours)", bookHours: 2, partCost: 0, common: true },
  { key: "general_half_day", name: "Half-day job", bookHours: 4, partCost: 0, common: true },
  { key: "general_full_day", name: "Full-day job", bookHours: 8, partCost: 0, common: true },
];

/** The starter list for a company's trade (`companies.trade`). */
export function starterTasksForTrade(trade: string | null | undefined): readonly StarterTask[] {
  return trade === "hvac" ? HVAC_TASKS : GENERAL_TASKS;
}

/** Every key a starter list can hand out. A key from a form that is not in here is refused. */
export const STARTER_TASK_KEYS: ReadonlySet<string> = new Set([...HVAC_TASKS, ...GENERAL_TASKS].map((task) => task.key));

function toCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * What a price book item priced from the labor rate should cost at the
 * company's numbers as they stand.
 *
 *   - the labor items are the rate itself, to the cent (never rounded up to
 *     a dollar: an hour of labor costs what the rate says);
 *   - every other item is a job: book hours x rate + part cost x (1 +
 *     markup), rounded up to a whole dollar, exactly as the price list step
 *     priced it.
 *
 * Null when it cannot be priced (no rate, or a job with no hours recorded).
 */
export function priceRateItem(
  item: { readonly setupKey: string | null; readonly bookHours: number | null; readonly partCost: number | null; readonly markupPercent: number | null },
  laborRate: number | null,
  afterHoursMultiplier: number | null,
): number | null {
  if (laborRate === null || !Number.isFinite(laborRate) || laborRate <= 0) return null;
  const multiplier = afterHoursMultiplier !== null && Number.isFinite(afterHoursMultiplier) && afterHoursMultiplier >= 1 ? afterHoursMultiplier : STARTER_AFTER_HOURS_MULTIPLIER;
  if (item.setupKey === LABOR_SETUP_KEY) return toCents(laborRate);
  if (item.setupKey === AFTER_HOURS_LABOR_SETUP_KEY) return toCents(laborRate * multiplier);
  if (item.bookHours === null || !Number.isFinite(item.bookHours)) return null;
  return priceStarterLine({ bookHours: item.bookHours, partCost: item.partCost ?? 0 }, laborRate, item.markupPercent ?? 0, multiplier).standard;
}

/** One line of the list, priced. Whole dollars, rounded up, like the website's price sheet. */
export function priceStarterLine(
  task: { readonly bookHours: number; readonly partCost: number },
  laborRate: number,
  markupPercent: number,
  afterHoursMultiplier: number,
): PriceListLine {
  return priceListLine({ bookHours: task.bookHours, partCost: task.partCost, markupPercent }, laborRate, afterHoursMultiplier, "dollar");
}
