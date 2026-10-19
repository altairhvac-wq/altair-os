import {
  classifyChannel,
  deviceFromUserAgent,
  isBotUserAgent,
  isValidClientId,
  normalizeHost,
  type AnalyticsChannel,
} from "@/shared/lib/analytics/attribution";
import {
  isAnalyticsRecordingEnabled,
  recordAnalyticsEvent,
} from "@/lib/analytics/server-events";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin-emails";
import {
  enforcePublicRateLimit,
  resolveRequestAddress,
} from "@/lib/security/public-rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * First-party analytics beacon (migration 202).
 *
 * Public at the middleware layer (exact path only) because anonymous visitors
 * send it. It always answers 204 with no body, whatever happens: a beacon has
 * no reader, and distinguishing outcomes would only tell a scraper what was
 * accepted.
 *
 * What is refused before anything is written:
 *   - recording disabled (any non-production deployment, unless explicitly
 *     enabled for a test project);
 *   - a cross-site Origin (the beacon is same-origin only);
 *   - bots and headless browsers;
 *   - oversized or malformed bodies, unknown event names, bad ids;
 *   - more than the per-address allowance (public.analytics_collect);
 *   - platform admins: the owner's own browsing never counts.
 *
 * signup_completed is NOT accepted here: only the signup action records it.
 */

const NO_CONTENT = () => new Response(null, { status: 204 });
const CLIENT_EVENTS = new Set(["pageview", "signup_started"]);
const CHANNELS = new Set<AnalyticsChannel>([
  "direct", "search", "social", "email", "paid", "referral", "internal", "unknown",
]);
const MAX_BODY = 4096;

/**
 * Browsers always send Origin on a POST fetch. When it is present it must
 * name exactly the host (and port) this request was sent to; an unparseable
 * Origin, or an Origin with no Host to compare against, is refused. A request
 * with no Origin at all is not a browser beacon from another site (that is
 * what this check exists to stop), so it falls through to the other checks.
 */
function isSameOriginBeacon(request: Request): boolean {
  const originHeader = request.headers.get("origin");
  if (!originHeader) return true;
  let originHost: string;
  try {
    originHost = new URL(originHeader).host.toLowerCase();
  } catch {
    return false;
  }
  const hostHeader = (request.headers.get("x-forwarded-host") ?? request.headers.get("host"))
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  return Boolean(hostHeader) && originHost === hostHeader;
}

function str(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (!isAnalyticsRecordingEnabled()) return NO_CONTENT();

    const userAgent = request.headers.get("user-agent");
    if (isBotUserAgent(userAgent)) return NO_CONTENT();

    if (!isSameOriginBeacon(request)) return NO_CONTENT();

    const text = await request.text();
    if (!text || text.length > MAX_BODY) return NO_CONTENT();

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return NO_CONTENT();
    }

    const event = body.event;
    if (typeof event !== "string" || !CLIENT_EVENTS.has(event)) return NO_CONTENT();
    if (!isValidClientId(body.visitorId) || !isValidClientId(body.eventId)) return NO_CONTENT();
    const path = typeof body.path === "string" ? body.path : null;
    if (!path || !path.startsWith("/")) return NO_CONTENT();

    const address = await resolveRequestAddress();
    const limit = await enforcePublicRateLimit("public.analytics_collect", { ip: address });
    if (!limit.allowed) return NO_CONTENT();

    // Signed-in visitors: product usage is attributed to the user; the owner's
    // own sessions are not recorded at all.
    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        if (canAccessPlatformAdmin(user)) return NO_CONTENT();
        userId = user.id;
      }
    } catch {
      // No session readable: treat as anonymous.
    }

    const referrerHost = normalizeHost(str(body.referrerHost, 255));
    const utm = {
      source: str(body.utmSource, 100)?.toLowerCase() ?? null,
      medium: str(body.utmMedium, 100)?.toLowerCase() ?? null,
      campaign: str(body.utmCampaign, 150),
      content: str(body.utmContent, 150),
      term: str(body.utmTerm, 150),
    };
    // Recomputed server-side; the client's label is only a hint.
    const clientChannel = typeof body.channel === "string" ? (body.channel as AnalyticsChannel) : null;
    const channel = classifyChannel({
      referrerHost,
      utmSource: utm.source,
      utmMedium: utm.medium,
    });

    await recordAnalyticsEvent({
      event: event as "pageview" | "signup_started",
      path,
      visitorId: body.visitorId as string,
      sessionId: typeof body.sessionId === "string" ? body.sessionId : null,
      eventId: body.eventId as string,
      isReturning: typeof body.isReturning === "boolean" ? body.isReturning : null,
      device: deviceFromUserAgent(userAgent),
      referrerHost,
      utm,
      channel: CHANNELS.has(channel) ? channel : (clientChannel && CHANNELS.has(clientChannel) ? clientChannel : "unknown"),
      userId,
    });
  } catch {
    // Swallowed by design: see the note above.
  }
  return NO_CONTENT();
}
