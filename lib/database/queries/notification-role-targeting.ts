import "server-only";

import type { DbClient } from "@/lib/database/db-client";
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
 * This is the normal app path for role-targeted notification recipients. It
 * runs as the signed-in user and uses NOTIFICATION_ROLE_TARGETING_RPC so
 * membership RLS can tighten later. Unauthenticated entry points (the public
 * estimate approval page) use listActiveMemberUserIdsByRolesWithServiceRole.
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
 * Service-role variant for flows with no signed-in user (anon key session),
 * where the RPC is not granted and its membership check would fail anyway.
 *
 * Call this ONLY after the caller has been authorized in application code for
 * this exact company. Today that is a verified public estimate-approval token,
 * whose RPC returned the company id. Never pass a company id from user input.
 */
export async function listActiveMemberUserIdsByRolesWithServiceRole(
  serviceRoleDb: DbClient,
  companyId: string,
  roles: readonly CompanyRole[],
  options?: ListActiveMemberUserIdsByRolesOptions,
): Promise<string[]> {
  if (roles.length === 0) {
    return [];
  }

  const { data, error } = await serviceRoleDb
    .from("company_memberships")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("status", "active")
    .in("role", [...roles])
    .not("user_id", "is", null);

  if (error) {
    console.error("[listActiveMemberUserIdsByRolesWithServiceRole] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  const exclude = new Set(options?.excludeUserIds ?? []);
  const userIds = (data ?? [])
    .map((row) => row.user_id)
    .filter((userId): userId is string => userId != null);

  return [...new Set(userIds)].filter((userId) => !exclude.has(userId));
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
