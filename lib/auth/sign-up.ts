import { createClient } from "@/lib/supabase/client";
import type { AuthSessionResult, SignUpInput } from "./types";

export async function signUp(input: SignUpInput): Promise<AuthSessionResult> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: input.fullName ? { full_name: input.fullName } : undefined,
    },
  });

  return {
    data: data.session,
    error,
  };
}
