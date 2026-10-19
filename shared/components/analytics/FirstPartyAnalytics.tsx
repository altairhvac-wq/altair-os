"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageview } from "@/shared/lib/analytics/client";

/**
 * First-party pageview tracking (migration 202). Mounted once in the root
 * layout so the marketing site, the auth pages and the product share one
 * count. Renders nothing. See shared/lib/analytics/client.ts for what is sent
 * and who is excluded.
 */
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    if (pathname) trackPageview(pathname, search);
  }, [pathname, search]);

  return null;
}

export function FirstPartyAnalytics() {
  return (
    <Suspense fallback={null}>
      <PageviewTracker />
    </Suspense>
  );
}
