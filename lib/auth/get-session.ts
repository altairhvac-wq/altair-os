import { createClient } from "@/lib/supabase/server";
import type { AuthSessionResult } from "./types";

export async function getSession(): Promise<AuthSessionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();

  return {
    data: data.session,
    error,
  };
}

export async function getOptionalSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}
