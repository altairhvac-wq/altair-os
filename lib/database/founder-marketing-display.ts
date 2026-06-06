import "server-only";

import type { User } from "@supabase/supabase-js";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin";

/**
 * Founder marketing screenshots use the platform-admin workspace.
 * Beta/demo tenants keep visible [Demo] labels for identification.
 */
export function shouldHideDemoPrefixesForDisplay(
  user: Pick<User, "email"> | null | undefined,
): boolean {
  return canAccessPlatformAdmin(user);
}
