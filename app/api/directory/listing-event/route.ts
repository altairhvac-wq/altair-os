import { isAnalyticsRecordingEnabled } from "@/lib/analytics/server-events";
import { isDirectory214Installed } from "@/lib/directory/schema";
import { recordListingEvent } from "@/lib/directory/stats";
import { enforcePublicRateLimit, resolveRequestAddress } from "@/lib/security/public-rate-limit";
import { isBotUserAgent } from "@/shared/lib/analytics/attribution";
import { isDirectoryListingEvent, isValidListingSlug } from "@/shared/types/directory";

export const runtime = "nodejs";

/**
 * Counts one view or tap on a published directory listing, for the
 * business's own numbers (migration 214).
 *
 * Public: a visitor has no account. It accepts a slug and one of four words
 * and nothing else, and it stores only a counter increment (no address, no
 * device, no visitor id). The address is used for the rate limit only, as a
 * keyed hash, the same as the site's visit counter.
 *
 * Refused quietly (204, nothing stored): bots, posts from another site,
 * anything but production (so previews and local runs never touch real
 * numbers), malformed bodies, and anyone over the rate limit. Always 204, so
 * the answer says nothing about whether a slug exists.
 */

const NO_CONTENT = () => new Response(null, { status: 204 });
const MAX_BODY = 512;

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host.toLowerCase();
    const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host"))?.split(",")[0]?.trim().toLowerCase();
    return Boolean(host) && originHost === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (!isAnalyticsRecordingEnabled()) return NO_CONTENT();
    if (isBotUserAgent(request.headers.get("user-agent"))) return NO_CONTENT();
    if (!isSameOrigin(request)) return NO_CONTENT();

    const text = await request.text();
    if (!text || text.length > MAX_BODY) return NO_CONTENT();
    let body: { slug?: unknown; event?: unknown };
    try {
      body = JSON.parse(text) as { slug?: unknown; event?: unknown };
    } catch {
      return NO_CONTENT();
    }
    if (!isValidListingSlug(body.slug) || !isDirectoryListingEvent(body.event)) return NO_CONTENT();

    const limit = await enforcePublicRateLimit("public.analytics_collect", { ip: await resolveRequestAddress() });
    if (!limit.allowed) return NO_CONTENT();

    // Before migration 214 there is nowhere to count: a quiet no-op.
    if (!(await isDirectory214Installed())) return NO_CONTENT();
    await recordListingEvent(body.slug, body.event);
    return NO_CONTENT();
  } catch {
    return NO_CONTENT();
  }
}
