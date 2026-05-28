import { createClient } from "@/lib/supabase/server";
import type { CompanyRole } from "@/lib/database/types/enums";

/** SECURITY DEFINER RPC for membership RLS Stage 1 notification fan-out. */
export const NOTIFICATION_ROLE_TARGETING_RPC =
  "list_active_member_user_ids_by_roles" as const;

export type ListActiveMemberUserIdsByRolesOptions = {
  excludeUserIds?: string[];
};

/**
 * Resolve active member user IDs for notification fan-out by role.
 *
 * This is the only app path that resolves role-targeted notification recipients.
 * It uses NOTIFICATION_ROLE_TARGETING_RPC so membership RLS can tighten later.
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

/** Notification fan-out membership resolver via SECURITY DEFINER RPC. */
async function fetchActiveMemberUserIdsByRoles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  roles: readonly CompanyRole[],
): Promise<string[]> {
  const { data, error } = await supabase.rpc(NOTIFICATION_ROLE_TARGETING_RPC, {
    p_company_id: companyId,
    p_roles: [...roles],
  });

  if (error) {
    console.error("[listActiveMemberUserIdsByRoles] rpc failed:", {
      companyId,
      error,
    });
    return [];
  }

  return (data ?? []).filter((userId): userId is string => userId != null);
}
