import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";
import { createClient } from "@/lib/supabase/server";

export type DbClient = SupabaseClient<Database>;

export async function resolveDbClient(client?: DbClient): Promise<DbClient> {
  return client ?? (await createClient());
}
