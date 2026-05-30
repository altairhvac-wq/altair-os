import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";

/**
 * Server-only Supabase client using the service role key.
 * Use only after the caller has authorized the action in application code
 * (e.g. post-completion draft invoice automation).
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for server-side billing automation.",
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
