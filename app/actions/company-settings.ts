"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { updateCompanyBillingDefaults } from "@/lib/database/queries/companies";
import {
  validateCompanyBillingDefaultsInput,
  type CompanyBillingDefaults,
  type CompanyBillingDefaultsInput,
} from "@/shared/lib/company-billing-defaults";

export type UpdateCompanyBillingDefaultsActionResult = {
  error?: string;
  defaults?: CompanyBillingDefaults;
};

async function requireCompanySettingsContext() {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." as const };
  }

  return { context };
}

export async function updateCompanyBillingDefaultsAction(
  input: CompanyBillingDefaultsInput,
): Promise<UpdateCompanyBillingDefaultsActionResult> {
  const contextResult = await requireCompanySettingsContext();
  if ("error" in contextResult) {
    return { error: contextResult.error };
  }

  const validation = validateCompanyBillingDefaultsInput(input);
  if (validation.error || !validation.data) {
    return { error: validation.error ?? "Invalid billing defaults." };
  }

  const { defaults, error } = await updateCompanyBillingDefaults(
    contextResult.context.company.id,
    contextResult.context,
    validation.data,
  );

  if (error || !defaults) {
    return { error: error ?? "Failed to save billing defaults." };
  }

  revalidatePath("/settings");
  revalidatePath("/estimates");
  revalidatePath("/invoices");

  return { defaults };
}
