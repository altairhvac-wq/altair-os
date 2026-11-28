"use server";

import { revalidatePath } from "next/cache";
import { assertBusinessNumbersAccess } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { saveCompanyBusinessNumbers } from "@/lib/database/queries/business-numbers";
import { saveServiceCallItem } from "@/lib/database/queries/business-setup";
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
};

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

  const { record, error } = await saveCompanyBusinessNumbers(context.company.id, context, validation.data);
  if (error || !record) {
    return { error: error ?? "The numbers could not be saved. Try again." };
  }

  // The guided setup keeps a "Service call" item in the price book at the
  // company's fee. A fee changed here has to reach that item too, or the
  // estimate would go on charging the old one. (Only an item that exists is
  // updated; this page never adds to the price book.)
  let notice: string | undefined;
  if (validation.data.serviceCallFee !== undefined && validation.data.serviceCallFee !== null) {
    const item = await saveServiceCallItem(context.company.id, context, validation.data.serviceCallFee, { createIfMissing: false });
    if (item.error) {
      notice = "Your numbers were saved, but the Service call item in your price book could not be updated. Change its price in your price book.";
    }
  }

  revalidateBusinessNumbersPaths();

  return { numbers: record.numbers, updatedAt: record.updatedAt, notice };
}
