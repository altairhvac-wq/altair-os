import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";
import { getSupabaseEnv } from "./env";

/**
 * Supabase client for one-off auth email calls from server actions.
 * Uses implicit flow so password recovery emails use token_hash links and do
 * not depend on PKCE code-verifier cookies set during the form submit.
 */
export function createAuthEmailClient() {
  const { url, anonKey } = getSupabaseEnv();

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
