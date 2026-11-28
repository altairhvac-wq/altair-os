/**
 * The guided setup: what each step's form sends, and the check it goes
 * through before anything is saved.
 *
 * The numbers themselves (labor rate, fee, shop costs...) are checked by
 * validateBusinessNumbersInput in ./business-numbers. This file adds the two
 * steps that write somewhere else as well: "Your shop" (the company profile,
 * its time zone and the default sales tax) and "Your price list" (price book
 * items).
 *
 * Pure: no imports but its sibling, safe on the server and in the browser.
 */

import { parseBusinessNumber } from "./business-numbers";

/* ------------------------------------------------------------- your shop */

/** What the "Your shop" step sends. Every box is optional: a blank one is left as it is. */
export type ShopStepInput = {
  phone?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  /**
   * The company's time zone, an IANA name ("America/Chicago"). Sent only
   * where the choice can be recorded (migration 220); saving it marks the
   * zone as chosen. It is checked by the same rule Settings > Company uses
   * (validateCompanyTimezoneInput, shared/lib/company-profile.ts), in the
   * action: that check needs the runtime's zone list, and this file stays
   * pure.
   */
  timezone?: string | null;
  /**
   * How the zone got into the form. "picked": the owner chose it from the
   * list. "suggested": the list opened on the browser's zone for a company
   * that had not chosen, and the owner left it. A suggestion is saved only
   * if the company still has not chosen when the save arrives: it never
   * replaces a zone someone confirmed in the meantime.
   */
  timezoneSource?: "picked" | "suggested";
  /** Sales tax, percent. Blank leaves the current default alone. */
  defaultTaxRate?: string | number | null;
  technicianCount?: string | number | null;
};

/* ------------------------------------------------------- your price list */

export type PriceListTaskInput = {
  /**
   * A starter task's key, the key of a job the owner added on an earlier
   * visit (custom_...), or null for a job being added now.
   */
  key: string | null;
  name: string;
  bookHours: string | number;
  partCost: string | number;
};

export type PriceListStepInput = {
  /** Added on top of each part's cost, percent. */
  markupPercent: string | number;
  tasks: readonly PriceListTaskInput[];
  /** Keys of setup-made jobs the owner unticked: they leave the price book (archived, not deleted). */
  removeKeys?: readonly string[];
};

export type PriceListTask = {
  readonly key: string | null;
  readonly name: string;
  readonly bookHours: number;
  readonly partCost: number;
};

export type PriceListStep = {
  readonly markupPercent: number;
  readonly tasks: readonly PriceListTask[];
  readonly removeKeys: readonly string[];
};

export type PriceListValidation =
  | { readonly data: PriceListStep; readonly error?: undefined }
  | {
      readonly data?: undefined;
      readonly error: string;
      /** Index of the row the problem is in, when it is in one. */
      readonly row: number | null;
      /** Set when the problem is the markup box. */
      readonly field?: "markupPercent";
    };

/**
 * The shape of the key the setup gives a job the owner added themselves. The
 * server makes these (twelve random characters); a form can only hand back
 * one it was given, and one the database does not know is simply a new job.
 */
export const CUSTOM_SETUP_KEY_PATTERN = /^custom_[a-z0-9]{12}$/;

/** Hours and part costs are kept to cents; the screen prices with the same rounding the save uses. */
export function roundPriceListNumber(value: number): number {
  return roundTo(value, 2);
}

export const PRICE_LIST_NAME_MIN = 2;
export const PRICE_LIST_NAME_MAX = 80;
export const PRICE_LIST_MAX_HOURS = 1000;
export const PRICE_LIST_MAX_PART_COST = 100000;
export const PRICE_LIST_MAX_MARKUP = 1000;

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Checks the price list a form sent.
 *
 * @param knownKeys the keys the starter lists hand out; any other key is refused
 * @param maxTasks  the most rows one save may carry
 */
export function validatePriceListStepInput(
  input: PriceListStepInput | null | undefined,
  knownKeys: ReadonlySet<string>,
  maxTasks: number,
): PriceListValidation {
  if (!input || typeof input !== "object" || !Array.isArray(input.tasks)) {
    return { error: "Nothing to save.", row: null };
  }
  if (input.tasks.length === 0 && !(Array.isArray(input.removeKeys) && input.removeKeys.length > 0)) {
    return { error: "Keep at least one job, or skip this step for now.", row: null };
  }
  if (input.tasks.length > maxTasks) {
    return { error: `Keep ${maxTasks} jobs or fewer here. You can add the rest in your price book.`, row: null };
  }

  const isKnownKey = (key: unknown): key is string => typeof key === "string" && (knownKeys.has(key) || CUSTOM_SETUP_KEY_PATTERN.test(key));

  const removeKeys: string[] = [];
  if (input.removeKeys !== undefined) {
    if (!Array.isArray(input.removeKeys) || input.removeKeys.length > maxTasks * 2 || !input.removeKeys.every(isKnownKey)) {
      return { error: "The list could not be read. Reload the page and try again.", row: null };
    }
    removeKeys.push(...new Set(input.removeKeys as readonly string[]));
  }

  const markup = parseBusinessNumber(input.markupPercent);
  if (markup === "invalid" || markup === null) {
    return { error: "Parts markup needs to be a number. Use 0 for no markup.", row: null, field: "markupPercent" };
  }
  if (markup < 0 || markup > PRICE_LIST_MAX_MARKUP) {
    return { error: `Parts markup has to be between 0% and ${PRICE_LIST_MAX_MARKUP}%.`, row: null, field: "markupPercent" };
  }

  const tasks: PriceListTask[] = [];
  const seenNames = new Set<string>();
  const seenKeys = new Set<string>();

  for (let row = 0; row < input.tasks.length; row += 1) {
    const task = input.tasks[row];
    if (!task || typeof task !== "object") {
      return { error: "One of the jobs could not be read. Reload the page and try again.", row };
    }

    const name = typeof task.name === "string" ? task.name.trim().replace(/\s+/g, " ") : "";
    if (name.length < PRICE_LIST_NAME_MIN) {
      return { error: "Give every job a name.", row };
    }
    if (name.length > PRICE_LIST_NAME_MAX) {
      return { error: `Keep job names to ${PRICE_LIST_NAME_MAX} letters or fewer.`, row };
    }
    const nameKey = name.toLowerCase();
    if (seenNames.has(nameKey)) {
      return { error: `"${name}" is on the list twice.`, row };
    }
    seenNames.add(nameKey);

    let key: string | null = null;
    if (task.key !== null && task.key !== undefined) {
      if (!isKnownKey(task.key)) {
        return { error: "One of the jobs could not be read. Reload the page and try again.", row };
      }
      if (removeKeys.includes(task.key)) {
        return { error: `"${name}" is both kept and removed. Reload the page and try again.`, row };
      }
      if (seenKeys.has(task.key)) {
        return { error: `"${name}" is on the list twice.`, row };
      }
      seenKeys.add(task.key);
      key = task.key;
    }

    const hours = parseBusinessNumber(task.bookHours);
    if (hours === "invalid" || hours === null) {
      return { error: `"${name}" needs its hours as a number.`, row };
    }
    if (hours < 0 || hours > PRICE_LIST_MAX_HOURS) {
      return { error: `"${name}": hours have to be between 0 and ${PRICE_LIST_MAX_HOURS}.`, row };
    }

    const part = parseBusinessNumber(task.partCost);
    if (part === "invalid") {
      return { error: `"${name}" needs its part cost as a number. Leave it empty for no part.`, row };
    }
    const partCost = part ?? 0;
    if (partCost < 0 || partCost > PRICE_LIST_MAX_PART_COST) {
      return { error: `"${name}": the part cost has to be between $0 and $${PRICE_LIST_MAX_PART_COST.toLocaleString("en-US")}.`, row };
    }
    if (hours === 0 && partCost === 0) {
      return { error: `"${name}" has no hours and no part, so it has no price.`, row };
    }

    tasks.push({ key, name, bookHours: roundTo(hours, 2), partCost: roundTo(partCost, 2) });
  }

  return { data: { markupPercent: roundTo(markup, 2), tasks, removeKeys } };
}

/* ------------------------------------------------- your shop: validation */

export type ShopContactKey = "phone" | "addressLine1" | "city" | "state" | "postalCode";

/** Only the contact boxes that were sent. A blank box clears that detail. */
export type ShopContactPatch = Partial<Record<ShopContactKey, string | null>>;

/** The same limits Settings > Company holds these to (shared/lib/company-profile.ts). */
const SHOP_CONTACT_LIMITS: Readonly<Record<ShopContactKey, { readonly label: string; readonly max: number }>> = {
  phone: { label: "Phone number", max: 40 },
  addressLine1: { label: "Street address", max: 200 },
  city: { label: "City", max: 100 },
  state: { label: "State", max: 100 },
  postalCode: { label: "ZIP code", max: 30 },
};

export const SHOP_CONTACT_KEYS = Object.keys(SHOP_CONTACT_LIMITS) as readonly ShopContactKey[];

export function validateShopContact(input: ShopStepInput | null | undefined): { data?: ShopContactPatch; error?: string; field?: ShopContactKey } {
  const patch: ShopContactPatch = {};
  if (!input || typeof input !== "object") return { data: patch };

  for (const key of SHOP_CONTACT_KEYS) {
    if (!(key in input)) continue;
    const raw = input[key];
    if (raw === null || raw === undefined) {
      patch[key] = null;
      continue;
    }
    if (typeof raw !== "string") {
      return { error: `${SHOP_CONTACT_LIMITS[key].label} could not be read.`, field: key };
    }
    const value = raw.trim().replace(/\s+/g, " ");
    if (value.length > SHOP_CONTACT_LIMITS[key].max) {
      return { error: `${SHOP_CONTACT_LIMITS[key].label} must be ${SHOP_CONTACT_LIMITS[key].max} characters or fewer.`, field: key };
    }
    patch[key] = value === "" ? null : value;
  }

  return { data: patch };
}
