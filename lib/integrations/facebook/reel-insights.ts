import "server-only";

/**
 * Organic Reel insights reads. PUBLISHING IS NOT TOUCHED BY THIS FILE.
 *
 * Two edges, both read-only, both `period=lifetime`:
 *
 *   Facebook   GET /{video-id}/video_insights?metric=...
 *   Instagram  GET /{ig-media-id}/insights?metric=...
 *
 * Addressed in both cases by the delivery's `providerPostId` — for a Facebook
 * Reel that value IS the video id (reels.ts:294 returns it as both), and for
 * Instagram it is the published media id rather than the upload container.
 *
 * The token and the account come from the same helpers the publish path uses.
 * Nothing here writes, claims, settles or publishes.
 */
import { getFacebookOAuthConfig } from "./env";
import { graphBaseUrl, readFacebookJson } from "./graph";
import {
  classifyInsightsFailure,
  metricsFor,
  normalizeInsightsPayload,
  type CollectedMetric,
  type InsightsFailureKind,
  type InsightsProvider,
} from "@/shared/types/marketing-insights";

export type ReelInsightsResult =
  | { readonly ok: true; readonly metrics: CollectedMetric[] }
  | { readonly ok: false; readonly kind: InsightsFailureKind; readonly detail: string };

type GraphErrorShape = {
  error?: { code?: number; error_subcode?: number; message?: string };
};

/**
 * One insights read.
 *
 * Returns a typed failure rather than throwing, because the caller's whole job
 * is to keep going: one Reel too fresh to have numbers must not stop the other
 * nine from being collected.
 */
export async function fetchReelInsights(input: {
  provider: InsightsProvider;
  providerPostId: string;
  accessToken: string;
}): Promise<ReelInsightsResult> {
  const providerPostId = input.providerPostId.trim();
  const accessToken = input.accessToken.trim();
  if (!providerPostId || !accessToken) {
    return { ok: false, kind: "unknown", detail: "missing provider post id or access token" };
  }

  const config = getFacebookOAuthConfig();
  const edge = input.provider === "facebook" ? "video_insights" : "insights";
  const url = new URL(
    `${graphBaseUrl(config.graphApiVersion)}/${encodeURIComponent(providerPostId)}/${edge}`,
  );
  url.searchParams.set("metric", metricsFor(input.provider).join(","));
  url.searchParams.set("period", "lifetime");
  url.searchParams.set("access_token", accessToken);

  let payload: unknown;
  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    payload = await readFacebookJson<unknown>(
      response,
      `${input.provider} Reel insights`,
    );
  } catch (error) {
    // readFacebookJson throws on a Graph error body. Recover the code from the
    // message rather than losing the classification: a fresh post and a broken
    // token must not be reported the same way.
    const detail = error instanceof Error ? error.message : String(error);
    const body = (error as { body?: GraphErrorShape } | undefined)?.body;
    const kind = classifyInsightsFailure({
      code: body?.error?.code ?? codeFromMessage(detail),
      subcode: body?.error?.error_subcode,
      message: detail,
    });
    return { ok: false, kind, detail };
  }

  const metrics = normalizeInsightsPayload(payload);
  if (metrics.length === 0) {
    // Graph answers a too-fresh Reel with an empty data array and HTTP 200.
    return { ok: false, kind: "not_ready", detail: "no metric values returned yet" };
  }
  return { ok: true, metrics };
}

/** `(#100) Unsupported...` / `code: 190` — best-effort, and honest when absent. */
function codeFromMessage(message: string): number | undefined {
  const paren = /\(#(\d+)\)/.exec(message);
  if (paren) return Number(paren[1]);
  const code = /"?code"?\s*[:=]\s*(\d+)/.exec(message);
  return code ? Number(code[1]) : undefined;
}
