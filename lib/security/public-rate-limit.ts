import "server-only";

import { createHash, createHmac } from "node:crypto";
import { headers } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { captureMonitoredEvent } from "@/lib/operations/monitoring";

/**
 * Durable rate limiting for surfaces with no session.
 *
 * ============================== WHY IT IS NOT IN MEMORY ==============================
 * The application runs serverless. A module-scope counter is per-instance, and
 * instances are created and discarded per request burst -- so an in-memory
 * limiter is defeated by ordinary concurrency, not by an attack. The counter
 * lives in Postgres and is advanced by one atomic statement (migration 173).
 *
 * ============================== WHY NOTHING IDENTIFYING IS STORED ==============================
 * The table holds a HASH of the subject. An address, an email or a token never
 * reaches it. A dump of the table says which buckets were busy and nothing at
 * all about who was in them, which is the right amount of information for a
 * control whose only job is to make brute force impractical.
 *
 * PUBLIC_RATE_LIMIT_HASH_SECRET turns the hash into an HMAC. Without it the
 * hash is a plain SHA-256, which still means the raw value is not stored, but
 * an attacker who already holds the database could confirm a GUESSED email by
 * hashing it. Set it in production; the absence is a weaker property, not a
 * broken one, so it does not fail the request.
 *
 * ============================== WHY IT FAILS OPEN ==============================
 * If the check itself errors -- the database is unreachable, the migration is
 * not applied -- the request proceeds and a monitored event is raised. Failing
 * closed would turn a database blip into "nobody can sign in", which is a
 * larger outage than the one the limiter prevents. That is a deliberate trade
 * and it is why the failure is reported rather than swallowed.
 */

const HASH_SECRET_ENV = "PUBLIC_RATE_LIMIT_HASH_SECRET";

export type PublicRateLimitScope =
  | "auth.login"
  | "auth.signup"
  | "auth.password_reset_request"
  | "auth.password_update"
  | "auth.invite_accept"
  | "public.estimate_approval"
  | "public.invoice_checkout"
  | "public.token_view";

export type PublicRateLimitDimension = "ip" | "email" | "token";

export type PublicRateLimitRule = {
  dimension: PublicRateLimitDimension;
  windowSeconds: number;
  limit: number;
};

/**
 * The limits, per surface.
 *
 * Two dimensions where both matter: the identity dimension stops one target
 * being hammered from many addresses, and the address dimension stops one
 * address working through many targets. Either alone leaves the other open.
 *
 * The numbers are deliberately generous for a person and hostile to a script.
 * A customer approving an estimate does it once; ten attempts in an hour is
 * already a misbehaving client.
 */
export const PUBLIC_RATE_LIMITS: Record<
  PublicRateLimitScope,
  PublicRateLimitRule[]
> = {
  "auth.login": [
    { dimension: "email", windowSeconds: 900, limit: 10 },
    { dimension: "ip", windowSeconds: 900, limit: 50 },
  ],
  "auth.signup": [{ dimension: "ip", windowSeconds: 3600, limit: 5 }],
  "auth.password_reset_request": [
    // Mail is sent to the address, so the address dimension is the one that
    // stops someone else's inbox being used as a weapon.
    { dimension: "email", windowSeconds: 3600, limit: 5 },
    { dimension: "ip", windowSeconds: 3600, limit: 20 },
  ],
  "auth.password_update": [{ dimension: "ip", windowSeconds: 3600, limit: 15 }],
  "auth.invite_accept": [{ dimension: "ip", windowSeconds: 3600, limit: 20 }],
  "public.estimate_approval": [
    { dimension: "token", windowSeconds: 3600, limit: 10 },
    { dimension: "ip", windowSeconds: 3600, limit: 40 },
  ],
  "public.invoice_checkout": [
    { dimension: "token", windowSeconds: 3600, limit: 10 },
    { dimension: "ip", windowSeconds: 3600, limit: 40 },
  ],
  // Enumeration guard on the token pages. High enough that a customer
  // refreshing, or a link opening in a preview fetcher, never notices.
  "public.token_view": [{ dimension: "ip", windowSeconds: 900, limit: 200 }],
};

export type PublicRateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
  /** True when the check could not run; the request was allowed regardless. */
  degraded: boolean;
};

/**
 * A hash of the subject, never the subject.
 *
 * Namespaced so the same string used as two different kinds of subject cannot
 * collide into one bucket.
 *
 * Exported so the security audit trail hashes the same way.
 *
 * Two subsystems that hash the same email differently could not be correlated
 * with each other, which is most of the value of having both — "this address
 * was refused eleven times and then signed in" is only a sentence if the two
 * records share a key.
 */
export function hashAuditSubject(namespace: string, value: string): string {
  return hashWithNamespace(namespace, value);
}

function hashWithNamespace(namespace: string, value: string): string {
  const normalized =
    namespace === "email" || namespace === "subject"
      ? value.trim().toLowerCase()
      : value.trim();
  const material = `${namespace}:${normalized}`;
  const secret = process.env[HASH_SECRET_ENV]?.trim();

  return secret
    ? createHmac("sha256", secret).update(material).digest("hex")
    : createHash("sha256").update(material).digest("hex");
}

function hashSubject(
  dimension: PublicRateLimitDimension,
  value: string,
): string {
  return hashWithNamespace(dimension, value);
}

/**
 * The caller's address, as far as it can be known.
 *
 * x-forwarded-for is a list; the left-most entry is the original client and the
 * rest are proxies. On Vercel the header is set by the platform. It is returned
 * as an opaque string and hashed before it goes anywhere.
 *
 * When there is no header at all -- a direct local request -- every caller
 * shares the "unknown" bucket. That is the safe direction: an unattributable
 * request is limited more, not less.
 */
export async function resolveRequestAddress(): Promise<string> {
  try {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    const first = forwarded?.split(",")[0]?.trim();
    if (first) return first;
    return headerList.get("x-real-ip")?.trim() || "unknown";
  } catch {
    return "unknown";
  }
}

async function checkOne(
  scope: PublicRateLimitScope,
  rule: PublicRateLimitRule,
  subject: string,
): Promise<PublicRateLimitDecision> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase.rpc(
    "check_public_request_rate_limit",
    {
      p_scope: scope,
      p_dimension: rule.dimension,
      p_subject_hash: hashSubject(rule.dimension, subject),
      p_window_seconds: rule.windowSeconds,
      p_limit: rule.limit,
    },
  );

  if (error) {
    // Fails open, loudly. See the note at the top of the file.
    console.error("[publicRateLimit] check failed:", {
      scope,
      dimension: rule.dimension,
      code: error.code,
      message: error.message,
    });
    captureMonitoredEvent({
      event: "rate_limit.check_failed",
      meta: {
        scope,
        dimension: rule.dimension,
        code: error.code,
        likelyDeploymentFault:
          error.code === "42501" || error.code === "PGRST202",
      },
    });
    return { allowed: true, retryAfterSeconds: 0, degraded: true };
  }

  const result = data as unknown as {
    allowed?: boolean;
    retryAfterSeconds?: number;
  } | null;

  return {
    allowed: result?.allowed !== false,
    retryAfterSeconds: Number(result?.retryAfterSeconds ?? 0),
    degraded: false,
  };
}

/**
 * Applies every rule configured for a scope.
 *
 * All rules are evaluated even after one refuses, deliberately: each dimension
 * has its own counter, and skipping the rest would let an attacker keep one
 * dimension permanently at its limit while the others never advanced.
 */
export async function enforcePublicRateLimit(
  scope: PublicRateLimitScope,
  subjects: Partial<Record<PublicRateLimitDimension, string | null | undefined>>,
): Promise<PublicRateLimitDecision> {
  const rules = PUBLIC_RATE_LIMITS[scope];
  let refused: PublicRateLimitDecision | null = null;
  let degraded = false;

  for (const rule of rules) {
    const subject = subjects[rule.dimension];
    if (!subject) continue;

    const decision = await checkOne(scope, rule, subject);
    if (decision.degraded) degraded = true;
    if (!decision.allowed && !refused) refused = decision;
  }

  if (degraded) {
    // Recorded as its own fact rather than folded into the caller's result.
    // Every call site checks `allowed` and none checks `degraded`, so without
    // this a period with no rate limiting at all leaves no trace outside a
    // Sentry event that may not be configured.
    //
    // Imported lazily: lib/security/audit imports this module for its hashing,
    // and a top-level import would be a cycle.
    const { recordSecurityAuditEvent } = await import("@/lib/security/audit");
    await recordSecurityAuditEvent({
      event: "rate_limit.degraded",
      outcome: "failed",
      reason: "check_unavailable",
      metadata: { scope },
    });
  }

  if (refused) {
    captureMonitoredEvent({
      event: "rate_limit.refused",
      // Scope only. Which bucket refused is not recorded anywhere that could
      // reconstruct who it was.
      meta: { scope },
    });
    return { ...refused, degraded };
  }

  return { allowed: true, retryAfterSeconds: 0, degraded };
}

/** A user-facing message that leaks nothing about why. */
export function rateLimitMessage(decision: PublicRateLimitDecision): string {
  const minutes = Math.max(1, Math.ceil(decision.retryAfterSeconds / 60));
  return `Too many attempts. Please try again in about ${minutes} minute${
    minutes === 1 ? "" : "s"
  }.`;
}
