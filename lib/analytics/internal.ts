import "server-only";

import type { User } from "@supabase/supabase-js";
import { canAccessPlatformAdmin, getPlatformAdminEmails } from "@/lib/database/platform-admin-emails";

/**
 * Who counts as "us" in the website figures: a platform admin, or any
 * plus-alias of a platform admin's address (owner+test1@gmail.com is the
 * owner's test signup, not a customer). Never used for authorization.
 */
function baseAddress(email: string): string {
  const [local, domain] = email.trim().toLowerCase().split("@");
  if (!local || !domain) return email.trim().toLowerCase();
  return `${local.split("+")[0]}@${domain}`;
}

export function isInternalAnalyticsEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const base = baseAddress(email);
  for (const admin of getPlatformAdminEmails()) {
    if (baseAddress(admin) === base) return true;
  }
  return false;
}

export function isInternalAnalyticsUser(user: Pick<User, "email"> | null | undefined): boolean {
  return canAccessPlatformAdmin(user) || isInternalAnalyticsEmail(user?.email);
}
