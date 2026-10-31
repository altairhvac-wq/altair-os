import "server-only";

import { enforcePublicRateLimit } from "@/lib/security/public-rate-limit";

/**
 * Too many never-seen browsers from one address in ten minutes is a tool
 * opening the site in fresh profiles (a link checker, a crawler), not a
 * crowd: on 2026-10-27 one such run registered 52 "new visitors" in three
 * minutes. The first pageview of such a browser is dropped, so it never
 * enters the figures. Its own function so the public-surface verifier can
 * see the scope has exactly one call site.
 */
export async function enforceNewVisitorBurstLimit(address: string | null): Promise<boolean> {
  const decision = await enforcePublicRateLimit("public.analytics_new_visitor", { ip: address });
  return decision.allowed;
}
