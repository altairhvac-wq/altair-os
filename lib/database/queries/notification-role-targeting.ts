import { createClient } from "@/lib/supabase/server";
import type { CompanyRole } from "@/lib/database/types/enums";

/**
 * Planned SECURITY DEFINER RPC for membership RLS Stage 1.
 * Swap fetchActiveMemberUserIdsByRoles to supabase.rpc(...) when the migration lands.
 */
export const NOTIFICATION_ROLE_TARGETING_RPC =
  "list_active_member_user_ids_by_roles" as const;

export type ListActiveMemberUserIdsByRolesOptions = {
  excludeUserIds?: string[];
};

/**
 * Resolve active member user IDs for notification fan-out by role.
 *
 * This is the only app path that reads company_memberships for role-targeted
 * notifications. It currently depends on broad membership SELECT access and will
 * move to NOTIFICATION_ROLE_TARGETING_RPC before membership RLS is tightened.
 */
export async function listActiveMemberUserIdsByRoles(
  companyId: string,
  roles: readonly CompanyRole[],
  options?: ListActiveMemberUserIdsByRolesOptions,
): Promise<string[]> {
  if (roles.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const exclude = new Set(options?.excludeUserIds ?? []);
  const userIds = await fetchActiveMemberUserIdsByRoles(supabase, companyId, roles);

  return userIds.filter((userId) => !exclude.has(userId));
}

/**
 * Notification fan-out membership resolver.
 *
 * Keep this as the single company_memberships read for role targeting so a future
 * RPC swap stays localized.
 */
async function fetchActiveMemberUserIdsByRoles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  roles: readonly CompanyRole[],
): Promise<string[]> {
  const { data, error } = await supabase
    .from("company_memberships")
    .select("user_id, role")
    .eq("company_id", companyId)
    .eq("status", "active")
    .in("role", [...roles]);

  if (error) {
    console.error("[listActiveMemberUserIdsByRoles] query failed:", {
      companyId,
      error,
    });
    return [];
  }

  return (data ?? [])
    .map((row) => row.user_id)
    .filter((userId): userId is string => userId != null);
}
