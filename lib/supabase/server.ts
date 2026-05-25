import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database/types";
import { getSupabaseEnv } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
        }),
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies; middleware handles refresh.
        }
      },
    },
  });
}
