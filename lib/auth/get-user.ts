import { createClient } from "@/lib/supabase/server";
import type { AuthUserResult } from "./types";

export async function getUser(): Promise<AuthUserResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  return {
    data: data.user,
    error,
  };
}

export async function getOptionalUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}
