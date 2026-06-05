import { isMissingDatabaseColumnError } from "@/lib/database/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";
import { hasSavedCompanyBillingDefaults } from "@/shared/lib/company-billing-defaults";
import type { OnboardingSnapshot } from "@/shared/types/onboarding";

const LIFECYCLE_COUNT_TABLES = new Set([
  "customers",
  "jobs",
  "service_items",
]);

async function countTableRows(
  table: "customers" | "jobs" | "service_items" | "company_memberships",
  companyId: string,
  extraFilters?: Record<string, string>,
  options: { applyLifecycleFilters?: boolean } = {},
): Promise<number> {
  const supabase = await createClient();
  const applyLifecycleFilters =
    options.applyLifecycleFilters ?? LIFECYCLE_COUNT_TABLES.has(table);

  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (applyLifecycleFilters) {
    query = query.is("deleted_at", null).is("archived_at", null);
  }

  if (extraFilters) {
    for (const [key, value] of Object.entries(extraFilters)) {
      query = query.eq(key, value);
    }
  }

  const { count, error } = await query;

  if (error) {
    if (
      applyLifecycleFilters &&
      LIFECYCLE_COUNT_TABLES.has(table) &&
      isMissingDatabaseColumnError(error)
    ) {
      console.warn(
        `[onboarding-snapshot] ${table} lifecycle columns missing; counting without lifecycle filters:`,
        {
          companyId,
          code: error.code,
          message: error.message,
        },
      );
      return countTableRows(table, companyId, extraFilters, {
        applyLifecycleFilters: false,
      });
    }

    console.error(`[onboarding-snapshot] ${table} count failed:`, {
      companyId,
      code: error.code,
      message: error.message,
    });
    return 0;
  }

  return count ?? 0;
}

async function countLeadRows(companyId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .is("deleted_at", null);

  if (error) {
    if (isMissingDatabaseColumnError(error)) {
      return 0;
    }

    console.error("[onboarding-snapshot] leads count failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return 0;
  }

  return count ?? 0;
}

export async function getOnboardingSnapshot(
  companyId: string,
  _context: ActiveCompanyContext,
): Promise<OnboardingSnapshot> {
  const supabase = await createClient();

  const [
    customerCount,
    leadCount,
    jobCount,
    serviceItemCount,
    teamMemberCount,
    companyResult,
  ] = await Promise.all([
    countTableRows("customers", companyId),
    countLeadRows(companyId),
    countTableRows("jobs", companyId),
    countTableRows("service_items", companyId),
    countTableRows("company_memberships", companyId),
    supabase.from("companies").select("settings").eq("id", companyId).maybeSingle(),
  ]);

  if (companyResult.error) {
    console.error("[onboarding-snapshot] company settings load failed:", {
      companyId,
      code: companyResult.error.code,
      message: companyResult.error.message,
    });
  }

  return {
    teamMemberCount,
    hasInvitedOrActiveTeam: teamMemberCount > 1,
    customerCount,
    leadCount,
    jobCount,
    serviceItemCount,
    hasBillingDefaultsConfigured: hasSavedCompanyBillingDefaults(
      companyResult.data?.settings,
    ),
  };
}
