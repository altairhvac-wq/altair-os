/**
 * Reel publishing — the decisions, none of the plumbing.
 *
 * ===================== WHY THIS FILE IS PURE =====================
 * No imports. Every rule below is a total function of values that are already
 * in hand: a stored media row, a status string a provider just returned, a URL
 * a provider just handed us. That makes the branches that matter most —
 * "Meta says this container is EXPIRED", "Meta handed back an upload host we
 * did not expect", "this video is landscape" — testable without a Graph token,
 * a database, or a publish.
 *
 * Same reasoning as `marketing-delivery.ts` and `marketing-media.ts`, and the
 * same consequence: `scripts/verify-marketing-reel.mjs` exercises all of it
 * and opens no socket.
 *
 * ================ WHAT A REEL IS, AND WHY IT IS DIFFERENT ================
 * A Reel is not a photo post with a different file attached. Meta will not
 * accept bytes inline on the publish call for either surface:
 *
 *   Facebook — a FOUR phase flow. `start` reserves a video id, the bytes go to
 *              a separate upload host, the video is processed asynchronously,
 *              and only then does `finish` publish it.
 *   Instagram — there is NO byte upload at all. Meta fetches a URL we supply,
 *              asynchronously, and we poll a container until it is ready.
 *
 * Both therefore need Meta to be able to REACH the video, which is the whole
 * reason the media bridge exists, and both need a bounded wait. The bound is
 * not a nicety: an unbounded wait inside a claimed delivery is how a claim
 * outlives its own grace period and turns into a reconciliation case for an
 * attempt that was still running.
 */

/* ------------------------------------------------------------ video shape */

/**
 * Meta's published Reel specification, mirrored by hand.
 *
 * Sources: developers.facebook.com/docs/video-api/guides/reels-publishing and
 * developers.facebook.com/docs/instagram-platform/content-publishing. These
 * are Meta's numbers, not ours — if they change, a publish starts failing at
 * the provider and this is the one place to correct.
 */
export const REEL_MIN_DURATION_MS = 3_000;
export const REEL_MAX_DURATION_MS = 90_000;
export const REEL_MIN_WIDTH_PX = 540;
export const REEL_MIN_HEIGHT_PX = 960;
export const REEL_CONTENT_TYPE = "video/mp4";

/**
 * How far from 9:16 a video may be and still be called vertical.
 *
 * Exactly 9/16 = 0.5625. The tolerance exists because an encoder that pads to
 * even dimensions can land a pixel or two off, and refusing 1080x1918 for
 * being 0.0011 away from the ideal would be pedantry that costs a real
 * publish. Anything landscape is nowhere near this window.
 */
export const REEL_ASPECT_RATIO = 9 / 16;
export const REEL_ASPECT_TOLERANCE = 0.02;

/* ---------------------------------------------------------- media gate */

export const REEL_MEDIA_DECISIONS = [
  /** Stored, and its reported shape is within Meta's Reel specification. */
  "READY",
  /**
   * Stored, but the render reported no dimensions or duration, so nothing can
   * be checked here. Publishing is still PERMITTED — see `mayAttemptReel`.
   */
  "SHAPE_UNKNOWN",
  /** No media reference on the post at all. */
  "NO_MEDIA",
  /** A row exists but the bytes are not confirmed present. */
  "NOT_STORED",
  /** The record belongs to another company. */
  "WRONG_COMPANY",
  /** Not an MP4. */
  "WRONG_CONTENT_TYPE",
  /** Landscape, or square, or otherwise not close enough to 9:16. */
  "NOT_VERTICAL",
  /** Below Meta's 540x960 floor. */
  "TOO_SMALL",
  /** Under three seconds. */
  "TOO_SHORT",
  /** Over ninety seconds. */
  "TOO_LONG",
] as const;
export type ReelMediaDecision = (typeof REEL_MEDIA_DECISIONS)[number];

/**
 * The subset of a media row this gate reads.
 *
 * Structural rather than imported, because this module has no imports. It is
 * satisfied by `MarketingMediaAsset` without a cast.
 */
export type ReelMediaFacts = {
  readonly companyId: string;
  readonly contentType: string;
  readonly uploadState: string;
  readonly widthPx: number | null;
  readonly heightPx: number | null;
  readonly durationMs: number | null;
};

/**
 * Whether this stored media may be offered to Meta as a Reel.
 *
 * ============== WHAT IS VERIFIED HERE AND WHAT IS NOT ==============
 * `contentType` and `uploadState` are facts: migration 144 reads content type
 * and byte size back from storage and refuses a completion that disagrees.
 * `widthPx`, `heightPx` and `durationMs` are NOT — they are what the editor
 * reported about its own render, carried so the control plane can describe a
 * video without fetching it. They are nullable on purpose.
 *
 * So this is a PRE-FLIGHT, not an authority. It exists to turn the common
 * mistake — pointing a Reel post at the landscape render — into an instant
 * local refusal instead of a round trip that fails at Meta three minutes
 * later. When the numbers are absent it says SHAPE_UNKNOWN and gets out of the
 * way; Meta remains the authority on whether a video is a Reel.
 *
 * Blocking on absent metadata was considered and rejected: it would make every
 * render produced before the editor reported a media block permanently
 * unpublishable, to prevent one recoverable failed attempt.
 */
export function decideReelMedia(
  media: ReelMediaFacts | null,
  companyId: string,
): ReelMediaDecision {
  if (!media) return "NO_MEDIA";

  const requester = companyId.trim();
  // Ordered before every other check for the same reason as `decideMediaRead`:
  // a refusal must not tell a caller anything about another company's row.
  if (!requester || media.companyId !== requester) return "WRONG_COMPANY";

  if (media.uploadState !== "stored") return "NOT_STORED";

  const baseType = (media.contentType.split(";")[0] ?? "").trim().toLowerCase();
  if (baseType !== REEL_CONTENT_TYPE) return "WRONG_CONTENT_TYPE";

  const { widthPx, heightPx, durationMs } = media;

  const hasSize =
    typeof widthPx === "number" &&
    Number.isFinite(widthPx) &&
    widthPx > 0 &&
    typeof heightPx === "number" &&
    Number.isFinite(heightPx) &&
    heightPx > 0;
  const hasDuration =
    typeof durationMs === "number" && Number.isFinite(durationMs) && durationMs > 0;

  if (hasSize) {
    const ratio = widthPx / heightPx;
    if (Math.abs(ratio - REEL_ASPECT_RATIO) > REEL_ASPECT_TOLERANCE) {
      return "NOT_VERTICAL";
    }
    if (widthPx < REEL_MIN_WIDTH_PX || heightPx < REEL_MIN_HEIGHT_PX) {
      return "TOO_SMALL";
    }
  }

  if (hasDuration) {
    if (durationMs < REEL_MIN_DURATION_MS) return "TOO_SHORT";
    if (durationMs > REEL_MAX_DURATION_MS) return "TOO_LONG";
  }

  return hasSize && hasDuration ? "READY" : "SHAPE_UNKNOWN";
}

/**
 * The gate. Two decisions may reach Meta — a verified-good shape, and an
 * unknown one. Everything else is a refusal.
 */
export function mayAttemptReel(decision: ReelMediaDecision): boolean {
  return decision === "READY" || decision === "SHAPE_UNKNOWN";
}

/** Operator-facing copy. Exhaustive, so a new decision needs a human answer. */
export function describeReelMediaDecision(decision: ReelMediaDecision): string {
  switch (decision) {
    case "READY":
    case "SHAPE_UNKNOWN":
      return "";
    case "NO_MEDIA":
      return "Attach a rendered video to this post before publishing a Reel.";
    case "NOT_STORED":
      return "That video has not finished uploading yet.";
    case "WRONG_COMPANY":
      return "No stored video exists for this post.";
    case "WRONG_CONTENT_TYPE":
      return "Reels require an MP4.";
    case "NOT_VERTICAL":
      return "Reels must be vertical (9:16). This render is not — re-render it at 1080x1920.";
    case "TOO_SMALL":
      return `Reels must be at least ${REEL_MIN_WIDTH_PX}x${REEL_MIN_HEIGHT_PX}. Re-render it larger.`;
    case "TOO_SHORT":
      return `Reels must run at least ${REEL_MIN_DURATION_MS / 1000} seconds.`;
    case "TOO_LONG":
      return `Reels must run no longer than ${REEL_MAX_DURATION_MS / 1000} seconds.`;
    default:
      return "This video cannot be published as a Reel.";
  }
}

/**
 * Whether the pre-flight actually checked the shape.
 *
 * The UI says something different for "checked and fine" than for "could not
 * check", because those are different promises to the operator.
 */
export function reelShapeWasVerified(decision: ReelMediaDecision): boolean {
  return decision === "READY";
}

/* --------------------------------------------------------- bounded waiting */

/**
 * How often to ask a provider whether it has finished with our video.
 *
 * Meta's own guidance for Instagram containers is roughly once a minute; five
 * seconds is more eager because the whole wait sits inside a claimed delivery
 * that a human is watching, and a finished container should not sit idle for
 * most of a minute.
 */
export const REEL_POLL_INTERVAL_MS = 5_000;

/**
 * The total wait, per asynchronous phase.
 *
 * =============== WHY THIS NUMBER IS NOT LARGER ===============
 * It has to fit inside `DELIVERY_IN_FLIGHT_GRACE_MS` from
 * `marketing-delivery.ts`, with room for the rest of the flow. A claim that
 * outlives its own grace period reads as abandoned to the next attempt, so a
 * publish that was merely slow would surface to the operator as
 * NEEDS_RECONCILIATION — the "it may or may not have gone out" state — while
 * it was still perfectly alive.
 *
 * The two constants live in different files because both modules are pure and
 * import-free. `scripts/verify-marketing-reel.mjs` loads both and asserts the
 * relationship, so the pair cannot drift apart silently.
 */
export const REEL_POLL_BUDGET_MS = 150_000;

export const REEL_POLL_MAX_ATTEMPTS = Math.floor(
  REEL_POLL_BUDGET_MS / REEL_POLL_INTERVAL_MS,
);

/* --------------------------------------------------- provider status reads */

export const REEL_PHASE_DECISIONS = [
  /** Finished. The next call may be made. */
  "READY",
  /** Still working. Poll again if the budget allows. */
  "WORKING",
  /** Terminal failure. Stop, settle failed, do not publish. */
  "FAILED",
  /**
   * Meta says this is already published. Publishing again would duplicate it —
   * only reachable on Instagram, whose container carries a PUBLISHED state.
   */
  "ALREADY_PUBLISHED",
] as const;
export type ReelPhaseDecision = (typeof REEL_PHASE_DECISIONS)[number];

/**
 * Read an Instagram container's `status_code`.
 *
 * Documented values: IN_PROGRESS, FINISHED, ERROR, EXPIRED, PUBLISHED.
 *
 * ================== WHY UNKNOWN MEANS "KEEP WAITING" ==================
 * An unrecognised code is either a new state Meta added or a malformed
 * response. Treating it as READY would publish on a signal we do not
 * understand. Treating it as FAILED would abandon a container that may be
 * seconds from finishing. Treating it as WORKING costs at most the remaining
 * poll budget and then becomes a clean, retryable failure — the only one of
 * the three that cannot produce a wrong post.
 */
export function decideInstagramContainerPhase(
  statusCode: string | null | undefined,
): ReelPhaseDecision {
  const code = (statusCode ?? "").trim().toUpperCase();
  if (code === "FINISHED") return "READY";
  if (code === "PUBLISHED") return "ALREADY_PUBLISHED";
  if (code === "ERROR" || code === "EXPIRED") return "FAILED";
  return "WORKING";
}

/**
 * Read a Facebook video's `status` object.
 *
 * Shape: `{ uploading_phase: { status }, processing_phase: { status },
 * publishing_phase: { status }, video_status }`, each phase status one of
 * `not_started | in_progress | complete | error`.
 *
 * Only the UPLOAD phase gates `finish`. Processing continues after publish on
 * Meta's side and waiting for it here would burn the budget on something that
 * does not block us.
 */
export type FacebookVideoStatus = {
  readonly video_status?: string | null;
  readonly uploading_phase?: { readonly status?: string | null } | null;
  readonly processing_phase?: { readonly status?: string | null } | null;
  readonly publishing_phase?: { readonly status?: string | null } | null;
};

export function decideFacebookUploadPhase(
  status: FacebookVideoStatus | null | undefined,
): ReelPhaseDecision {
  if (!status) return "WORKING";

  const uploading = (status.uploading_phase?.status ?? "").trim().toLowerCase();
  const overall = (status.video_status ?? "").trim().toLowerCase();

  if (uploading === "error" || overall === "error") return "FAILED";
  if (uploading === "complete") return "READY";
  // Some responses report readiness only at the top level.
  if (!uploading && (overall === "ready" || overall === "upload_complete")) {
    return "READY";
  }
  return "WORKING";
}

/* ------------------------------------------------------ upload host safety */

/**
 * Meta's resumable upload host. The ONLY host this deployment will send a Page
 * access token to outside graph.facebook.com.
 */
export const FACEBOOK_UPLOAD_HOST = "rupload.facebook.com";

/**
 * Whether an `upload_url` handed back by Meta may actually be used.
 *
 * ==================== WHY THIS EXISTS ====================
 * The `start` phase returns an `upload_url`, and using Meta's own value is
 * more robust than reconstructing it. But that value arrives in a RESPONSE
 * BODY, and the request we make to it carries `Authorization: OAuth
 * {page_access_token}` — a live credential. Following an arbitrary URL from a
 * response body with a credential attached is the shape of a token-exfiltration
 * bug, whether the response was tampered with in transit, returned by a
 * misconfigured proxy, or simply changed by Meta in a way we did not expect.
 *
 * So the host is pinned and the scheme must be https. If Meta ever returns
 * something else, the flow falls back to the constructed URL rather than
 * sending the token somewhere unrecognised.
 */
export function isTrustedReelUploadUrl(value: string | null | undefined): boolean {
  const raw = (value ?? "").trim();
  if (!raw) return false;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  return parsed.protocol === "https:" && parsed.hostname === FACEBOOK_UPLOAD_HOST;
}

/* ------------------------------------------------------------- permalinks */

/**
 * Facebook returns `permalink_url` ABSOLUTE for feed posts and RELATIVE
 * (`/reel/123`) for video objects. Storing the relative form produces a
 * "permalink" that resolves against altairhvac's own domain and 404s.
 *
 * Applied on the Reel paths only. The existing feed and photo paths are left
 * byte-for-byte as they were.
 */
export function normalizeFacebookPermalink(
  value: string | null | undefined,
): string | undefined {
  const raw = (value ?? "").trim();
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `https://www.facebook.com${raw}`;
  return undefined;
}

/* --------------------------------------------------------- api versioning */

/**
 * The Graph API version floor for Reels.
 *
 * `/{page-id}/video_reels` and Instagram's `media_type=REELS` both landed in
 * v14.0. The repository pins ONE version (`DEFAULT_FACEBOOK_GRAPH_API_VERSION`,
 * overridable by `FACEBOOK_GRAPH_API_VERSION`) and every Meta call — OAuth,
 * feed, photos, Instagram, and now both Reel flows including the upload host —
 * uses that single value. There is deliberately no second pin: a Reel flow
 * hardcoded to a different version than the OAuth flow that produced its token
 * is a class of bug nobody finds until a token behaves differently than
 * expected.
 *
 * This guard only refuses a version too old to have the endpoints at all, so a
 * misconfigured `FACEBOOK_GRAPH_API_VERSION` fails with an explanation instead
 * of an opaque Graph error.
 */
export const REEL_MIN_GRAPH_API_MAJOR = 14;

export function parseGraphApiMajor(version: string): number | null {
  const match = /^v(\d+)\.(\d+)$/i.exec(version.trim());
  if (!match) return null;
  const major = Number.parseInt(match[1]!, 10);
  return Number.isFinite(major) ? major : null;
}

export function graphVersionSupportsReels(version: string): boolean {
  const major = parseGraphApiMajor(version);
  return major !== null && major >= REEL_MIN_GRAPH_API_MAJOR;
}

/* ------------------------------------------------------ picking a video */

/**
 * What the operator sees when choosing which render a post publishes.
 *
 * IDENTITY AND SHAPE ONLY. No URL, no key, no path — a control that lists
 * videos does not need to be able to reach one, and a component prop is a
 * place data ends up in a browser bundle. Playing a video is a separate,
 * authorized request that mints its own short-lived grant.
 */
export type ReelVideoOption = {
  readonly id: string;
  readonly sourceJobId: string;
  readonly widthPx: number | null;
  readonly heightPx: number | null;
  readonly durationMs: number | null;
  readonly storedAt: string | null;
};

/**
 * A one-line description of a render, for a picker.
 *
 * Says "shape not reported" rather than nothing when the editor sent no media
 * block, because an operator choosing between two renders needs to know the
 * difference between "this is 1080x1920" and "nobody knows what this is".
 */
export function describeReelVideoOption(option: ReelVideoOption): string {
  const parts: string[] = [option.sourceJobId];

  if (
    typeof option.widthPx === "number" &&
    typeof option.heightPx === "number" &&
    option.widthPx > 0 &&
    option.heightPx > 0
  ) {
    parts.push(`${option.widthPx}x${option.heightPx}`);
  }

  if (typeof option.durationMs === "number" && option.durationMs > 0) {
    parts.push(`${(option.durationMs / 1000).toFixed(1)}s`);
  }

  if (parts.length === 1) {
    parts.push("shape not reported");
  }

  return parts.join(" · ");
}
