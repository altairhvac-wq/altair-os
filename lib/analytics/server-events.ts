import "server-only";

import { randomUUID } from "node:crypto";
import {
  classifyChannel,
  isValidClientId,
  sanitizePath,
  type AnalyticsAttribution,
  type AnalyticsChannel,
  type AnalyticsDevice,
} from "@/shared/lib/analytics/attribution";
import { hashAuditSubject } from "@/lib/security/public-rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Writes one row to web_analytics_events (migration 202) with the service
 * role. Callers have already decided the event may be recorded (production
 * host, not a bot, not a platform admin, privacy signals respected).
 *
 * Visitor and session ids are HMAC'd here with the same secret the rate
 * limiter and audit trail use (PUBLIC_RATE_LIMIT_HASH_SECRET), so the raw
 * browser id is never stored.
 *
 * Never throws: analytics must not break a page or a signup. When the table
 * does not exist yet (migration 202 not applied) the insert fails and is
 * logged once per process.
 */

export type ServerAnalyticsEvent = {
  event: "pageview" | "signup_started" | "signup_completed";
  path: string;
  visitorId: string;
  sessionId?: string | null;
  eventId?: string | null;
  isReturning?: boolean | null;
  device?: AnalyticsDevice;
  referrerHost?: string | null;
  utm?: Pick<AnalyticsAttribution, "source" | "medium" | "campaign" | "content" | "term">;
  channel?: AnalyticsChannel;
  userId?: string | null;
};

let warnedMissingTable = false;

/** Server-side switch: production only unless explicitly enabled for a test environment. */
export function isAnalyticsRecordingEnabled(): boolean {
  if (process.env.ANALYTICS_COLLECTION?.trim() === "off") return false;
  if (process.env.VERCEL_ENV === "production") return true;
  return process.env.ANALYTICS_RECORD_NON_PRODUCTION?.trim() === "1";
}

export async function recordAnalyticsEvent(input: ServerAnalyticsEvent): Promise<boolean> {
  if (!isValidClientId(input.visitorId)) return false;

  const utm = input.utm ?? { source: null, medium: null, campaign: null, content: null, term: null };
  const channel =
    input.channel ??
    classifyChannel({
      referrerHost: input.referrerHost ?? null,
      utmSource: utm.source,
      utmMedium: utm.medium,
    });

  const row = {
    event_name: input.event,
    path: sanitizePath(input.path),
    referrer_host: input.referrerHost ?? null,
    channel,
    utm_source: utm.source,
    utm_medium: utm.medium,
    utm_campaign: utm.campaign,
    utm_content: utm.content,
    utm_term: utm.term,
    visitor_hash: hashAuditSubject("analytics_visitor", input.visitorId),
    session_hash:
      input.sessionId && isValidClientId(input.sessionId)
        ? hashAuditSubject("analytics_session", input.sessionId)
        : null,
    device: input.device ?? "unknown",
    is_returning: input.isReturning ?? null,
    user_id: input.userId ?? null,
    dedupe_key:
      input.eventId && isValidClientId(input.eventId)
        ? `c:${input.eventId}`
        : `s:${randomUUID()}`,
  };

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from("web_analytics_events")
      .upsert(row, { onConflict: "dedupe_key", ignoreDuplicates: true });

    if (error) {
      if (!warnedMissingTable || error.code !== "PGRST205") {
        console.error("[analytics] insert failed:", { code: error.code, event: input.event });
      }
      if (error.code === "PGRST205" || error.code === "42P01") warnedMissingTable = true;
      return false;
    }
    return true;
  } catch (error) {
    console.error("[analytics] insert threw:", {
      event: input.event,
      error: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}

export type InternalVisitorReason = "platform_admin" | "internal_account" | "manual";

let warnedMissingInternalTable = false;

/**
 * Marks a browser as the owner's own (migration 206). Every event that browser
 * ever sent - before and after - is left out of the website figures, so the
 * owner's phone and laptop browsing, test signups and "did the deploy work"
 * checks never read as visitors. Only the HMAC of the browser id is stored.
 */
export async function markInternalVisitor(visitorId: string, reason: InternalVisitorReason): Promise<boolean> {
  if (!isValidClientId(visitorId)) return false;
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("web_analytics_internal_visitors").upsert(
      {
        visitor_hash: hashAuditSubject("analytics_visitor", visitorId),
        reason,
        last_marked_at: new Date().toISOString(),
      },
      { onConflict: "visitor_hash" },
    );
    if (error) {
      if (!warnedMissingInternalTable) {
        console.error("[analytics] internal mark failed:", { code: error.code });
      }
      if (error.code === "PGRST205" || error.code === "42P01") warnedMissingInternalTable = true;
      return false;
    }
    return true;
  } catch (error) {
    console.error("[analytics] internal mark threw:", { error: error instanceof Error ? error.message : "unknown" });
    return false;
  }
}
