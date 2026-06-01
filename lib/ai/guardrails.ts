import "server-only";

import type { AiFeatureName } from "@/lib/ai/types";

/** Minimum seconds between AI requests for the same company/user/feature. */
const COOLDOWN_MS = 10_000;

/** Rolling window length for burst protection. */
const WINDOW_MS = 5 * 60_000;

/** Max requests per company/user/feature within the rolling window. */
const MAX_REQUESTS_PER_WINDOW = 10;

type RateLimitEntry = {
  lastRequestAt: number;
  windowStart: number;
  windowCount: number;
};

/**
 * V1 guardrail is process-local and intended to prevent accidental repeat clicks.
 * For production-scale enforcement, replace with DB/Redis-backed rate limiting.
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

function rateLimitKey(
  companyId: string,
  userId: string,
  feature: AiFeatureName,
): string {
  return `${companyId}:${userId}:${feature}`;
}

export type AiRateLimitCheck = { ok: true } | { ok: false; code: "rate_limited" };

/**
 * Enforce per-process cooldown and rolling-window limits before an AI request.
 * Records the attempt when allowed.
 */
export function checkAiRateLimit(params: {
  companyId: string;
  userId: string;
  feature: AiFeatureName;
}): AiRateLimitCheck {
  const key = rateLimitKey(params.companyId, params.userId, params.feature);
  const now = Date.now();
  let entry = rateLimitStore.get(key);

  if (!entry) {
    entry = { lastRequestAt: 0, windowStart: now, windowCount: 0 };
    rateLimitStore.set(key, entry);
  }

  if (entry.lastRequestAt > 0 && now - entry.lastRequestAt < COOLDOWN_MS) {
    return { ok: false, code: "rate_limited" };
  }

  if (now - entry.windowStart > WINDOW_MS) {
    entry.windowStart = now;
    entry.windowCount = 0;
  }

  if (entry.windowCount >= MAX_REQUESTS_PER_WINDOW) {
    return { ok: false, code: "rate_limited" };
  }

  entry.lastRequestAt = now;
  entry.windowCount += 1;
  return { ok: true };
}
