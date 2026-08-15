/**
 * Publishing request builders for YouTube, Google Business Profile and TikTok.
 *
 * ================== WHY THESE ARE PURE BUILDERS ==================
 * Each function returns a DESCRIPTION of an HTTP request — method, url,
 * headers, body — and sends nothing. Three consequences, all of them the
 * point:
 *
 *   1. The exact bytes we would send to a third party are unit-testable
 *      without a network, without credentials, and without the possibility
 *      of an accidental live post during a test run.
 *   2. "Did we construct the upload correctly?" stops depending on a real
 *      account being in the right state, which for TikTok and Google
 *      Business is a state we cannot reach at all today.
 *   3. This module cannot publish. It has no fetch, no client, no import
 *      that could reach a provider. Something else has to decide to send.
 *
 * =================== THE ACCESS TOKEN IS A PARAMETER ===================
 * Never read from the environment or a database here. The caller is the
 * server-side publish path that has already decrypted it; this module only
 * places it in an Authorization header. `describeRequestForLog` exists so
 * the request can be logged without the header.
 */

export type ProviderHttpRequest = {
  readonly method: "POST" | "PUT";
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  /** JSON-serializable body, or null for a body supplied as a raw stream. */
  readonly body: unknown;
  /** Human-readable, secret-free description for logs and tests. */
  readonly summary: string;
};

const AUTH = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

/** Log-safe view: everything except the credential. */
export function describeRequestForLog(
  request: ProviderHttpRequest,
): Omit<ProviderHttpRequest, "headers"> & { headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(request.headers)) {
    headers[key] = key.toLowerCase() === "authorization" ? "[redacted]" : value;
  }
  return { ...request, headers };
}

/* ------------------------------------------------------------------ YouTube */

export const YOUTUBE_PRIVACY_STATUSES = ["private", "unlisted", "public"] as const;
export type YouTubePrivacyStatus = (typeof YOUTUBE_PRIVACY_STATUSES)[number];

export type YouTubeUploadInput = {
  readonly accessToken: string;
  readonly title: string;
  readonly description: string;
  readonly tags?: readonly string[];
  /**
   * Defaults to `private`. A default of `public` would mean a bug in a
   * caller becomes a public video on a real channel; `private` makes the
   * worst case an invisible upload someone has to promote deliberately.
   */
  readonly privacyStatus?: YouTubePrivacyStatus;
  readonly categoryId?: string;
  /** Bytes of the rendered video, for the resumable-upload preamble. */
  readonly contentLengthBytes: number;
  readonly mimeType?: string;
};

export const YOUTUBE_MAX_TITLE = 100;
export const YOUTUBE_MAX_DESCRIPTION = 5000;
export const YOUTUBE_MAX_TAGS_TOTAL_CHARS = 500;

/**
 * Step 1 of a resumable upload: the metadata request that returns an upload
 * URL. Deliberately split from the byte transfer — this half is pure and
 * testable, and the byte transfer is the only half that needs a real file.
 */
export function buildYouTubeUploadInitRequest(
  input: YouTubeUploadInput,
): ProviderHttpRequest {
  const title = input.title.trim().slice(0, YOUTUBE_MAX_TITLE);
  const description = input.description.trim().slice(0, YOUTUBE_MAX_DESCRIPTION);
  const tags = clampTagsToBudget(input.tags ?? [], YOUTUBE_MAX_TAGS_TOTAL_CHARS);
  const privacyStatus = input.privacyStatus ?? "private";

  const url = new URL("https://www.googleapis.com/upload/youtube/v3/videos");
  url.searchParams.set("uploadType", "resumable");
  url.searchParams.set("part", "snippet,status");

  return {
    method: "POST",
    url: url.toString(),
    headers: {
      ...AUTH(input.accessToken),
      "content-type": "application/json; charset=UTF-8",
      "x-upload-content-length": String(input.contentLengthBytes),
      "x-upload-content-type": input.mimeType ?? "video/mp4",
    },
    body: {
      snippet: {
        title,
        description,
        ...(tags.length > 0 ? { tags } : {}),
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      },
      status: {
        privacyStatus,
        // We are the uploader and the content is ours; declaring this
        // explicitly avoids the API defaulting on our behalf.
        selfDeclaredMadeForKids: false,
      },
    },
    summary: `youtube.videos.insert resumable init (${privacyStatus}, ${input.contentLengthBytes}B)`,
  };
}

/** Step 2: set the thumbnail, only possible once a video id exists. */
export function buildYouTubeThumbnailRequest(input: {
  readonly accessToken: string;
  readonly videoId: string;
  readonly contentLengthBytes: number;
  readonly mimeType?: string;
}): ProviderHttpRequest {
  const url = new URL("https://www.googleapis.com/upload/youtube/v3/thumbnails/set");
  url.searchParams.set("videoId", input.videoId);
  url.searchParams.set("uploadType", "media");
  return {
    method: "POST",
    url: url.toString(),
    headers: {
      ...AUTH(input.accessToken),
      "content-type": input.mimeType ?? "image/jpeg",
      "content-length": String(input.contentLengthBytes),
    },
    body: null,
    summary: `youtube.thumbnails.set for ${input.videoId}`,
  };
}

/**
 * YouTube counts tags against a total character budget, not a count. Dropping
 * whole tags keeps us under it; truncating a tag mid-word would silently
 * change its meaning.
 */
export function clampTagsToBudget(
  tags: readonly string[],
  budgetChars: number,
): string[] {
  const kept: string[] = [];
  let used = 0;
  for (const raw of tags) {
    const tag = raw.trim();
    if (!tag) continue;
    const cost = tag.length + 1;
    if (used + cost > budgetChars) break;
    kept.push(tag);
    used += cost;
  }
  return kept;
}

/* --------------------------------------------------- Google Business Profile */

export const GOOGLE_BUSINESS_CTA_TYPES = [
  "BOOK",
  "ORDER",
  "SHOP",
  "LEARN_MORE",
  "SIGN_UP",
  "CALL",
] as const;
export type GoogleBusinessCtaType = (typeof GOOGLE_BUSINESS_CTA_TYPES)[number];

export type GoogleBusinessPostInput = {
  readonly accessToken: string;
  /** `accounts/{accountId}/locations/{locationId}` */
  readonly locationResourceName: string;
  readonly summary: string;
  readonly mediaUrl?: string | null;
  readonly cta?: { readonly type: GoogleBusinessCtaType; readonly url: string } | null;
};

export const GOOGLE_BUSINESS_MAX_SUMMARY = 1500;

/**
 * A STANDARD local post. Deliberately the only kind built here.
 *
 * OFFER and EVENT posts require fields (coupon codes, redemption terms,
 * start/end datetimes) that the marketing content model does not carry, and
 * the instruction was explicit: do not model post types the existing content
 * does not support. PRODUCT posts are not part of the local-post API at all.
 * Adding any of them means adding real fields first.
 */
export function buildGoogleBusinessLocalPostRequest(
  input: GoogleBusinessPostInput,
): ProviderHttpRequest {
  const summary = input.summary.trim().slice(0, GOOGLE_BUSINESS_MAX_SUMMARY);
  const url = `https://mybusiness.googleapis.com/v4/${input.locationResourceName}/localPosts`;

  const media = input.mediaUrl?.trim()
    ? [{ mediaFormat: "PHOTO", sourceUrl: input.mediaUrl.trim() }]
    : undefined;

  return {
    method: "POST",
    url,
    headers: {
      ...AUTH(input.accessToken),
      "content-type": "application/json",
    },
    body: {
      languageCode: "en-US",
      summary,
      topicType: "STANDARD",
      ...(media ? { media } : {}),
      ...(input.cta
        ? { callToAction: { actionType: input.cta.type, url: input.cta.url } }
        : {}),
    },
    summary: `googleBusiness.localPosts.create on ${input.locationResourceName}`,
  };
}

/* ------------------------------------------------------------------- TikTok */

export type TikTokPostMode = "DIRECT_POST" | "MEDIA_UPLOAD";

export type TikTokVideoInput = {
  readonly accessToken: string;
  readonly title: string;
  /**
   * DIRECT_POST publishes. MEDIA_UPLOAD lands the video in the user's drafts
   * for them to finish in the TikTok app. The caller passes whatever the
   * connection's capability actually permits — this builder does not decide,
   * because that decision belongs to the one gate in
   * `marketing-channel-connection.ts`.
   */
  readonly mode: TikTokPostMode;
  readonly videoUrl?: string | null;
  readonly contentLengthBytes?: number;
  readonly privacyLevel?: string;
  readonly disableComment?: boolean;
};

export const TIKTOK_MAX_TITLE = 2200;

export function buildTikTokPublishInitRequest(
  input: TikTokVideoInput,
): ProviderHttpRequest {
  const title = input.title.trim().slice(0, TIKTOK_MAX_TITLE);

  // Two distinct endpoints, not one endpoint with a flag: TikTok separates
  // publishing from draft upload, and so does this.
  const url =
    input.mode === "DIRECT_POST"
      ? "https://open.tiktokapis.com/v2/post/publish/video/init/"
      : "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/";

  const source = input.videoUrl?.trim()
    ? { source: "PULL_FROM_URL", video_url: input.videoUrl.trim() }
    : {
        source: "FILE_UPLOAD",
        video_size: input.contentLengthBytes ?? 0,
        chunk_size: input.contentLengthBytes ?? 0,
        total_chunk_count: 1,
      };

  return {
    method: "POST",
    url,
    headers: {
      ...AUTH(input.accessToken),
      "content-type": "application/json; charset=UTF-8",
    },
    body: {
      // post_info exists ONLY for a direct post. Sending it on the inbox
      // endpoint would imply a privacy decision on content the user has not
      // chosen to publish yet.
      ...(input.mode === "DIRECT_POST"
        ? {
            post_info: {
              title,
              privacy_level: input.privacyLevel ?? "SELF_ONLY",
              disable_comment: input.disableComment ?? false,
            },
          }
        : {}),
      source_info: source,
    },
    summary: `tiktok.${input.mode === "DIRECT_POST" ? "publish" : "inbox"}.init`,
  };
}

/** Post-publish status poll. TikTok publishing is asynchronous. */
export function buildTikTokPublishStatusRequest(input: {
  readonly accessToken: string;
  readonly publishId: string;
}): ProviderHttpRequest {
  return {
    method: "POST",
    url: "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
    headers: {
      ...AUTH(input.accessToken),
      "content-type": "application/json; charset=UTF-8",
    },
    body: { publish_id: input.publishId },
    summary: `tiktok.publish.status ${input.publishId}`,
  };
}
