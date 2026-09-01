/**
 * The private-only rule and the readback verdict — the two decisions that
 * say whether a YouTube upload may start and whether it actually worked.
 *
 * ====================== WHY THIS FILE IS PURE ======================
 * No `server-only`, no imports, no clock, no fetch. Every branch here is
 * reachable in production only by holding a real Google credential and
 * uploading a real video to a real channel, which is not a thing a check
 * can do in a loop. A decision that can only be exercised that way is a
 * decision that will not be exercised — and these two are the ones that
 * decide whether something becomes visible on the internet.
 *
 * The same reasoning `capability.ts` gives for living beside its provider
 * rather than inside the connect flow.
 */

/** The only privacy this build will upload with. Not a default — the rule. */
export const REQUIRED_PRIVACY_STATUS = "private";

/**
 * The scope Google must have granted before an upload is attempted.
 *
 * Spelled here as well as in `capability.ts` on purpose: that module maps a
 * consent outcome onto a capability at CONNECT time, and this one re-checks
 * the live grant at PUBLISH time. A grant can be narrowed between the two —
 * a user can revoke a scope in their Google account without touching this
 * app — so a capability written weeks ago is evidence about the past, and
 * the requirement is evidence about now.
 */
export const REQUIRED_UPLOAD_SCOPE =
  "https://www.googleapis.com/auth/youtube.upload";

export type UploadPreflightInput = {
  /** `publish_capability` on the connected-account row. */
  readonly publishCapability: "none" | "draft_only" | "direct";
  /** `granted_scopes` on the connected-account row, as stored at consent. */
  readonly grantedScopes: readonly string[];
  /** `defaultVisibility` from the capability matrix for this provider. */
  readonly matrixVisibility: string;
  /** The channel this connection is bound to, from `provider_resource_id`. */
  readonly expectedChannelId: string | null;
};

export type UploadPreflightResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: string; readonly detail: string };

/**
 * Everything that must be true before a single byte is sent.
 *
 * ============ FAIL CLOSED, INCLUDING ON SILENCE ============
 * Each branch refuses on ABSENCE as well as on a wrong value. An empty
 * `grantedScopes` is not "probably fine because the account is connected" —
 * it is a row we cannot prove anything about, and the whole point of
 * requirement-10 is that being connected is not evidence of being allowed.
 * Same for a null channel: a connection that cannot name its own channel
 * cannot have its upload verified against one afterwards, so the readback
 * would be unable to do its job and the upload must not start.
 */
export function assertUploadAllowed(
  input: UploadPreflightInput,
): UploadPreflightResult {
  // 1. The matrix. If this build's own capability row does not say private,
  //    something has changed that this canary was not authorized for. It is
  //    checked FIRST because it is a statement about the build rather than
  //    about any connection, and no reconnect could fix it.
  if (input.matrixVisibility !== REQUIRED_PRIVACY_STATUS) {
    return {
      ok: false,
      code: "visibility_not_private",
      detail:
        "This build is configured to upload YouTube videos with a visibility other than private. The supervised canary uploads privately only, so nothing was sent.",
    };
  }

  // 2. The capability, derived from the consent outcome at connect time.
  if (input.publishCapability !== "direct") {
    return {
      ok: false,
      code: "capability_not_direct",
      detail:
        "This YouTube connection is not recorded as able to publish. Re-check the connection on Settings → Integrations, and reconnect YouTube if it still cannot.",
    };
  }

  // 3. The live grant. Being connected is not evidence of being allowed.
  if (!input.grantedScopes.includes(REQUIRED_UPLOAD_SCOPE)) {
    return {
      ok: false,
      code: "missing_upload_scope",
      detail:
        "This YouTube connection does not hold upload permission. Reconnect YouTube and leave the upload permission ticked on Google's consent screen.",
    };
  }

  // 4. A channel to verify against afterwards.
  if (!input.expectedChannelId || !input.expectedChannelId.trim()) {
    return {
      ok: false,
      code: "no_channel_bound",
      detail:
        "This YouTube connection does not name a channel, so an upload could not be verified against one. Reconnect YouTube.",
    };
  }

  return { ok: true };
}

export type ReadbackInput = {
  /** What YouTube returned for the id we uploaded, or null if no such video. */
  readonly video: {
    readonly videoId: string;
    readonly privacyStatus: string | null;
    readonly uploadStatus: string | null;
    readonly channelId: string | null;
  } | null;
  readonly expectedVideoId: string;
  readonly expectedChannelId: string;
};

export type ReadbackVerdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: string; readonly detail: string };

/**
 * Did the upload produce the video we think it did, private, on our channel?
 *
 * ============ WHY A FAILED READBACK IS A FAILED PUBLISH ============
 * The tempting reading of "video uploaded, readback flaky" is that the
 * publish succeeded and the check is noise. It is the opposite: the upload
 * is the irreversible half, so the only useful thing verification can do is
 * refuse to CALL it a success. A caller that treats this verdict as advisory
 * records `posted` for a video that may be unlisted, may be on the wrong
 * channel, or may not exist — and every later reconciliation trusts that row.
 *
 * `uploadStatus` is deliberately NOT required to be `processed`. YouTube
 * processes asynchronously and a fresh upload legitimately reads `uploaded`
 * for minutes; requiring the terminal value would fail a correct publish for
 * being recent. Privacy, identity and existence are all decided at insert
 * time, so those are the three this can honestly assert.
 */
export function verifyUploadReadback(input: ReadbackInput): ReadbackVerdict {
  if (!input.video) {
    return {
      ok: false,
      code: "video_not_found",
      detail:
        "YouTube accepted the upload but the video could not be read back afterwards, so the publish is recorded as incomplete rather than successful. Check the channel before retrying.",
    };
  }

  if (input.video.videoId !== input.expectedVideoId) {
    return {
      ok: false,
      code: "video_id_mismatch",
      detail:
        "The video read back from YouTube is not the one the upload reported. The publish is recorded as incomplete; check the channel before retrying.",
    };
  }

  // Absence fails. A missing privacyStatus is not evidence of privacy, and
  // this is the single check the canary exists to make.
  if (input.video.privacyStatus !== REQUIRED_PRIVACY_STATUS) {
    return {
      ok: false,
      code: "privacy_not_private",
      detail:
        "The uploaded video did not read back as private. It is recorded as an incomplete publish — open the video on YouTube and set it to private or delete it before retrying.",
    };
  }

  // Google returns the channel on the video snippet, so this is checkable
  // rather than assumed. A mismatch means the credential acted for a channel
  // this connection is not bound to — a Brand Account picked at consent, for
  // instance — and recording it against this connection would attribute a
  // video to the wrong destination forever.
  if (input.video.channelId && input.video.channelId !== input.expectedChannelId) {
    return {
      ok: false,
      code: "channel_mismatch",
      detail:
        "The uploaded video is on a different YouTube channel than this connection is bound to. The publish is recorded as incomplete; reconnect YouTube and pick the intended channel.",
    };
  }

  return { ok: true };
}

/** Where a verified private upload lives, for the operator to open. */
export function youTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}
