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

/** One line of the list, priced. Whole dollars, rounded up, like the website's price sheet. */
export function priceStarterLine(
  task: { readonly bookHours: number; readonly partCost: number },
  laborRate: number,
  markupPercent: number,
  afterHoursMultiplier: number,
): PriceListLine {
  return priceListLine({ bookHours: task.bookHours, partCost: task.partCost, markupPercent }, laborRate, afterHoursMultiplier, "dollar");
}
