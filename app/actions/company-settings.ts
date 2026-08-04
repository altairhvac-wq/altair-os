"use server";

import { revalidatePath } from "next/cache";
import { assertCompanySettingsAccess } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  updateCompanyBillingDefaults,
  updateCompanyProfile,
  updateCompanyTimezone,
} from "@/lib/database/queries/companies";
import {
  validateCompanyBillingDefaultsInput,
  type CompanyBillingDefaults,
  type CompanyBillingDefaultsInput,
} from "@/shared/lib/company-billing-defaults";
import {
  validateCompanyProfileInput,
  validateCompanyTimezoneInput,
  type CompanyProfileEditableFields,
  type CompanyProfileInput,
} from "@/shared/lib/company-profile";

export type UpdateCompanyBillingDefaultsActionResult = {
  error?: string;
  defaults?: CompanyBillingDefaults;
};

export type UpdateCompanyProfileActionResult = {
  error?: string;
  profile?: CompanyProfileEditableFields;
};

export type UpdateCompanyTimezoneActionResult = {
  error?: string;
  timezone?: string;
};

async function requireCompanySettingsContext() {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." as const };
  }

  return { context };
}

function revalidateCompanySettingsPaths() {
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/settings/company");
  revalidatePath("/settings/preferences");
  revalidatePath("/settings/documents");
  revalidatePath("/estimates");
  revalidatePath("/invoices");
  revalidatePath("/sales");
}

export async function updateCompanyBillingDefaultsAction(
  input: CompanyBillingDefaultsInput,
): Promise<UpdateCompanyBillingDefaultsActionResult> {
  const contextResult = await requireCompanySettingsContext();
  if ("error" in contextResult) {
    return { error: contextResult.error };
  }

  const accessError = assertCompanySettingsAccess(contextResult.context);
  if (accessError) {
    return { error: accessError };
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

  revalidateCompanySettingsPaths();

  return { defaults };
}

export async function updateCompanyProfileAction(
  input: CompanyProfileInput,
): Promise<UpdateCompanyProfileActionResult> {
  const contextResult = await requireCompanySettingsContext();
  if ("error" in contextResult) {
    return { error: contextResult.error };
  }

  const accessError = assertCompanySettingsAccess(contextResult.context);
  if (accessError) {
    return { error: accessError };
  }

  const validation = validateCompanyProfileInput(input);
  if (validation.error || !validation.data) {
    return { error: validation.error ?? "Invalid company profile." };
  }

  const { company, error } = await updateCompanyProfile(
    contextResult.context.company.id,
    contextResult.context,
    validation.data,
  );

  if (error || !company) {
    return { error: error ?? "Failed to save company profile." };
  }

  revalidateCompanySettingsPaths();

  return { profile: validation.data };
}

export async function updateCompanyTimezoneAction(
  timezone: string,
): Promise<UpdateCompanyTimezoneActionResult> {
  const contextResult = await requireCompanySettingsContext();
  if ("error" in contextResult) {
    return { error: contextResult.error };
  }

  const accessError = assertCompanySettingsAccess(contextResult.context);
  if (accessError) {
    return { error: accessError };
  }

  const validation = validateCompanyTimezoneInput(timezone);
  if (validation.error || !validation.timezone) {
    return { error: validation.error ?? "Invalid timezone." };
  }

  const { timezone: savedTimezone, error } = await updateCompanyTimezone(
    contextResult.context.company.id,
    contextResult.context,
    validation.timezone,
  );

  if (error || !savedTimezone) {
    return { error: error ?? "Failed to save timezone." };
  }

  revalidateCompanySettingsPaths();

  return { timezone: savedTimezone };
}
