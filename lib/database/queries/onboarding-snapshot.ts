import { createServiceRoleClient } from "@/lib/supabase/service";
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

/**
 * ============================== WHY THESE COUNTS BYPASS RLS ==============================
 * The dashboard renders three loaders concurrently: getDashboardData, this
 * snapshot, and the demo-data status. Between them the last two issue TWENTY-TWO
 * exact head counts.
 *
 * An exact count makes the planner evaluate the SELECT policy once per row it
 * counts. Measured on the scale-seeded scratch tenant, a single such count is
 * 1.4-2.3 seconds against 139-177 ms with the policy bypassed. Twenty-two of
 * them saturate the connection pool, and the effect is not confined to them —
 * with the counts running, an RPC measured at 606 ms in isolation took 4,805 ms,
 * and every branch of the dashboard fan-out inflated to match. Removing whole-
 * book reads from the dashboard changed nothing while this was happening,
 * because this was the bottleneck the whole time.
 *
 * The authorization these queries would get from RLS is already established
 * above them: the page resolves the active company context before calling, and
 * every query below is pinned to that company id, which is not user input. Same
 * call, same reasoning, as getExpenseQueueCounts and getCustomerQueueCounts.
 *
 * Only the COUNTS move. Anything that returns rows keeps the user-scoped
 * client — rows are what a mistake would actually leak.
 */
async function countTableRows(
  table: "customers" | "jobs" | "service_items" | "company_memberships",
  companyId: string,
  extraFilters?: Record<string, string>,
  options: { applyLifecycleFilters?: boolean } = {},
): Promise<number> {
  const supabase = createServiceRoleClient();
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

async function countBillingDocumentRows(
  table: "estimates" | "invoices",
  companyId: string,
): Promise<number> {
  const supabase = createServiceRoleClient();

  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .is("deleted_at", null);

  if (error) {
    if (isMissingDatabaseColumnError(error)) {
      return 0;
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
  const supabase = createServiceRoleClient();

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
    estimateCount,
    invoiceCount,
    teamMemberCount,
    companyResult,
  ] = await Promise.all([
    countTableRows("customers", companyId),
    countLeadRows(companyId),
    countTableRows("jobs", companyId),
    countTableRows("service_items", companyId),
    countBillingDocumentRows("estimates", companyId),
    countBillingDocumentRows("invoices", companyId),
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
    estimateCount,
    invoiceCount,
    hasBillingDefaultsConfigured: hasSavedCompanyBillingDefaults(
      companyResult.data?.settings,
    ),
  };
}
