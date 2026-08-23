import "server-only";

/**
 * Organic Reel insights reads. PUBLISHING IS NOT TOUCHED BY THIS FILE.
 *
 * Two edges, both read-only. The metrics are lifetime by definition, which is
 * a property of the metrics and NOT a `period` parameter to send:
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
import { FacebookGraphError, graphBaseUrl, readFacebookJson } from "./graph";
import {
  classifyInsightsFailure,
  keepKnownMetrics,
  metricRequestFor,
  normalizeInsightsPayload,
  type CollectedMetric,
  type InsightsFailureKind,
  type InsightsProvider,
} from "@/shared/types/marketing-insights";

export type ReelInsightsResult =
  | { readonly ok: true; readonly metrics: CollectedMetric[]; readonly endpoint: string }
  | {
      readonly ok: false;
      readonly kind: InsightsFailureKind;
      readonly detail: string;
      readonly endpoint: string;
      /** Meta's own numbers, so a diagnosis never has to be inferred from prose. */
      readonly code?: number;
      readonly subcode?: number;
      /** The metric Meta named as invalid, when it named one. */
      readonly offendingMetric?: string;
    };

/**
 * `(#100) Tried accessing nonexisting field (blue_reels_play_count) on node ...`
 *
 * One bad name fails the WHOLE request, which blinds the collector for every
 * post on that provider. Meta says which name; surfacing it turns a permanent
 * silent outage into a one-line fix.
 */
function offendingMetricFrom(message: string): string | undefined {
  const field = /nonexisting field \(([^)]+)\)/.exec(message)?.[1];
  if (field) return field;
  return /metric\[0\] must be one of|Invalid metric|unsupported metric/i.test(message)
    ? /\b([a-z_]{4,})\b(?=[^a-z_]*$)/.exec(message)?.[1]
    : undefined;
}

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
    return {
      ok: false,
      kind: "unknown",
      detail: "missing provider post id or access token",
      endpoint: "(not attempted)",
    };
  }

  const config = getFacebookOAuthConfig();
  const edge = input.provider === "facebook" ? "video_insights" : "insights";
  const url = new URL(
    `${graphBaseUrl(config.graphApiVersion)}/${encodeURIComponent(providerPostId)}/${edge}`,
  );
  const requested = metricRequestFor(input.provider);
  if (requested) url.searchParams.set("metric", requested.join(","));
  // ==================== NO `period` PARAMETER ====================
  // The first version sent `period=lifetime`. It is not a parameter of either
  // edge: Instagram media insights takes `media_id` and `metric` only, and
  // these Reels metrics are lifetime by definition rather than by request.
  // `period` IS a real parameter on ACCOUNT insights, so Graph recognised the
  // name, rejected the combination, and failed the whole call with code 100 —
  // which this collector then read as "this Reel is too new". Every post would
  // have stayed notReady forever, and nothing would ever have looked broken.
  url.searchParams.set("access_token", accessToken);

  // For the diagnostics. The token is set on the URL above and must never
  // reach a log, so this is rebuilt from the parts that are safe to print.
  const endpoint = `GET /${providerPostId}/${edge}${requested ? `?metric=${requested.join(",")}` : " (all available metrics)"}`;

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
    const detail = error instanceof Error ? error.message : String(error);
    // Meta's own code, now that readFacebookJson preserves it. The message
    // regex remains only as a fallback for a non-Graph failure.
    const graph = error instanceof FacebookGraphError ? error : null;
    const code = graph?.code ?? codeFromMessage(detail);
    const kind = classifyInsightsFailure({
      code,
      subcode: graph?.subcode,
      message: detail,
    });
    const offending = offendingMetricFrom(detail);
    return {
      ok: false,
      kind,
      detail,
      endpoint,
      ...(code === undefined ? {} : { code }),
      ...(graph?.subcode === undefined ? {} : { subcode: graph.subcode }),
      ...(offending ? { offendingMetric: offending } : {}),
    };
  }

  // Meta may return more than we understand (Facebook returns everything when
  // `metric` is omitted). Keep only the known vocabulary — a retention graph is
  // a real measurement and still not a number this system can store honestly.
  const metrics = keepKnownMetrics(input.provider, normalizeInsightsPayload(payload));
  if (metrics.length === 0) {
    // Graph answers a too-fresh Reel with an empty data array and HTTP 200.
    return { ok: false, kind: "not_ready", detail: "HTTP 200 with an empty data array", endpoint };
  }
  return { ok: true, metrics, endpoint };
}

/** `(#100) Unsupported...` / `code: 190` — best-effort, and honest when absent. */
function codeFromMessage(message: string): number | undefined {
  const paren = /\(#(\d+)\)/.exec(message);
  if (paren) return Number(paren[1]);
  const code = /"?code"?\s*[:=]\s*(\d+)/.exec(message);
  return code ? Number(code[1]) : undefined;
}
