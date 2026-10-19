import "server-only";

import { notFound } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/database/auth";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin-emails";

/**
 * Server-only allowlist for internal platform admin.
 *
 * ==================== WHY IT MOVED TO CONFIGURATION ====================
 * This was a literal `new Set(["altairhvac@gmail.com"])` compiled into every
 * build. Granting or revoking internal admin access — which controls the
 * reconciliation dashboard, the platform bug queue and founder marketing
 * publishing — required a code change and a deploy, there was no way to have
 * a second administrator during an incident, and the address was hard-coded in
 * the repository.
 *
 * It now comes from PLATFORM_ADMIN_EMAILS: a comma-separated, server-only
 * variable. Never prefix it with NEXT_PUBLIC_ — that would ship the allowlist
 * to every browser.
 *
 * ==================== FAIL CLOSED ====================
 * A missing, empty, or entirely malformed value yields an EMPTY allowlist, and
 * an empty allowlist admits nobody. The alternative — falling back to a
 * built-in default — is what turns a deployment typo into silent access, so
 * there is deliberately no default. `requirePlatformAdmin` answers 404, so a
 * misconfigured deployment looks like "this page does not exist" rather than
 * "you are not allowed", which is also the correct answer for an internal
 * surface.
 *
 * Entries are trimmed and lowercased; anything that is not a plausible address
 * is dropped rather than silently matched.
 */
export {
  canAccessPlatformAdmin,
  getPlatformAdminEmails,
  isPlatformAdminConfigured,
} from "@/lib/database/platform-admin-emails";

/**
 * Ensures the current session belongs to a platform admin.
 * Returns the authenticated user or triggers notFound() (no auth hint).
 */
export async function requirePlatformAdmin(): Promise<User> {
  const user = await getCurrentUser();

  if (!user || !canAccessPlatformAdmin(user)) {
    notFound();
  }

  return user;
}
