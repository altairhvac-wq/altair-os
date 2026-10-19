import "server-only";

import type { User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Every auth account, paged to completion through the Admin API (200 per
 * page). Service role; callers must already have authorised a platform admin.
 * Shared by the Platform overview and Platform analytics.
 */
export async function fetchAllAuthUsers(
  diagnostics: string[],
): Promise<{ users: User[]; error: string | null }> {
  const supabase = createServiceRoleClient();
  const users: User[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      const code = "code" in error && error.code ? ` (${String(error.code)})` : "";
      const message = `auth.admin.listUsers failed: ${error.message}${code}`;
      console.error(`[auth-users] ${message}`);
      diagnostics.push(message);
      return { users, error: message };
    }

    users.push(...data.users);

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  if (users.length === 0) {
    diagnostics.push("auth.admin.listUsers returned 0 accounts");
  }

  return { users, error: null };
}
