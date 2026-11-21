import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Is migration 214 applied?
 *
 * The code ships before the owner runs the migration (he runs every
 * production migration himself). Until then the directory must work exactly
 * as it did: the plain phase-1 form and pages, nothing that reads or writes
 * the new columns, tables, functions or storage buckets. Every phase-2 path
 * asks this one question first.
 *
 * The answer is one tiny read of three new columns, remembered for a minute
 * so pages do not ask on every request; within a minute of the migration
 * running, the new features switch on by themselves. An outage (any error
 * that is not "this does not exist") reads as "not installed" without being
 * remembered, so the safe phase-1 behaviour is used and the next request
 * asks again.
 */

const TTL_MS = 60_000;
let remembered: { value: boolean; at: number } | null = null;

/** Postgres / PostgREST answers that mean a table, column or function is missing. */
export function isNotInstalled(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    error.code === "42883" ||
    error.code === "PGRST202" ||
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    /does not exist|Could not find the/i.test(error.message ?? "")
  );
}

export async function isDirectory214Installed(): Promise<boolean> {
  if (remembered && Date.now() - remembered.at < TTL_MS) return remembered.value;
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("directory_listings").select("source, services, pending_media").limit(1);
    if (!error) {
      remembered = { value: true, at: Date.now() };
      return true;
    }
    if (isNotInstalled(error)) {
      remembered = { value: false, at: Date.now() };
      return false;
    }
    return false;
  } catch {
    return false;
  }
}
