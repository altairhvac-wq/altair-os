import "server-only";

import {
  REEL_POLL_INTERVAL_MS,
  REEL_POLL_MAX_ATTEMPTS,
  decideFacebookUploadPhase,
  decideInstagramContainerPhase,
  graphVersionSupportsReels,
  isTrustedReelUploadUrl,
  normalizeFacebookPermalink,
  FACEBOOK_UPLOAD_HOST,
  type FacebookVideoStatus,
} from "@/shared/types/marketing-reel";
import { getFacebookOAuthConfig } from "./env";
import { graphBaseUrl, readFacebookJson } from "./graph";

/**
 * Reel publishing against the Meta Graph API.
 *
 * ==================== SEPARATE FROM publish.ts ON PURPOSE ====================
 * `publish.ts` holds the text and image paths, which are single POSTs. Neither
 * of these is. A Reel is a multi-phase conversation with an asynchronous
 * provider, with a bounded wait in the middle and a point of no return near
 * the end — and mixing that into the module that also holds the simple paths
 * is how the simple paths acquire a timeout loop nobody asked for. Nothing in
 * `publish.ts` is imported, called, or modified from here.
 *
 * ====================== WHAT REACHES META, AND WHEN ======================
 * A SHORT-LIVED SIGNED URL, minted by the caller immediately before the call
 * and never written down. Meta fetches the bytes itself:
 *
 *   Facebook — the `file_url` header on the upload host, which is the hosted-
 *              file variant of the resumable upload.
 *   Instagram — `video_url` on the container. There is no byte-upload option
 *              for Instagram at all; Meta fetching the URL is the only way a
 *              Reel gets there.
 *
 * Neither flow streams the video through this server. A 50 MB render does not
 * become 50 MB of inbound and 50 MB of outbound traffic on a web dyno, and the
 * URL expires on its own whether or not the publish succeeded.
 *
 * ================= ONE GRAPH VERSION, INCLUDING THE UPLOAD HOST =================
 * Every URL below is built from `config.graphApiVersion` — the single pinned
 * value in `env.ts`, overridable by `FACEBOOK_GRAPH_API_VERSION`. That
 * deliberately includes the `rupload.facebook.com` path segment, which is the
 * one place a second, divergent version would be easy to hardcode and hard to
 * notice.
 */

export type ReelPublishResult = {
  /** The published object. Facebook: the video id. Instagram: the media id. */
  readonly providerPostId: string;
  /**
   * The provider-side object created BEFORE publishing — a Facebook video id
   * or an Instagram container id. Reported through `onMediaCreated` as soon as
   * it exists, so a claim that never settles still names something.
   */
  readonly providerMediaId: string;
  readonly permalinkUrl?: string;
};

/**
 * Called the instant a provider-side object exists and before anything is
 * published. The caller persists it. A throw here aborts the publish, which is
 * the correct trade: an unpublished orphan at Meta is recoverable, an
 * unrecorded published Reel is not.
 */
export type OnReelMediaCreated = (providerMediaId: string) => Promise<void>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function assertReelSupport(version: string): void {
  if (!graphVersionSupportsReels(version)) {
    throw new Error(
      `Graph API ${version} is too old for Reel publishing. Set FACEBOOK_GRAPH_API_VERSION to v14.0 or later.`,
    );
  }
}

function requireVideoUrl(videoUrl: string): string {
  const url = videoUrl.trim();
  if (!url) {
    throw new Error("A fetchable video URL is required to publish a Reel.");
  }
  if (!/^https:\/\//i.test(url)) {
    // Meta will not fetch plaintext http, and a localhost URL fails in a way
    // that reads like a permissions problem. Refuse it here with the reason.
    throw new Error(
      "The video URL must be https and reachable from the public internet.",
    );
  }
  return url;
}

/**
 * Instagram media objects expose `permalink`; Facebook video objects expose
 * `permalink_url` and return it RELATIVE. Both are best-effort: a missing
 * permalink must never fail a publish that already happened.
 */
async function fetchReelPermalink(input: {
  objectId: string;
  accessToken: string;
  field: "permalink" | "permalink_url";
}): Promise<string | undefined> {
  const config = getFacebookOAuthConfig();
  const url = new URL(
    `${graphBaseUrl(config.graphApiVersion)}/${encodeURIComponent(input.objectId)}`,
  );
  url.searchParams.set("fields", input.field);
  url.searchParams.set("access_token", input.accessToken);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data = await readFacebookJson<{
      permalink?: string;
      permalink_url?: string;
    }>(response, "Reel permalink");
    return normalizeFacebookPermalink(
      input.field === "permalink" ? data.permalink : data.permalink_url,
    );
  } catch {
    return undefined;
  }
}

/* ------------------------------------------------------------- Facebook */

type FacebookReelStartResponse = {
  video_id?: string;
  upload_url?: string;
};

/**
 * Publish a Reel to a Facebook Page.
 *
 * FOUR PHASES, in Meta's own terms:
 *   1. start   POST /{page-id}/video_reels  upload_phase=start
 *              -> a video_id and an upload_url
 *   2. upload  POST {upload_url}  with the `file_url` header
 *              -> Meta fetches the bytes itself, asynchronously
 *   3. wait    GET /{video_id}?fields=status  until uploading_phase completes
 *   4. finish  POST /{page-id}/video_reels  upload_phase=finish
 *              video_state=PUBLISHED
 *
 * NOTHING IS PUBLIC UNTIL PHASE 4. A failure or timeout in phases 1-3 leaves
 * an unpublished video object at Meta and nothing on the Page, which is why
 * the caller may safely settle those as `failed` and permit a retry.
 */
export async function publishFacebookPageReel(input: {
  readonly pageId: string;
  readonly accessToken: string;
  /** Short-lived signed URL. Never persisted by this module or its caller. */
  readonly videoUrl: string;
  readonly description: string;
  readonly onMediaCreated?: OnReelMediaCreated;
}): Promise<ReelPublishResult> {
  const pageId = input.pageId.trim();
  const accessToken = input.accessToken.trim();
  const description = input.description.trim();

  if (!pageId) throw new Error("Facebook Page id is required.");
  if (!accessToken) throw new Error("Facebook Page access token is required.");

  const videoUrl = requireVideoUrl(input.videoUrl);
  const config = getFacebookOAuthConfig();
  assertReelSupport(config.graphApiVersion);

  // ---------------------------------------------------------- 1. start
  const startUrl = new URL(
    `${graphBaseUrl(config.graphApiVersion)}/${encodeURIComponent(pageId)}/video_reels`,
  );
  const startBody = new URLSearchParams();
  startBody.set("upload_phase", "start");
  startBody.set("access_token", accessToken);

  const startResponse = await fetch(startUrl.toString(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: startBody,
    cache: "no-store",
  });

  const start = await readFacebookJson<FacebookReelStartResponse>(
    startResponse,
    "Facebook Reel upload start",
  );

  const videoId = start.video_id?.trim();
  if (!videoId) {
    throw new Error("Facebook did not return a Reel video id.");
  }

  // Recorded before a single byte moves. From here on there is an object at
  // Meta, and the operator must be able to name it even if this process dies.
  if (input.onMediaCreated) {
    await input.onMediaCreated(videoId);
  }

  // ---------------------------------------------------------- 2. upload
  //
  // Meta's own `upload_url` is preferred, but it arrives in a response body and
  // the request below carries a live Page access token in an Authorization
  // header. An unrecognised host is therefore NOT followed — the constructed
  // URL is used instead. See `isTrustedReelUploadUrl`.
  const uploadUrl = isTrustedReelUploadUrl(start.upload_url)
    ? start.upload_url!.trim()
    : `https://${FACEBOOK_UPLOAD_HOST}/video-upload/${config.graphApiVersion}/${encodeURIComponent(videoId)}`;

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${accessToken}`,
      // The hosted-file variant: Meta fetches this URL rather than us
      // streaming bytes. The host must serve `facebookexternalhit` and must
      // not be a Meta CDN URL — Supabase signed URLs satisfy both.
      file_url: videoUrl,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!uploadResponse.ok) {
    let detail = `Facebook rejected the Reel upload (${uploadResponse.status}).`;
    try {
      const body = (await uploadResponse.json()) as {
        error?: { message?: string };
        debug_info?: { message?: string };
      };
      detail =
        body.error?.message?.trim() ||
        body.debug_info?.message?.trim() ||
        detail;
    } catch {
      // Non-JSON error body. The status line is all there is.
    }
    throw new Error(detail);
  }

  // ------------------------------------------------------------ 3. wait
  await waitForFacebookUpload({ videoId, accessToken });

  // ---------------------------------------------------------- 4. finish
  const finishUrl = new URL(
    `${graphBaseUrl(config.graphApiVersion)}/${encodeURIComponent(pageId)}/video_reels`,
  );
  const finishBody = new URLSearchParams();
  finishBody.set("video_id", videoId);
  finishBody.set("upload_phase", "finish");
  finishBody.set("video_state", "PUBLISHED");
  finishBody.set("access_token", accessToken);
  if (description) {
    finishBody.set("description", description);
  }

  const finishResponse = await fetch(finishUrl.toString(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: finishBody,
    cache: "no-store",
  });

  const finish = await readFacebookJson<{ success?: boolean }>(
    finishResponse,
    "Facebook Reel publish",
  );

  if (finish.success === false) {
    throw new Error("Facebook refused to publish the Reel.");
  }

  const permalinkUrl = await fetchReelPermalink({
    objectId: videoId,
    accessToken,
    field: "permalink_url",
  });

  // The video id is both the media object and the published object on
  // Facebook — `finish` returns only `{success: true}`, so there is no
  // separate post id to record.
  return { providerPostId: videoId, providerMediaId: videoId, permalinkUrl };
}

async function waitForFacebookUpload(input: {
  videoId: string;
  accessToken: string;
}): Promise<void> {
  const config = getFacebookOAuthConfig();

  for (let attempt = 0; attempt < REEL_POLL_MAX_ATTEMPTS; attempt += 1) {
    const url = new URL(
      `${graphBaseUrl(config.graphApiVersion)}/${encodeURIComponent(input.videoId)}`,
    );
    url.searchParams.set("fields", "status");
    url.searchParams.set("access_token", input.accessToken);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const data = await readFacebookJson<{ status?: FacebookVideoStatus }>(
      response,
      "Facebook Reel upload status",
    );

    const phase = decideFacebookUploadPhase(data.status);
    if (phase === "READY") return;
    if (phase === "FAILED") {
      throw new Error(
        "Facebook could not fetch the video. Check that the media URL is reachable and has not expired.",
      );
    }

    await sleep(REEL_POLL_INTERVAL_MS);
  }

  // Bounded on purpose — see REEL_POLL_BUDGET_MS. Nothing is published, so the
  // caller settles this as a clean, retryable failure.
  throw new Error(
    "Facebook did not finish fetching the video in time. Nothing was published — try again.",
  );
}

/* ------------------------------------------------------------ Instagram */

/**
 * Publish a Reel to an Instagram Professional account.
 *
 * THREE PHASES:
 *   1. container  POST /{ig-user-id}/media  media_type=REELS  video_url=...
 *   2. wait       GET /{container-id}?fields=status_code  until FINISHED
 *   3. publish    POST /{ig-user-id}/media_publish  creation_id=...
 *
 * NOTHING IS PUBLIC UNTIL PHASE 3. A container that errors, expires, or is
 * never published leaves nothing on the account — Meta discards unused
 * containers after 24 hours.
 *
 * ============ WHY THIS DOES NOT REUSE THE IMAGE CONTAINER POLLER ============
 * `waitForInstagramContainerReady` in `publish.ts` allows eight attempts at
 * 1.5 seconds — twelve seconds in total. That is a reasonable budget for an
 * image and nowhere near enough for video, which Meta transcodes. Reusing it
 * would produce a "container was not ready in time" failure on almost every
 * Reel while the container went on to finish perfectly. The image path is left
 * exactly as it is; this one has its own budget.
 */
export async function publishInstagramReel(input: {
  readonly igUserId: string;
  readonly accessToken: string;
  /** Short-lived signed URL. Never persisted by this module or its caller. */
  readonly videoUrl: string;
  readonly caption: string;
  /** Also place the Reel in the main feed. Meta's default is true. */
  readonly shareToFeed?: boolean;
  readonly onMediaCreated?: OnReelMediaCreated;
}): Promise<ReelPublishResult> {
  const igUserId = input.igUserId.trim();
  const accessToken = input.accessToken.trim();
  const caption = input.caption.trim();

  if (!igUserId) throw new Error("Instagram Business account id is required.");
  if (!accessToken) {
    throw new Error("Page access token is required for Instagram publish.");
  }

  const videoUrl = requireVideoUrl(input.videoUrl);
  const config = getFacebookOAuthConfig();
  assertReelSupport(config.graphApiVersion);

  // ------------------------------------------------------- 1. container
  const createUrl = new URL(
    `${graphBaseUrl(config.graphApiVersion)}/${encodeURIComponent(igUserId)}/media`,
  );
  const createBody = new URLSearchParams();
  createBody.set("media_type", "REELS");
  createBody.set("video_url", videoUrl);
  createBody.set("share_to_feed", input.shareToFeed === false ? "false" : "true");
  createBody.set("access_token", accessToken);
  if (caption) {
    createBody.set("caption", caption);
  }

  const createResponse = await fetch(createUrl.toString(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: createBody,
    cache: "no-store",
  });

  const created = await readFacebookJson<{ id?: string }>(
    createResponse,
    "Instagram Reel container create",
  );

  const containerId = created.id?.trim();
  if (!containerId) {
    throw new Error("Instagram did not return a Reel container id.");
  }

  if (input.onMediaCreated) {
    await input.onMediaCreated(containerId);
  }

  // ------------------------------------------------------------ 2. wait
  await waitForInstagramReelContainer({ containerId, accessToken });

  // --------------------------------------------------------- 3. publish
  const publishUrl = new URL(
    `${graphBaseUrl(config.graphApiVersion)}/${encodeURIComponent(igUserId)}/media_publish`,
  );
  const publishBody = new URLSearchParams();
  publishBody.set("creation_id", containerId);
  publishBody.set("access_token", accessToken);

  const publishResponse = await fetch(publishUrl.toString(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: publishBody,
    cache: "no-store",
  });

  const published = await readFacebookJson<{ id?: string }>(
    publishResponse,
    "Instagram Reel publish",
  );

  const providerPostId = published.id?.trim();
  if (!providerPostId) {
    throw new Error("Instagram did not return a published Reel id.");
  }

  const permalinkUrl = await fetchReelPermalink({
    objectId: providerPostId,
    accessToken,
    field: "permalink",
  });

  return { providerPostId, providerMediaId: containerId, permalinkUrl };
}

async function waitForInstagramReelContainer(input: {
  containerId: string;
  accessToken: string;
}): Promise<void> {
  const config = getFacebookOAuthConfig();

  for (let attempt = 0; attempt < REEL_POLL_MAX_ATTEMPTS; attempt += 1) {
    const url = new URL(
      `${graphBaseUrl(config.graphApiVersion)}/${encodeURIComponent(input.containerId)}`,
    );
    url.searchParams.set("fields", "status_code,status");
    url.searchParams.set("access_token", input.accessToken);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const data = await readFacebookJson<{
      status_code?: string;
      status?: string;
    }>(response, "Instagram Reel container status");

    const phase = decideInstagramContainerPhase(data.status_code);

    if (phase === "READY") return;
    if (phase === "ALREADY_PUBLISHED") {
      // Meta says this container has already been published. Calling
      // media_publish again would create a second Reel, which is exactly what
      // the delivery claim exists to prevent — so refuse rather than proceed.
      throw new Error(
        "This Instagram container has already been published. Check the account before trying again — publishing it again would post twice.",
      );
    }
    if (phase === "FAILED") {
      throw new Error(
        data.status?.trim() ||
          "Instagram could not process the video. Check that the media URL is reachable and the video meets Reel requirements.",
      );
    }

    await sleep(REEL_POLL_INTERVAL_MS);
  }

  throw new Error(
    "Instagram did not finish processing the video in time. Nothing was published — try again.",
  );
}
