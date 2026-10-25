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
  // Dev-only capture affordance for the Altair Demo Tool (same posture as
  // /api/demo/*): a sample-data capture company films without "[Demo]" labels
  // while its rows stay is_demo = true in the database. Ignored outside
  // NODE_ENV=development, so production tenants are unaffected.
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DEMO_TOOL_HIDE_DEMO_PREFIXES?.trim() === "1"
  ) {
    return true;
  }

  return canAccessPlatformAdmin(user);
}
