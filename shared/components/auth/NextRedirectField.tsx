"use client";

import { useSearchParams } from "next/navigation";
import { sanitizeNextPath } from "@/lib/auth/redirects";

export function NextRedirectField() {
  const searchParams = useSearchParams();
  const next = sanitizeNextPath(searchParams.get("next"));

  if (!next) {
    return null;
  }

  return <input type="hidden" name="next" value={next} />;
}
