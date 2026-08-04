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
import type { CompanyProfileEditableFields } from "@/shared/lib/company-profile";

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

export async function updateCompanyProfile(
  companyId: string,
  context: ActiveCompanyContext,
  profile: CompanyProfileEditableFields,
): Promise<{ company: CompanyRow | null; error: string | null }> {
  const accessError = assertCompanySettingsAccess(context);
  if (accessError) {
    return { company: null, error: accessError };
  }

  const scopeError = assertMatchingCompanyScope(context, companyId);
  if (scopeError) {
    return { company: null, error: scopeError };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .update({
      name: profile.name,
      trade: profile.trade,
      timezone: profile.timezone,
      phone: profile.phone,
      email: profile.email,
      address_line1: profile.addressLine1,
      address_line2: profile.addressLine2,
      city: profile.city,
      state: profile.state,
      postal_code: profile.postalCode,
      country: profile.country,
    })
    .eq("id", companyId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[updateCompanyProfile] update failed:", {
      companyId,
      code: error?.code,
      message: error?.message,
    });
    return {
      company: null,
      error: error ? mapDatabaseError(error) : "Failed to update company profile.",
    };
  }

  return { company: data, error: null };
}

export async function updateCompanyTimezone(
  companyId: string,
  context: ActiveCompanyContext,
  timezone: string,
): Promise<{ timezone: string | null; error: string | null }> {
  const accessError = assertCompanySettingsAccess(context);
  if (accessError) {
    return { timezone: null, error: accessError };
  }

  const scopeError = assertMatchingCompanyScope(context, companyId);
  if (scopeError) {
    return { timezone: null, error: scopeError };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .update({ timezone })
    .eq("id", companyId)
    .select("timezone")
    .single();

  if (error || !data) {
    console.error("[updateCompanyTimezone] update failed:", {
      companyId,
      code: error?.code,
      message: error?.message,
    });
    return {
      timezone: null,
      error: error ? mapDatabaseError(error) : "Failed to update timezone.",
    };
  }

  return { timezone: data.timezone, error: null };
}
