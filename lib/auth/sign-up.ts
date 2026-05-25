import { createClient } from "@/lib/supabase/client";
import type { AuthSessionResult, SignUpInput } from "./types";

export async function signUp(input: SignUpInput): Promise<AuthSessionResult> {
  const supabase = createClient();
  const metadata: Record<string, string> = {};

  if (input.fullName) {
    metadata.full_name = input.fullName;
  }

  if (input.companyName) {
    metadata.company_name = input.companyName;
  }

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: Object.keys(metadata).length > 0 ? metadata : undefined,
    },
  });

  return {
    data: data.session,
    error,
  };
}
