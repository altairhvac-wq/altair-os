"use server";

import { revalidatePath } from "next/cache";
import { assertBusinessNumbersAccess } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { saveCompanyBusinessNumbers } from "@/lib/database/queries/business-numbers";
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
};

/** Pages that show something worked out from these numbers. */
function revalidateBusinessNumbersPaths() {
  revalidatePath("/settings");
  revalidatePath("/settings/business-numbers");
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

  revalidateBusinessNumbersPaths();

  return { numbers: record.numbers, updatedAt: record.updatedAt };
}
