import "server-only";

import { captureMonitoredEvent } from "@/lib/operations/monitoring";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import type { DbClient } from "@/lib/database/db-client";
import type { AiFeatureName } from "@/lib/ai/types";

/**
 * AI admission control: short-window rate limiting and a monthly spend ceiling.
 *
 * ==================== WHAT THIS REPLACES ====================
 * This module used to hold a module-level `Map`. Its own comment admitted the
 * problem: "V1 guardrail is process-local and intended to prevent accidental
 * repeat clicks. For production-scale enforcement, replace with DB/Redis-backed
 * rate limiting."
 *
 * On Vercel every cold lambda starts with an empty Map, so the limit was
 * per-instance and effectively unenforced. There was no spend ceiling at all.
 *
 * State now lives in Postgres (migration 155) and the admission decision is one
 * row-locked call, so two instances cannot both see room for the last slot.
 *
 * ==================== WHY POSTGRES ====================
 * The load is a handful of calls per user per hour behind a ten-second
 * cooldown. Redis would add a second stateful dependency to operate, secure and
 * restore for no additional safety at this volume, and the codebase already has
 * a proven atomic-counter pattern from migration 148.
 *
 * ==================== FAILURE SEMANTICS, DELIBERATELY ASYMMETRIC ====================
 * The two checks protect different things and should fail differently:
 *
 *   SPEND CEILING  fails CLOSED. If it cannot be evaluated, refuse. An
 *                  unbounded bill on a shared provider key is worse than a
 *                  missing draft.
 *   SHORT WINDOW   fails OPEN. A transient database hiccup should not disable a
 *                  UI affordance, and the ceiling is still the real bound.
 *
 * Because both live in one RPC, an RPC failure is treated as a ceiling failure —
 * the stricter of the two. Every degraded path raises a monitored event, so
 * "the limiter is broken" cannot be a silent state the way the old Map was.
 */

/** Minimum seconds between AI requests for the same company/user/feature. */
const COOLDOWN_SECONDS = 10;

/** Rolling window length for burst protection, in seconds. */
const WINDOW_SECONDS = 5 * 60;

/** Max requests per company/user/feature within the rolling window. */
const MAX_REQUESTS_PER_WINDOW = 10;

/**
 * Platform default monthly token ceiling per company, used when
 * company_ai_limits has no row.
 *
 * A NULL ceiling in that table means "use this default", never "unlimited", so
 * a company nobody has configured cannot spend without bound. Roughly a few
 * dollars a month on gpt-4o-mini — generous for drafting, small enough that a
 * runaway loop is capped long before it matters.
 */
const DEFAULT_MONTHLY_TOKEN_CEILING = 2_000_000;

const MONTHLY_CEILING_ENV = "AI_MONTHLY_TOKEN_CEILING";

function resolveDefaultMonthlyCeiling(): number {
  const raw = process.env[MONTHLY_CEILING_ENV]?.trim();
  if (!raw) return DEFAULT_MONTHLY_TOKEN_CEILING;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MONTHLY_TOKEN_CEILING;
  return parsed;
}

export type AiRateLimitCheck =
  | { ok: true; monthlyTokensUsed: number; monthlyTokenCeiling: number | null }
  | { ok: false; code: "rate_limited" | "monthly_ceiling_reached" };

type CheckInput = {
  companyId: string;
  userId: string;
  feature: AiFeatureName;
};

type AdmissionPayload = {
  allowed?: boolean;
  reason?: string | null;
  monthlyTokensUsed?: number | string | null;
  monthlyTokenCeiling?: number | string | null;
};

function toNumber(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/**
 * Admission check before an AI request.
 *
 * Now async and durable. The `userId` argument is retained for the call-site
 * contract and for logging, but the database derives the actor from
 * `auth.uid()` — a client-supplied user id must never be able to choose whose
 * budget is spent.
 */
export async function checkAiRateLimit(
  params: CheckInput,
  db?: DbClient,
): Promise<AiRateLimitCheck> {
  // The USER-SCOPED client, not the service-role one.
  //
  // check_and_record_ai_request derives the actor from auth.uid() and raises
  // insufficient_permission when it is null — deliberately, because a
  // client-supplied user id must never be able to choose whose budget is spent.
  // The service-role client has no auth.uid(), so calling it that way refused
  // EVERY request; and since the ceiling fails closed, each refusal surfaced to
  // the user as "monthly ceiling reached". Every caller is a server action with
  // a real session, so this is the correct client.
  //
  // Injectable so the cross-instance verification can drive this function with
  // two independently authenticated clients rather than a copy of it.
  const supabase = db ?? (await createClient());
  const ceiling = resolveDefaultMonthlyCeiling();

  const { data, error } = await supabase.rpc("check_and_record_ai_request", {
    p_company_id: params.companyId,
    p_feature: params.feature,
    p_cooldown_seconds: COOLDOWN_SECONDS,
    p_window_seconds: WINDOW_SECONDS,
    p_window_limit: MAX_REQUESTS_PER_WINDOW,
    p_default_monthly_token_ceiling: ceiling,
  });

  if (error) {
    // Fail CLOSED. The ceiling and the window share one call, so an RPC failure
    // means the ceiling is unevaluated — and an unbounded bill is the worse of
    // the two outcomes.
    console.error("[checkAiRateLimit] admission rpc failed:", {
      companyId: params.companyId,
      feature: params.feature,
      code: error.code,
      message: error.message,
    });
    captureMonitoredEvent({
      event: "ai.admission_check_failed",
      level: "error",
      companyId: params.companyId,
      meta: { feature: params.feature, code: error.code },
    });
    return { ok: false, code: "monthly_ceiling_reached" };
  }

  const payload = (data ?? {}) as AdmissionPayload;

  if (payload.allowed === true) {
    return {
      ok: true,
      monthlyTokensUsed: toNumber(payload.monthlyTokensUsed),
      monthlyTokenCeiling:
        payload.monthlyTokenCeiling == null
          ? null
          : toNumber(payload.monthlyTokenCeiling),
    };
  }

  if (payload.reason === "monthly_ceiling_reached") {
    // Worth an alert: a company hitting its ceiling is either growing or
    // looping, and both are things someone should see rather than discover on
    // an invoice.
    captureMonitoredEvent({
      event: "ai.monthly_ceiling_reached",
      level: "warning",
      companyId: params.companyId,
      meta: {
        feature: params.feature,
        monthlyTokensUsed: toNumber(payload.monthlyTokensUsed),
        monthlyTokenCeiling: toNumber(payload.monthlyTokenCeiling),
      },
    });
    return { ok: false, code: "monthly_ceiling_reached" };
  }

  // cooldown and rate_limited both surface as the existing user-facing message.
  return { ok: false, code: "rate_limited" };
}

/**
 * Records what a completed AI request cost.
 *
 * Best-effort by design: a usage row that fails to write must not fail the
 * request the user already paid for and received. The loss is visible — the
 * failure is reported — and the ceiling is a monthly bound, so one missing row
 * cannot meaningfully defeat it.
 *
 * Records tokens, model, feature and actor. Never prompt or completion text;
 * migration 155 has no column for either.
 */
export async function recordAiUsage(
  input: {
    companyId: string;
    feature: AiFeatureName;
    model?: string | null;
    promptTokens?: number | null;
    completionTokens?: number | null;
  },
  db?: DbClient,
): Promise<void> {
  const promptTokens = Math.max(0, Math.floor(input.promptTokens ?? 0));
  const completionTokens = Math.max(0, Math.floor(input.completionTokens ?? 0));

  if (promptTokens === 0 && completionTokens === 0) {
    // The provider returned no usage. Nothing to account for.
    return;
  }

  // Service-role by default: record_ai_usage deliberately accepts a null actor
  // for the cron-driven marketing path, which has no session. Injectable so a
  // test can attribute usage to a specific signed-in user.
  const supabase = db ?? createServiceRoleClient();
  const { error } = await supabase.rpc("record_ai_usage", {
    p_company_id: input.companyId,
    p_feature: input.feature,
    p_model: input.model ?? null,
    p_prompt_tokens: promptTokens,
    p_completion_tokens: completionTokens,
  });

  if (error) {
    console.error("[recordAiUsage] failed:", {
      companyId: input.companyId,
      feature: input.feature,
      code: error.code,
      message: error.message,
    });
    captureMonitoredEvent({
      event: "ai.usage_record_failed",
      level: "warning",
      companyId: input.companyId,
      meta: { feature: input.feature, code: error.code },
    });
  }
}
