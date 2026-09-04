import "server-only";

import {
  buildYouTubeUploadInitRequest,
  describeRequestForLog,
  type YouTubePrivacyStatus,
} from "@/lib/integrations/channel-publish-requests";
import { YouTubeApiError, type YouTubeVideoStatus } from "./api";
import { YOUTUBE_API_ORIGIN } from "./env";

/**
 * The resumable upload, and the readback that proves what it produced.
 *
 * ============ THE UPLOAD URL IS ATTACKER-SHAPED DATA ============
 * A resumable upload is two hops: a metadata POST that answers with a
 * `Location` header, then the bytes PUT to that location with the credential
 * attached. The location arrives in a RESPONSE, which makes it exactly the
 * class of value `lib/integrations/facebook/graph.ts` follows verbatim from
 * `paging.next` — unbounded, unpinned, with the token on the query string —
 * and which `marketing-reel.ts` already refuses to trust by pinning the
 * Facebook upload host.
 *
 * So `assertTrustedUploadUrl` runs BEFORE the Authorization header is
 * attached, not after. A compromised or spoofed response that answered with
 * its own host would otherwise be handed a working Google credential by us.
 *
 * ============ ONE ATTEMPT, NO RESUME ============
 * Resumable uploads can be continued after a network drop. This does not,
 * and the queue is why: a retry re-enters through `marketing_publish_jobs`,
 * which re-claims the delivery, and 143's unique constraint is what stops a
 * second video. A resume implemented in here would be a second retry
 * mechanism sitting underneath that one, invisible to it — and the failure
 * it would produce is the duplicate the whole ledger exists to prevent.
 */

const UPLOAD_TIMEOUT_MS = 240_000;
const MEDIA_FETCH_TIMEOUT_MS = 120_000;
const READBACK_TIMEOUT_MS = 20_000;

/**
 * Google documents resumable upload session URLs on the upload host. Both
 * spellings are accepted because Google has used both; nothing else is.
 */
const TRUSTED_UPLOAD_ORIGINS = new Set<string>([
  YOUTUBE_API_ORIGIN,
  "https://youtube.googleapis.com",
]);

/** Exported for its verifier: this is the guard, so it is tested directly. */
export function isTrustedYouTubeUploadUrl(candidate: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return false;
  }
  // Origin comparison, never a prefix test: a host ending in
  // ".googleapis.com.example.net" passes `startsWith` and is not Google.
  return TRUSTED_UPLOAD_ORIGINS.has(parsed.origin);
}

function assertTrustedUploadUrl(candidate: string): void {
  if (!isTrustedYouTubeUploadUrl(candidate)) {
    // The rejected URL is NOT quoted into the message: it is attacker-shaped
    // and this string reaches an operator's screen.
    throw new YouTubeApiError(0, "untrusted_upload_url");
  }
}

async function withTimeout<T>(
  timeoutMs: number,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export type YouTubeUploadInput = {
  readonly accessToken: string;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  /**
   * Narrowed to the literal at the type level. The canary is private-only,
   * and a parameter typed `YouTubePrivacyStatus` would make "unlisted" a
   * value a caller could pass without changing this file.
   */
  readonly privacyStatus: Extract<YouTubePrivacyStatus, "private">;
  /** A short-lived signed URL for the rendered video. Never an object key. */
  readonly mediaUrl: string;
  readonly contentType: string;
  readonly byteSize: number;
};

export type YouTubeUploadResult = {
  readonly videoId: string;
  /** What YouTube says the privacy is, read from the upload response. */
  readonly privacyStatus: string | null;
  readonly channelId: string | null;
  readonly uploadStatus: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function sanitize(raw: string): string {
  const trimmed = raw.trim();
  return /^[A-Za-z0-9_.-]{1,64}$/.test(trimmed) ? trimmed : "unrecognized_error";
}

function extractErrorCode(body: unknown): string {
  if (!isRecord(body)) return "unparseable_error";
  if (isRecord(body.error)) {
    const status = body.error.status;
    if (typeof status === "string") return sanitize(status);
    const errors = body.error.errors;
    const reason = Array.isArray(errors)
      ? (errors[0] as Record<string, unknown> | undefined)?.reason
      : undefined;
    if (typeof reason === "string") return sanitize(reason);
    const code = body.error.code;
    if (typeof code === "number") return String(code);
  }
  if (typeof body.error === "string") return sanitize(body.error);
  return "unknown_error";
}

/**
 * Uploads one video and returns YouTube's own id for it.
 *
 * Throws `YouTubeApiError` on every failure — the port's publish contract.
 */
export async function uploadYouTubeVideo(
  input: YouTubeUploadInput,
): Promise<YouTubeUploadResult> {
  // ---------------------------------------------------------- 1. metadata
  // Built by the existing pure builder, which owns the title/description
  // clamping and the tag character budget. It also hard-defaults privacy to
  // `private`; the value is passed explicitly anyway so this call site says
  // what it means rather than relying on a default staying put.
  const init = buildYouTubeUploadInitRequest({
    accessToken: input.accessToken,
    title: input.title,
    description: input.description,
    tags: [...input.tags],
    privacyStatus: input.privacyStatus,
    contentLengthBytes: input.byteSize,
    mimeType: input.contentType,
  });

  const initResponse = await withTimeout(UPLOAD_TIMEOUT_MS, (signal) =>
    fetch(init.url, {
      method: init.method,
      headers: init.headers as Record<string, string>,
      body: JSON.stringify(init.body),
      signal,
    }),
  );

  if (!initResponse.ok) {
    const body = await readJsonSafely(initResponse);
    // The log carries the redacted request description — never the headers,
    // which hold the credential.
    console.error("[uploadYouTubeVideo] init failed:", {
      status: initResponse.status,
      code: extractErrorCode(body),
      request: describeRequestForLog(init).summary,
    });
    throw new YouTubeApiError(initResponse.status, extractErrorCode(body));
  }

  const uploadUrl = initResponse.headers.get("location");
  if (!uploadUrl) {
    throw new YouTubeApiError(initResponse.status, "no_upload_session");
  }

  // BEFORE the credential is attached. See the header.
  assertTrustedUploadUrl(uploadUrl);

  // ------------------------------------------------------------- 2. bytes
  const media = await withTimeout(MEDIA_FETCH_TIMEOUT_MS, (signal) =>
    fetch(input.mediaUrl, { method: "GET", signal }),
  );

  if (!media.ok) {
    // The signed URL is ours and short-lived; the likely cause is expiry
    // between minting and here. The URL is not logged — it is a capability.
    throw new YouTubeApiError(media.status, "media_unreadable");
  }

  const bytes = new Uint8Array(await media.arrayBuffer());

  if (bytes.byteLength === 0) {
    throw new YouTubeApiError(0, "media_empty");
  }

  // Google matches the declared length against what arrives. A mismatch is
  // caught here rather than as an opaque 400 from the upload host, because
  // "the file is not the size the ledger says" is a different problem from
  // "YouTube rejected the upload" and sends someone somewhere different.
  if (bytes.byteLength !== input.byteSize) {
    console.error("[uploadYouTubeVideo] media size mismatch:", {
      declared: input.byteSize,
      actual: bytes.byteLength,
    });
    throw new YouTubeApiError(0, "media_size_mismatch");
  }

  const uploadResponse = await withTimeout(UPLOAD_TIMEOUT_MS, (signal) =>
    fetch(uploadUrl, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        "content-type": input.contentType,
        "content-length": String(bytes.byteLength),
      },
      body: bytes,
      signal,
    }),
  );

  const uploadBody = await readJsonSafely(uploadResponse);

  if (!uploadResponse.ok) {
    console.error("[uploadYouTubeVideo] upload failed:", {
      status: uploadResponse.status,
      code: extractErrorCode(uploadBody),
    });
    throw new YouTubeApiError(
      uploadResponse.status,
      extractErrorCode(uploadBody),
    );
  }

  if (!isRecord(uploadBody)) {
    // A 2xx we cannot read is not a success we can record. Throwing here
    // leaves the delivery `in_flight`, which is the honest state: an
    // external write happened and its outcome is unknown. Reporting success
    // without a video id would be worse — nothing could ever reconcile it.
    throw new YouTubeApiError(
      uploadResponse.status,
      "unreadable_upload_response",
    );
  }

  const videoId = typeof uploadBody.id === "string" ? uploadBody.id.trim() : "";
  if (!videoId) {
    throw new YouTubeApiError(uploadResponse.status, "no_video_id");
  }

  const status = isRecord(uploadBody.status) ? uploadBody.status : {};
  const snippet = isRecord(uploadBody.snippet) ? uploadBody.snippet : {};

  return {
    videoId,
    privacyStatus:
      typeof status.privacyStatus === "string" ? status.privacyStatus : null,
    channelId: typeof snippet.channelId === "string" ? snippet.channelId : null,
    uploadStatus:
      typeof status.uploadStatus === "string" ? status.uploadStatus : null,
  };
}

/**
 * Reads one video back by id — the proof that the upload produced what we
 * think it produced.
 *
 * Returns null when YouTube reports no such video (an empty `items`), which
 * is a real answer and not a transport fault: it is what a caller must treat
 * as a failed publish.
 */
export async function fetchYouTubeVideoById(input: {
  readonly accessToken: string;
  readonly videoId: string;
}): Promise<YouTubeVideoStatus | null> {
  const url = new URL(`${YOUTUBE_API_ORIGIN}/youtube/v3/videos`);
  url.searchParams.set("part", "status,snippet");
  url.searchParams.set("id", input.videoId);

  const response = await withTimeout(READBACK_TIMEOUT_MS, (signal) =>
    fetch(url.toString(), {
      method: "GET",
      headers: { authorization: `Bearer ${input.accessToken}` },
      signal,
    }),
  );

  const body = await readJsonSafely(response);

  if (!response.ok) {
    throw new YouTubeApiError(response.status, extractErrorCode(body));
  }

  if (!isRecord(body) || !Array.isArray(body.items)) {
    throw new YouTubeApiError(response.status, "unreadable_video_response");
  }

  const item = body.items[0];
  if (!isRecord(item)) return null;

  const status = isRecord(item.status) ? item.status : {};
  const snippet = isRecord(item.snippet) ? item.snippet : {};

  return {
    videoId: typeof item.id === "string" ? item.id : input.videoId,
    privacyStatus:
      typeof status.privacyStatus === "string" ? status.privacyStatus : null,
    uploadStatus:
      typeof status.uploadStatus === "string" ? status.uploadStatus : null,
    channelId: typeof snippet.channelId === "string" ? snippet.channelId : null,
    title: typeof snippet.title === "string" ? snippet.title : null,
  };
}
