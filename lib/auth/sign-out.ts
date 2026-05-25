import { createClient } from "@/lib/supabase/client";

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  return { error };
}

export async function signOutServer() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  return { error };
}
