import "server-only";

import type {
  CapabilityProbeResult,
  ProbeCapabilityInput,
  PublisherAdapter,
  PublishInput,
  PublishOutcome,
  RefreshCredentialInput,
  RefreshCredentialResult,
} from "@/lib/integrations/port";
import { YouTubeApiError, fetchYouTubeChannels, refreshYouTubeAccessToken } from "./api";
import { deriveYouTubeCapability } from "./capability";
import {
  assertUploadAllowed,
  verifyUploadReadback,
  youTubeWatchUrl,
  REQUIRED_PRIVACY_STATUS,
} from "./publish-guard";
import { fetchYouTubeVideoById, uploadYouTubeVideo } from "./upload";

/**
 * The YouTube adapter.
 *
 * ====================== WHAT THIS CAN AND CANNOT DO ======================
 * It uploads ONE video, PRIVATE, to the channel a connection is bound to,
 * and then reads it back to prove that is what happened. It cannot make
 * anything public or unlisted: the privacy is a literal type at the
 * transport boundary (`upload.ts`), a matrix precondition here, and a
 * readback assertion afterwards, and no parameter anywhere lets a caller
 * choose otherwise.
 *
 * It also cannot decide to run. `publish` is reached only through
 * `lib/publishing/dispatch.ts`, which passes `lib/publishing/gate.ts` first
 * — kill switch, connection health, and a RECORDED human approval on the
 * specific job. Nothing in this file re-implements those, and nothing in it
 * can bypass them, because a publish that is never called cannot refuse.
 *
 * ====================== THE ERROR CONTRACT ======================
 * `publish` THROWS on every failure, per the port. The caller's catch is
 * what settles the delivery `failed` and releases the claim; a returned
 * `{ ok: false }` would be ignorable, and an ignored publish failure strands
 * the ledger row `in_flight` and sends a human to look at YouTube for a
 * video that never happened.
 *
 * `refreshCredential` and `probeCapability` RETURN a union, also per the
 * port: the right response to those failing is to record it on the
 * connection and carry on.
 */

/** Bounded like every other operator-facing detail (migration 143/181). */
const DETAIL_MAX = 500;

function clamp(detail: string): string {
  return detail.length <= DETAIL_MAX ? detail : `${detail.slice(0, DETAIL_MAX - 1)}…`;
}

/**
 * Google's documented signal that a grant is gone for good.
 *
 * `invalid_grant` is returned for a revoked consent, a deleted Google
 * account, a password change that invalidated tokens, and an expired
 * refresh token. Every one of those needs the same thing — a human
 * reconnecting — which is exactly `REAUTH_REQUIRED`. Everything else is
 * treated as transient, because marking a connection dead over a five-minute
 * Google outage costs a reconnect nobody needed to do.
 */
function refreshFailureReason(
  error: unknown,
): "REAUTH_REQUIRED" | "TRANSIENT" | "PROVIDER_ERROR" {
  if (!(error instanceof YouTubeApiError)) return "PROVIDER_ERROR";
  if (error.code === "invalid_grant") return "REAUTH_REQUIRED";
  if (error.status === 400 && error.code === "invalid_request") {
    // A malformed refresh request will not become well-formed on retry.
    return "PROVIDER_ERROR";
  }
  if (error.status >= 500 || error.status === 429 || error.status === 0) {
    return "TRANSIENT";
  }
  return "PROVIDER_ERROR";
}

function expiryFromSeconds(seconds: number | null, nowIso: string): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const base = Date.parse(nowIso);
  const from = Number.isNaN(base) ? Date.now() : base;
  return new Date(from + seconds * 1000).toISOString();
}

export const youtubeAdapter: PublisherAdapter = {
  provider: "youtube",
  kind: "publisher",

  /* ------------------------------------------------------------ refresh */

  async refreshCredential(
    input: RefreshCredentialInput,
  ): Promise<RefreshCredentialResult> {
    let tokens;
    try {
      tokens = await refreshYouTubeAccessToken(input.refreshTokenPlaintext);
    } catch (error) {
      const reason = refreshFailureReason(error);
      // The code, never the body. `api.ts` already refuses to carry Google's
      // prose; this keeps that true one level up.
      console.error("[youtubeAdapter.refreshCredential] refresh failed:", {
        connectedAccountId: input.connectedAccountId,
        reason,
        code: error instanceof YouTubeApiError ? error.code : "unexpected",
      });
      return {
        ok: false,
        reason,
        detail: clamp(
          reason === "REAUTH_REQUIRED"
            ? "Google rejected the stored YouTube credential, so it can only be replaced by reconnecting."
            : "Refreshing YouTube access did not succeed. It will be retried on the next attempt.",
        ),
      };
    }

    return {
      ok: true,
      accessTokenPlaintext: tokens.accessToken,
      // ============ THE ROTATION RULE ============
      // Google returns a refresh token ONLY when it rotates one, which is
      // rare. Spreading `refreshToken ?? undefined` would be wrong in the
      // one direction that matters: a `null` written into the secrets table
      // clears the only credential that can refresh again, and the
      // connection dies at the next expiry with nothing able to say why.
      // Omitting the key entirely is what tells the credential seam to keep
      // what it already holds — see its `nextRefreshPlaintext`.
      ...(tokens.refreshToken ? { refreshTokenPlaintext: tokens.refreshToken } : {}),
      tokenExpiresAt: expiryFromSeconds(tokens.expiresInSeconds, input.nowIso),
      // Google does not expire the refresh token itself for published apps,
      // and says nothing about one here. `undefined` means "not mentioned",
      // which the seam distinguishes from `null` ("there is none") so an
      // ordinary Google refresh cannot clear TikTok-style expiry data.
      ...(tokens.grantedScopes.length > 0
        ? { grantedScopes: tokens.grantedScopes }
        : {}),
    };
  },

  /* -------------------------------------------------------------- probe */

  async probeCapability(
    input: ProbeCapabilityInput,
  ): Promise<CapabilityProbeResult> {
    try {
      const channels = await fetchYouTubeChannels(input.accessToken);

      if (channels.length === 0) {
        return {
          capability: "none",
          detail: clamp(
            "This Google account no longer has a YouTube channel, so nothing can be uploaded to it.",
          ),
          grantedScopes: [],
        };
      }

      const stillBound =
        !input.providerResourceId ||
        channels.some((c) => c.channelId === input.providerResourceId);

      if (!stillBound) {
        return {
          capability: "none",
          detail: clamp(
            "The connected YouTube channel is no longer among the channels this Google account can act for. Reconnect YouTube and pick the intended channel.",
          ),
          grantedScopes: [],
        };
      }

      // A successful channels.list proves the readonly scope survives. It
      // does not prove the upload scope, and nothing short of an upload
      // would — so the stored grant remains the evidence for that half, and
      // `assertUploadAllowed` re-checks it at publish time.
      return {
        capability: "direct",
        detail: clamp("YouTube responded and the connected channel is reachable."),
        grantedScopes: [],
      };
    } catch (error) {
      const code = error instanceof YouTubeApiError ? error.code : "unexpected";
      const status = error instanceof YouTubeApiError ? error.status : 0;

      // 401/403 mean the grant is gone or narrowed — a real capability
      // change, and the connection should say so. Anything else is a bad
      // moment at Google, and reporting `none` for that would tell an
      // operator to reconnect a connection that is fine.
      if (status === 401 || status === 403) {
        return {
          capability: "none",
          detail: clamp(
            "Google refused to read this YouTube channel with the stored credential. Reconnect YouTube.",
          ),
          grantedScopes: [],
        };
      }

      console.error("[youtubeAdapter.probeCapability] probe failed:", {
        connectedAccountId: input.connectedAccountId,
        status,
        code,
      });
      throw error;
    }
  },

  /* ------------------------------------------------------------ publish */

  async publish(input: PublishInput): Promise<PublishOutcome> {
    const expectedChannelId =
      input.post.providerResourceId ?? input.post.providerAccountId;

    // ---------------------------------------------------- 1. preflight
    // Every refusal here happens before a byte is sent. The gate has
    // already cleared the kill switch, the connection state and the human
    // approval; these are the YouTube-specific preconditions it cannot know
    // about — and the private-only rule, which is this canary's whole point.
    const preflight = assertUploadAllowed({
      publishCapability: input.publishCapability,
      grantedScopes: input.grantedScopes,
      matrixVisibility: input.capability.defaultVisibility,
      expectedChannelId,
    });

    if (!preflight.ok) {
      throw new YouTubeApiError(0, preflight.code);
    }

    // Non-null after the preflight, which refuses a null channel outright.
    const channelId = (expectedChannelId as string).trim();

    // ------------------------------------------------------- 2. the media
    const video = input.package.media.find((asset) =>
      asset.contentType.startsWith("video/"),
    );

    if (!video) {
      throw new YouTubeApiError(0, "no_video_asset");
    }

    if (video.byteSize == null || video.byteSize <= 0) {
      // Google needs a declared length for a resumable upload, and a guessed
      // one produces a corrupt video rather than an error.
      throw new YouTubeApiError(0, "unknown_media_size");
    }

    // ------------------------------------------------------- 3. the upload
    const uploaded = await uploadYouTubeVideo({
      accessToken: input.accessToken,
      title: input.package.title ?? "",
      description: input.package.body,
      tags: input.package.hashtags,
      // The literal, not a variable. Nothing computes this.
      privacyStatus: REQUIRED_PRIVACY_STATUS,
      mediaUrl: video.url,
      contentType: video.contentType,
      byteSize: video.byteSize,
    });

    // The provider-side object now exists. Reported before anything else can
    // fail, so a crash between here and the settle leaves a record that
    // reconciliation can follow — the trade `facebook/reels.ts` documents:
    // an orphan at the provider is recoverable, an unrecorded post is not.
    if (input.onMediaCreated) {
      await input.onMediaCreated(uploaded.videoId);
    }

    // ----------------------------------------------------- 4. the readback
    // A failure to VERIFY is a failure to PUBLISH. The upload is the
    // irreversible half, so the only useful thing verification can do is
    // refuse to call it a success — see `verifyUploadReadback`.
    let readback;
    try {
      readback = await fetchYouTubeVideoById({
        accessToken: input.accessToken,
        videoId: uploaded.videoId,
      });
    } catch (error) {
      console.error("[youtubeAdapter.publish] readback request failed:", {
        videoId: uploaded.videoId,
        code: error instanceof YouTubeApiError ? error.code : "unexpected",
      });
      throw new YouTubeApiError(0, "readback_unavailable");
    }

    const verdict = verifyUploadReadback({
      video: readback,
      expectedVideoId: uploaded.videoId,
      expectedChannelId: channelId,
    });

    if (!verdict.ok) {
      console.error("[youtubeAdapter.publish] readback verification failed:", {
        videoId: uploaded.videoId,
        code: verdict.code,
      });
      throw new YouTubeApiError(0, verdict.code);
    }

    // `verifyUploadReadback` refuses a null video, so this cannot be null
    // here — but the verdict is a separate value and the compiler cannot see
    // through it. Restating the guard keeps the fact structural rather than
    // asserted with a cast, which would be the one place a future change to
    // the verdict could silently produce a null dereference.
    if (!readback) {
      throw new YouTubeApiError(0, "video_not_found");
    }

    return {
      outcome: "posted",
      providerPostId: uploaded.videoId,
      providerMediaId: uploaded.videoId,
      providerPermalink: youTubeWatchUrl(uploaded.videoId),
      // What was VERIFIED, taken from the readback rather than from the
      // upload response — the readback is the half that was checked, and
      // recording the request's own optimism would defeat the point.
      // `privacyStatus` here is the durable answer to the only question the
      // canary was authorized on, and nothing else on the ledger records it.
      providerResult: {
        privacyStatus: readback.privacyStatus,
        uploadStatus: readback.uploadStatus,
        channelId: readback.channelId,
        videoId: readback.videoId,
      },
    };
  },
};
