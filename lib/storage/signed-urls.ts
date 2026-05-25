import { createClient } from "@/lib/supabase/server";
import {
  COMPANY_FILES_BUCKET,
  SIGNED_URL_TTL_SECONDS,
} from "@/lib/storage/company-files";

export async function createSignedUrlsForPaths(
  paths: string[],
): Promise<Map<string, string>> {
  const uniquePaths = [...new Set(paths.filter(Boolean))];

  if (uniquePaths.length === 0) {
    return new Map();
  }

  const supabase = await createClient();
  const entries = await Promise.all(
    uniquePaths.map(async (path) => {
      const { data, error } = await supabase.storage
        .from(COMPANY_FILES_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

      if (error || !data?.signedUrl) {
        console.error("[createSignedUrlsForPaths] failed:", {
          path,
          code: error?.name,
          message: error?.message,
        });
        return [path, ""] as const;
      }

      return [path, data.signedUrl] as const;
    }),
  );

  return new Map(entries.filter(([, url]) => url.length > 0));
}
