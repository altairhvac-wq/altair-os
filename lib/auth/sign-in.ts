import { createClient } from "@/lib/supabase/client";
import type { AuthSessionResult, SignInWithPasswordInput } from "./types";

export async function signInWithPassword(
  input: SignInWithPasswordInput,
): Promise<AuthSessionResult> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  return {
    data: data.session,
    error,
  };
}
