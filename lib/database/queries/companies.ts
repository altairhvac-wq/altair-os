import { createClient } from "@/lib/supabase/server";
import {
  assertCompanySettingsAccess,
  assertMatchingCompanyScope,
} from "@/lib/database/access-control";
import { mapDatabaseError } from "@/lib/database/errors";
import type { ActiveCompanyContext, CompanyRow } from "@/lib/database/types/core-tables";
import type { Json } from "@/lib/database/types/enums";
import {
  parseCompanyBillingDefaults,
  serializeCompanyBillingDefaultsPatch,
  type CompanyBillingDefaults,
} from "@/shared/lib/company-billing-defaults";

function isRecord(value: unknown): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeBillingDefaultsIntoSettings(
  currentSettings: Json,
  defaults: CompanyBillingDefaults,
): Json {
  const existing = isRecord(currentSettings) ? currentSettings : {};
  const patch = serializeCompanyBillingDefaultsPatch(defaults);

  return {
    ...existing,
    ...patch,
  };
}

export function getCompanyBillingDefaultsFromRow(
  company: Pick<CompanyRow, "settings">,
): CompanyBillingDefaults {
  return parseCompanyBillingDefaults(company.settings);
}

export async function updateCompanyBillingDefaults(
  companyId: string,
  context: ActiveCompanyContext,
  defaults: CompanyBillingDefaults,
): Promise<{ defaults: CompanyBillingDefaults | null; error: string | null }> {
  const accessError = assertCompanySettingsAccess(context);
  if (accessError) {
    return { defaults: null, error: accessError };
  }

  const scopeError = assertMatchingCompanyScope(context, companyId);
  if (scopeError) {
    return { defaults: null, error: scopeError };
  }

  const supabase = await createClient();
  const nextSettings = mergeBillingDefaultsIntoSettings(
    context.company.settings,
    defaults,
  );

  const { data, error } = await supabase
    .from("companies")
    .update({ settings: nextSettings })
    .eq("id", companyId)
    .select("settings")
    .single();

  if (error || !data) {
    console.error("[updateCompanyBillingDefaults] update failed:", {
      companyId,
      code: error?.code,
      message: error?.message,
    });
    return {
      defaults: null,
      error: error ? mapDatabaseError(error) : "Failed to update billing defaults.",
    };
  }

  return {
    defaults: parseCompanyBillingDefaults(data.settings),
    error: null,
  };
}
