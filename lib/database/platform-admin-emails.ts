import "server-only";

import type { User } from "@supabase/supabase-js";

/**
 * Server-only allowlist for internal platform admin (PLATFORM_ADMIN_EMAILS).
 *
 * Split out of lib/database/platform-admin.ts so modules that only need the
 * allowlist (analytics, ingest) do not pull in next/navigation. Behaviour is
 * unchanged; platform-admin.ts re-exports both functions.
 *
 * ==================== FAIL CLOSED ====================
 * A missing, empty, or entirely malformed value yields an EMPTY allowlist, and
 * an empty allowlist admits nobody. Entries are trimmed and lowercased;
 * anything that is not a plausible address is dropped rather than matched.
 */
const PLATFORM_ADMIN_EMAILS_ENV = "PLATFORM_ADMIN_EMAILS";

function isPlausibleEmail(value: string): boolean {
  if (!value || value.length > 320) return false;
  const parts = value.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain) return false;
  if (/\s/.test(value)) return false;
  return domain.includes(".") && !domain.startsWith(".") && !domain.endsWith(".");
}

export function getPlatformAdminEmails(): Set<string> {
  const raw = process.env[PLATFORM_ADMIN_EMAILS_ENV]?.trim();

  if (!raw) {
    return new Set();
  }

  const emails = raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(isPlausibleEmail);

  return new Set(emails);
}

/** True when at least one usable platform-admin address is configured. */
export function isPlatformAdminConfigured(): boolean {
  return getPlatformAdminEmails().size > 0;
}

export function canAccessPlatformAdmin(
  user: Pick<User, "email"> | null | undefined,
): boolean {
  const email = user?.email?.trim().toLowerCase();

  if (!email) {
    return false;
  }

  return getPlatformAdminEmails().has(email);
}
