"use server";

import { revalidatePath } from "next/cache";
import { assertBusinessNumbersAccess } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { getCompanyBusinessNumbers, saveCompanyBusinessNumbers } from "@/lib/database/queries/business-numbers";
import {
  listOutOfDateRateItems,
  repriceRateItems,
  saveLaborItems,
  saveServiceCallItem,
  type RatePricedItem,
} from "@/lib/database/queries/business-setup";
import {
  validateBusinessNumbersInput,
  type BusinessNumberKey,
  type BusinessNumbers,
  type BusinessNumbersInput,
} from "@/shared/types/business-numbers";

/**
 * Saving a company's business numbers (Settings > Business numbers).
 *
 * A public entry point like every Server Action: it resolves the signed-in
 * person and their company itself, checks they are an owner or admin, checks
 * every number against its limits, and only then writes. The company is never
 * taken from the form.
 */

export type UpdateBusinessNumbersActionResult = {
  error?: string;
  /** The field the problem belongs to, so the form can point at it. */
  field?: BusinessNumberKey | null;
  numbers?: BusinessNumbers;
  updatedAt?: string | null;
  /** The numbers were saved, but something that follows from them was not. Shown as a warning, not a failure. */
  notice?: string;
  /** Price book jobs priced from the labor rate that no longer match it, old price beside new. */
  outOfDate?: RatePricedItem[];
};

export type RepricePriceBookActionResult = {
  error?: string;
  /** How many prices were changed. */
  updated?: number;
  /** True when the list had changed since the owner was shown it: nothing was changed, and `outOfDate` is the list as it stands. */
  changedSince?: boolean;
  /** What is out of date now, on success and on failure alike, so the screen always shows where things stand. */
  outOfDate?: RatePricedItem[];
};

/** What the owner was looking at when they pressed the button: checked against the server's own list, never applied. */
export type ShownRepriceItem = { id: string; newPrice: number };

/** Pages that show something worked out from these numbers. */
function revalidateBusinessNumbersPaths() {
  revalidatePath("/settings");
  revalidatePath("/settings/business-numbers");
  revalidatePath("/price-book");
}

/**
 * @param expectedCompanyId the company the form was loaded for. It is never
 *   used to decide where to save (that is always the signed-in company); it
 *   only lets the action refuse when the two differ, which happens when an
 *   owner of two companies switches company in another tab and then presses
 *   Save here. Without it those numbers would land in the other company.
 */
export async function updateBusinessNumbersAction(
  input: BusinessNumbersInput,
  expectedCompanyId: string,
): Promise<UpdateBusinessNumbersActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  const accessError = assertBusinessNumbersAccess(context);
  if (accessError) {
    return { error: accessError };
  }

  if (typeof expectedCompanyId !== "string" || expectedCompanyId !== context.company.id) {
    return { error: "You are now working in a different company than this page was opened for. Reload the page, then save again." };
  }

  const validation = validateBusinessNumbersInput(input);
  if (validation.error !== undefined) {
    return { error: validation.error, field: validation.field };
  }

  // What the numbers were, so a price book item can come back when its number
  // does (see "the items that are a number" in queries/business-setup.ts).
  const { record: before } = await getCompanyBusinessNumbers(context);
  const previous = { laborRate: before.numbers.laborRate, afterHoursMultiplier: before.numbers.afterHoursMultiplier, serviceCallFee: before.numbers.serviceCallFee };

  const { record, error } = await saveCompanyBusinessNumbers(context.company.id, context, validation.data);
  if (error || !record) {
    return { error: error ?? "The numbers could not be saved. Try again." };
  }

  // The guided setup keeps a "Service call" item in the price book at the
  // company's fee. A fee changed here has to reach that item too, or the
  // estimate would go on charging the old one. (Only an item that exists is
  // updated; this page never adds to the price book.)
  let notice: string | undefined;
  if (validation.data.serviceCallFee !== undefined) {
    const item = await saveServiceCallItem(context.company.id, context, record.numbers.serviceCallFee, { createIfMissing: false, previous });
    if (item.error) {
      notice = "Your numbers were saved, but the Service call item in your price book could not be updated. Change its price in your price book.";
    }
  }

  // The same for labor: the price book's labor items are the rate itself, so
  // they follow it at once. (The jobs on the price list do not: those are
  // shown old price beside new, and change only when the owner says so.)
  if (validation.data.laborRate !== undefined || validation.data.afterHoursMultiplier !== undefined) {
    const labor = await saveLaborItems(context.company.id, context, record.numbers, { createIfMissing: false, previous });
    if (labor.error && !notice) {
      notice = "Your numbers were saved, but the Labor item in your price book could not be updated. Change its price in your price book.";
    }
  }

  revalidateBusinessNumbersPaths();

  return { numbers: record.numbers, updatedAt: record.updatedAt, notice, outOfDate: await listOutOfDateRateItems(context, record.numbers) };
}

/**
 * Re-prices the price book jobs that were priced from the labor rate, at the
 * company's numbers as they are stored now. The owner has just been shown
 * each job's old and new price; this applies them. Nothing about a price is
 * taken from the browser: `shown` is only compared with the server's own
 * list, and if the two differ (the numbers changed in another tab) nothing
 * is changed.
 */
export async function repricePriceBookAction(expectedCompanyId: string, shown: readonly ShownRepriceItem[]): Promise<RepricePriceBookActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  const accessError = assertBusinessNumbersAccess(context);
  if (accessError) {
    return { error: accessError };
  }

  if (typeof expectedCompanyId !== "string" || expectedCompanyId !== context.company.id) {
    return { error: "You are now working in a different company than this page was opened for. Reload the page, then try again." };
  }

  const { record, error: readError } = await getCompanyBusinessNumbers(context);
  if (readError) {
    return { error: readError };
  }

  const checked = Array.isArray(shown)
    ? shown.filter((item): item is ShownRepriceItem => Boolean(item) && typeof item.id === "string" && typeof item.newPrice === "number" && Number.isFinite(item.newPrice)).slice(0, 500)
    : [];

  const { updated, changedSince, error } = await repriceRateItems(context.company.id, context, record.numbers, checked);

  revalidateBusinessNumbersPaths();

  const outOfDate = await listOutOfDateRateItems(context, record.numbers);
  if (error) {
    return { error, updated, outOfDate };
  }
  return { updated, changedSince, outOfDate };
}
