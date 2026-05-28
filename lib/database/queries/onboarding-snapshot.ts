import { createClient } from "@/lib/supabase/server";
import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";
import type { OnboardingSnapshot } from "@/shared/types/onboarding";

async function countTableRows(
  table: "customers" | "jobs" | "service_items" | "company_memberships",
  companyId: string,
  extraFilters?: Record<string, string>,
): Promise<number> {
  const supabase = await createClient();

  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (extraFilters) {
    for (const [key, value] of Object.entries(extraFilters)) {
      query = query.eq(key, value);
    }
  }

  const { count, error } = await query;

  if (error) {
    console.error(`[onboarding-snapshot] ${table} count failed:`, {
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
  const [customerCount, jobCount, serviceItemCount, teamMemberCount] =
    await Promise.all([
      countTableRows("customers", companyId),
      countTableRows("jobs", companyId),
      countTableRows("service_items", companyId),
      countTableRows("company_memberships", companyId),
    ]);

  return {
    teamMemberCount,
    hasInvitedOrActiveTeam: teamMemberCount > 1,
    customerCount,
    jobCount,
    serviceItemCount,
  };
}
