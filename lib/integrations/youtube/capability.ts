/**
 * What a YouTube connection may do, decided from the scopes Google returned.
 *
 * ====================== WHY THIS FILE IS PURE ======================
 * No `server-only`, no imports, no clock. The mapping from a consent outcome
 * to a capability is the honesty-critical step of the whole connect flow —
 * it decides whether a card says "Connected" or "Awaiting approval" — and it
 * is reachable only by persuading a real person to tick or untick a box on
 * Google's consent screen. A decision that can only be tested that way is a
 * decision that will not be tested.
 *
 * The capability string mirrors `public.marketing_publish_capability`
 * (migration 143). It is spelled here rather than imported so this module
 * stays loadable on its own; `complete-connect.ts` types the return against
 * the real union, so a divergence is a compile error there.
 */

export type YouTubeCapabilityOutcome = {
  readonly capability: "none" | "draft_only" | "direct";
  /** Operator-facing reason, naming the next human step. Null when ready. */
  readonly detail: string | null;
};

export const YOUTUBE_UPLOAD_SCOPE =
  "https://www.googleapis.com/auth/youtube.upload";
export const YOUTUBE_READONLY_SCOPE =
  "https://www.googleapis.com/auth/youtube.readonly";

/**
 * ============ A GRANT IS NOT WHAT WE ASKED FOR ============
 * Google's consent screen lets a user withhold individual scopes, and the
 * token response says which ones survived. Reading that back is what stops a
 * connection being recorded as ready when the customer declined the very
 * permission the feature needs — the failure would otherwise surface as an
 * opaque permission error at the first upload, long after the connect
 * screen said everything was fine.
 *
 * There is deliberately no `draft_only` outcome: YouTube has no
 * upload-as-draft mode that this platform can reach. A private upload is
 * still a published resource on the channel, so calling it a draft would
 * borrow a word that means something weaker than what happens.
 */
export function deriveYouTubeCapability(
  grantedScopes: readonly string[],
): YouTubeCapabilityOutcome {
  const granted = new Set(grantedScopes);

  if (!granted.has(YOUTUBE_UPLOAD_SCOPE)) {
    return {
      capability: "none",
      detail:
        "Connected, but upload permission was not granted. Reconnect YouTube and leave the upload permission ticked on Google's consent screen.",
    };
  }

  if (!granted.has(YOUTUBE_READONLY_SCOPE)) {
    // Uploading would work and verifying the channel would not, so a later
    // capability re-probe and every status readback would fail with a
    // permission error that reads like a bug rather than a missing grant.
    return {
      capability: "none",
      detail:
        "Connected with upload permission but without read permission, so this channel cannot be verified. Reconnect YouTube and accept both permissions.",
    };
  }

  return { capability: "direct", detail: null };
}
