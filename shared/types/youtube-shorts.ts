/**
 * YouTube Shorts eligibility — decided from the rendered asset's measured
 * facts, never from a filename, a hashtag, or hope.
 *
 * ============ WHAT "ELIGIBLE" MEANS AND DOES NOT MEAN ============
 * YouTube classifies a video as a Short from the video itself: a "square or
 * vertical aspect ratio" (height ≥ width) and within the Shorts duration
 * ceiling — Google's own phrasing, verified against the current primary
 * Shorts documentation on 2026-09-06. There is
 * no upload flag, and the Data API uploads Shorts exactly like any video.
 * So this module answers the only question the ASSET can answer — "is this
 * render technically shaped like a Short?" — with the evidence used.
 * It deliberately promises nothing about the Shorts FEED: distribution is
 * YouTube's call, and claiming otherwise would be the pipeline lying again.
 *
 * ============ WHY A TRI-STATE VERDICT ============
 * Width/height/duration are nullable on `marketing_media_assets` — the
 * transport reports them, and older rows may predate that. A missing fact
 * makes the answer UNKNOWN, listed by name, rather than a guess in either
 * direction: "unknown" sends someone to look at the render, "no" sends them
 * to re-render, and conflating the two wastes the difference.
 *
 * Codec/container/frame-rate are NOT stored locally and are therefore not
 * judged here — post-upload, YouTube's own `fileDetails` readback is the
 * authority on those (the private diagnostic verified h264/aac/30fps that
 * way). This module states that boundary instead of pretending to see
 * deeper than the columns go.
 *
 * Pure and dependency-free, like the connection state machine and for the
 * same reason: every branch is testable without a render in hand.
 */

/**
 * The Shorts duration ceiling. YouTube raised it from 60 seconds to
 * 3 minutes for uploads from 2024-10-15; the constant is named so a future
 * policy change is a one-line edit with the verifier pinning the rest.
 */
export const YOUTUBE_SHORT_MAX_DURATION_MS = 180_000;

/** Square counts: the requirement is height >= width, not strictly taller. */
export const YOUTUBE_SHORT_MIN_ASPECT = 1.0;

export type YouTubeShortAssetFacts = {
  readonly contentType: string;
  readonly durationMs: number | null;
  readonly widthPx: number | null;
  readonly heightPx: number | null;
};

export type YouTubeShortVerdict = "eligible" | "ineligible" | "unknown";

export type YouTubeShortEligibility = {
  readonly verdict: YouTubeShortVerdict;
  /** Operator-facing sentences; every verdict carries at least one. */
  readonly reasons: readonly string[];
  /** What the decision could and could not see, for the draft record. */
  readonly checked: {
    readonly duration: boolean;
    readonly aspect: boolean;
  };
};

export function decideYouTubeShortEligibility(
  asset: YouTubeShortAssetFacts,
): YouTubeShortEligibility {
  const reasons: string[] = [];

  if (!asset.contentType.startsWith("video/")) {
    return {
      verdict: "ineligible",
      reasons: ["The asset is not a video."],
      checked: { duration: false, aspect: false },
    };
  }

  const durationKnown =
    asset.durationMs != null &&
    Number.isFinite(asset.durationMs) &&
    asset.durationMs > 0;
  const aspectKnown =
    asset.widthPx != null &&
    asset.heightPx != null &&
    Number.isFinite(asset.widthPx) &&
    Number.isFinite(asset.heightPx) &&
    asset.widthPx > 0 &&
    asset.heightPx > 0;

  let failed = false;

  if (durationKnown) {
    if ((asset.durationMs as number) > YOUTUBE_SHORT_MAX_DURATION_MS) {
      failed = true;
      reasons.push(
        `At ${Math.round((asset.durationMs as number) / 1000)}s it is longer than the ${YOUTUBE_SHORT_MAX_DURATION_MS / 1000}s Shorts ceiling — it would upload as a regular video.`,
      );
    }
  } else {
    reasons.push("The render's duration was not recorded, so it could not be checked.");
  }

  if (aspectKnown) {
    const ratio = (asset.heightPx as number) / (asset.widthPx as number);
    if (ratio < YOUTUBE_SHORT_MIN_ASPECT) {
      failed = true;
      reasons.push(
        `At ${asset.widthPx}×${asset.heightPx} it is wider than tall — Shorts must be square or vertical.`,
      );
    }
  } else {
    reasons.push("The render's dimensions were not recorded, so aspect could not be checked.");
  }

  if (failed) {
    // A definite failure outranks any unknown: no missing fact can turn a
    // 5-minute landscape video into a Short.
    return {
      verdict: "ineligible",
      reasons,
      checked: { duration: durationKnown, aspect: aspectKnown },
    };
  }

  if (!durationKnown || !aspectKnown) {
    return {
      verdict: "unknown",
      reasons,
      checked: { duration: durationKnown, aspect: aspectKnown },
    };
  }

  return {
    verdict: "eligible",
    reasons: [
      `${asset.widthPx}×${asset.heightPx}, ${Math.round((asset.durationMs as number) / 1000)}s — square-or-taller and within the Shorts ceiling.`,
    ],
    checked: { duration: true, aspect: true },
  };
}

/** One line for a card or a draft record. */
export function describeYouTubeShortEligibility(
  eligibility: YouTubeShortEligibility,
): string {
  switch (eligibility.verdict) {
    case "eligible":
      return `Shorts-shaped: ${eligibility.reasons[0] ?? ""}`.trim();
    case "ineligible":
      return `Not a Short: ${eligibility.reasons.join(" ")}`;
    case "unknown":
      return `Shorts eligibility unknown: ${eligibility.reasons.join(" ")}`;
  }
}
