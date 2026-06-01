import { notFound } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/database/auth";

/** Server-only allowlist for internal platform admin (V1). */
const PLATFORM_ADMIN_EMAILS = new Set(
  ["altairhvac@gmail.com"].map((email) => email.trim().toLowerCase()),
);

export function canAccessPlatformAdmin(
  user: Pick<User, "email"> | null | undefined,
): boolean {
  const email = user?.email?.trim().toLowerCase();

  if (!email) {
    return false;
  }

  return PLATFORM_ADMIN_EMAILS.has(email);
}

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
