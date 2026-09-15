import "server-only";

/**
 * The Facebook and Instagram publisher adapters.
 *
 * ==================== WHAT THIS IS, AND IS NOT ====================
 * The SMALLEST layer that brings the two proven Meta Reel transports
 * (`reels.ts` — 15 historical publishes through the legacy Server Actions)
 * under the same discipline as YouTube: `dispatchPublish` → gate (kill
 * switch + recorded human approval) → claim → publish → verified readback →
 * settled delivery. The transports themselves are UNTOUCHED — this module
 * only adapts their signatures to the port and adds the post-publish
 * verification the legacy path never had.
 *
 * One module, two adapters: Instagram publishes through the SAME Facebook
 * Page connection (the capability matrix documents there is no separate
 * Instagram login), so both adapters share the Page token; they differ in
 * the transport called, the scope required, and the resource targeted
 * (Page id vs Instagram professional-account id, carried in
 * `post.providerResourceId` by the caller).
 *
 * ==================== VERIFICATION, HONESTLY BOUNDED ====================
 * YouTube's readback can assert privacy; Meta's cannot — a published Reel
 * is public the moment phase 4 completes, and the Graph API exposes no
 * visibility field to verify. What Meta DOES expose is verified strictly:
 *
 *   identity   the object exists and belongs to the intended Page /
 *              professional account (`from.id` / `owner.id`) — mismatch is
 *              a FAILED publish, because a Reel on the wrong identity is
 *              the one outcome worse than no Reel;
 *   caption    read back and compared to the caption sent
 *              (whitespace-normalized). A missing or different caption is
 *              a failed publish, same posture as the YouTube canary
 *              incident this discipline comes from;
 *   permalink  fetched and recorded; absence is recorded, not fatal
 *              (Meta occasionally delays it for fresh objects).
 *
 * A failure to VERIFY is a failure to PUBLISH: this adapter throws, the
 * dispatcher settles the delivery `failed`, and reconciliation sends a
 * human to look — never a silent success.
 */
import type {
  FetchInsightsInput,
  FetchInsightsResult,
  PublishInput,
  PublishOutcome,
  PublisherAdapter,
} from "@/lib/integrations/port";
import { getFacebookOAuthConfig } from "./env";
import { graphBaseUrl, readFacebookJson } from "./graph";
import { fetchReelInsights } from "./reel-insights";
import { publishFacebookPageReel, publishInstagramReel } from "./reels";

/**
 * The one scope each publish is impossible without. `grantedScopes` is the
 * evidence read back from Meta at consent (migration 181); empty is a real
 * answer and fails closed — a row we cannot prove anything about is not a
 * row to publish through (see the port's note on grantedScopes).
 */
const REQUIRED_FACEBOOK_PUBLISH_SCOPE = "pages_manage_posts";
const REQUIRED_INSTAGRAM_PUBLISH_SCOPE = "instagram_content_publish";

function assertPublishScope(
  grantedScopes: readonly string[],
  required: string,
  label: string,
): void {
  if (grantedScopes.length === 0) {
    throw new Error(
      `This ${label} connection has no recorded granted scopes. Empty is not proof of anything — ` +
        "reconnect the Page so the grant is recorded, then publish.",
    );
  }
  if (!grantedScopes.includes(required)) {
    throw new Error(
      `This ${label} connection was not granted ${required}, so it cannot publish. Reconnect ` +
        "the Page and approve the publishing permission.",
    );
  }
}

function requireVideoGrantUrl(input: PublishInput, label: string): string {
  const video = input.package.media.find((m) =>
    m.contentType.startsWith("video/"),
  );
  if (!video) {
    throw new Error(`A ${label} Reel publish needs a video attachment; none was provided.`);
  }
  return video.url;
}

/** Whitespace-normalized equality: Meta preserves captions but not CRLFs. */
function captionsMatch(sent: string, got: string): boolean {
  const norm = (s: string) => s.replace(/\r\n/g, "\n").trim();
  return norm(sent) === norm(got);
}

/* ---------------------------------------------------------------- readback */

type FacebookReelReadback = {
  id?: string;
  description?: string;
  permalink_url?: string;
  from?: { id?: string; name?: string };
};

type FacebookVideoStatusReadback = {
  status?: {
    video_status?: string;
    uploading_phase?: { status?: string };
    processing_phase?: { status?: string; error?: unknown; errors?: unknown };
    publishing_phase?: {
      status?: string;
      publish_status?: string;
      publish_time?: string | number;
    };
  };
};

/**
 * ============ THE FINISH CALL IS NOT THE FINISH ============
 * Meta's own docs: after `upload_phase=finish` returns `{success:true}`,
 * processing and publishing complete ASYNCHRONOUSLY, and the Reel is done
 * only when `video_status` is `ready` AND `publishing_phase.publish_status`
 * is `published`. The path shipped before 2026-09-14 never looked: a Reel
 * whose processing failed after finish stayed `posted` in the ledger with a
 * live-looking permalink — the owner saw their uploaded copy, the public
 * saw nothing, and eventually Meta expired the object entirely (four
 * historical reels died exactly this way, read back tonight as
 * "Object does not exist" against the Page's own token).
 *
 * So the adapter now polls `GET /{video_id}?fields=status` after the
 * identity readback:
 *   processing/publishing ERROR  → THROW. The publish is recorded failed
 *                                  and reconciliation names the object.
 *   ready + published            → recorded, with the phase history.
 *   still in progress at budget  → the publish stands (finish succeeded and
 *                                  the docs call the tail asynchronous) but
 *                                  `processingState` says `processing`, so
 *                                  nothing downstream may read it as done.
 *
 * `publicPlayback` is ALWAYS recorded `UNVERIFIED` here: no API field
 * proves a stranger can press play — only a human check flips that, outside
 * this system.
 *
 * Budget/interval are env-tunable (verifier + ops), defaulting to 120s/5s —
 * comfortably inside the delivery grace window after the upload phases.
 */
const PROCESSING_BUDGET_MS = (() => {
  const raw = Number(process.env.META_REEL_PROCESSING_BUDGET_MS);
  return Number.isFinite(raw) && raw >= 0 ? raw : 120_000;
})();
const PROCESSING_INTERVAL_MS = (() => {
  const raw = Number(process.env.META_REEL_PROCESSING_INTERVAL_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 5_000;
})();

type ReelProcessingResult = {
  readonly state: "ready" | "processing";
  readonly publishStatus: string | null;
  readonly publishTime: string | null;
  /** Compact `phase=state` transitions, oldest first, for the record. */
  readonly history: string;
};

async function verifyReelProcessing(
  videoId: string,
  accessToken: string,
): Promise<ReelProcessingResult> {
  const deadline = Date.now() + PROCESSING_BUDGET_MS;
  const history: string[] = [];
  let last = "";

  for (;;) {
    const readback = await readBack<FacebookVideoStatusReadback>(
      videoId,
      "status",
      accessToken,
      "Facebook Reel processing status",
    );
    const s = readback.status ?? {};
    const processing = s.processing_phase?.status ?? "unknown";
    const publishing = s.publishing_phase?.status ?? "unknown";
    const publishStatus = s.publishing_phase?.publish_status ?? null;
    const snapshot = `video=${s.video_status ?? "unknown"},processing=${processing},publishing=${publishing}${publishStatus ? `/${publishStatus}` : ""}`;
    if (snapshot !== last) {
      history.push(`${new Date().toISOString().slice(11, 19)}Z ${snapshot}`);
      last = snapshot;
    }

    if (
      s.video_status === "error" ||
      s.video_status === "expired" ||
      processing === "error" ||
      publishing === "error"
    ) {
      throw new Error(
        `Facebook reports the Reel FAILED after publish (${snapshot}). The object exists at ` +
          "Meta but will never reach viewers — recorded as a failed publish for reconciliation.",
      );
    }

    const done =
      s.video_status === "ready" &&
      (publishStatus === null || publishStatus === "published");
    if (done) {
      return {
        state: "ready",
        publishStatus,
        publishTime:
          s.publishing_phase?.publish_time === undefined
            ? null
            : String(s.publishing_phase.publish_time),
        history: history.join("; ").slice(0, 500),
      };
    }

    if (Date.now() >= deadline) {
      return {
        state: "processing",
        publishStatus,
        publishTime: null,
        history: history.join("; ").slice(0, 500),
      };
    }

    await new Promise((resolveSleep) => {
      setTimeout(resolveSleep, PROCESSING_INTERVAL_MS);
    });
  }
}

type InstagramMediaReadback = {
  id?: string;
  caption?: string;
  permalink?: string;
  media_product_type?: string;
  owner?: { id?: string };
};

async function readBack<T>(objectId: string, fields: string, accessToken: string, context: string): Promise<T> {
  const config = getFacebookOAuthConfig();
  const url = new URL(
    `${graphBaseUrl(config.graphApiVersion)}/${encodeURIComponent(objectId)}`,
  );
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return readFacebookJson<T>(response, context);
}

/* ------------------------------------------------------------- facebook */

async function publishFacebook(input: PublishInput): Promise<PublishOutcome> {
  assertPublishScope(input.grantedScopes, REQUIRED_FACEBOOK_PUBLISH_SCOPE, "Facebook");
  const pageId = input.post.providerResourceId?.trim();
  if (!pageId) throw new Error("This Facebook connection names no Page id.");
  const description = input.package.body;
  const videoUrl = requireVideoGrantUrl(input, "Facebook");

  const published = await publishFacebookPageReel({
    pageId,
    accessToken: input.accessToken,
    videoUrl,
    description,
    ...(input.onMediaCreated ? { onMediaCreated: input.onMediaCreated } : {}),
  });

  // ---- the readback: verify what can actually be verified ---------------
  const readback = await readBack<FacebookReelReadback>(
    published.providerPostId,
    "id,description,permalink_url,from",
    input.accessToken,
    "Facebook Reel readback",
  );
  if (readback.id !== published.providerPostId) {
    throw new Error(
      `Facebook Reel readback returned ${String(readback.id)} for ${published.providerPostId} — ` +
        "the publish is recorded as incomplete.",
    );
  }
  if (readback.from?.id !== undefined && readback.from.id !== pageId) {
    throw new Error(
      `The published Reel belongs to Page ${readback.from.id}, not the intended ${pageId}. ` +
        "Recorded as incomplete; reconcile before retrying.",
    );
  }
  const gotCaption = readback.description ?? "";
  if (description.trim().length > 0 && !captionsMatch(description, gotCaption)) {
    throw new Error(
      "The Facebook Reel's caption read back different from the caption the publish carried. " +
        "The intended copy did not reach Meta; recorded as incomplete.",
    );
  }

  // The asynchronous tail the finish call does not cover — throws on a
  // processing/publishing failure so the ledger records a failed publish
  // instead of a permalink to an object Meta will eventually delete.
  const processing = await verifyReelProcessing(
    published.providerPostId,
    input.accessToken,
  );

  const permalink = readback.permalink_url ?? published.permalinkUrl;
  return {
    outcome: "posted",
    providerPostId: published.providerPostId,
    providerMediaId: published.providerMediaId,
    ...(permalink ? { providerPermalink: permalink } : {}),
    providerResult: {
      pageId,
      captionVerified: true,
      captionLength: gotCaption.replace(/\r\n/g, "\n").trim().length,
      permalinkVerified: Boolean(readback.permalink_url),
      // Honest bound, recorded where reconciliation will read it: Meta has
      // no visibility field to verify — a published Reel is public.
      visibilityVerified: false,
      // The asynchronous tail, verified rather than assumed. `processing`
      // means the budget ran out while Meta was still working — the publish
      // stands, and nothing may read it as COMPLETE until a later status
      // read (or the human check) says so.
      processingState: processing.state,
      ...(processing.publishStatus === null
        ? {}
        : { publishStatus: processing.publishStatus }),
      ...(processing.publishTime === null
        ? {}
        : { publishTime: processing.publishTime }),
      processingHistory: processing.history,
      // No API field proves a stranger can press play. Only a human check
      // outside this system may ever flip this.
      publicPlayback: "UNVERIFIED",
    },
  };
}

/* ------------------------------------------------------------ instagram */

async function publishInstagram(input: PublishInput): Promise<PublishOutcome> {
  assertPublishScope(input.grantedScopes, REQUIRED_INSTAGRAM_PUBLISH_SCOPE, "Instagram");
  const igUserId = input.post.providerResourceId?.trim();
  if (!igUserId) {
    throw new Error(
      "This connection names no Instagram professional-account id. Reconnect the Facebook " +
        "Page that the Instagram account is linked to.",
    );
  }
  const caption = input.package.body;
  const videoUrl = requireVideoGrantUrl(input, "Instagram");

  const published = await publishInstagramReel({
    igUserId,
    accessToken: input.accessToken,
    videoUrl,
    caption,
    ...(input.onMediaCreated ? { onMediaCreated: input.onMediaCreated } : {}),
  });

  const readback = await readBack<InstagramMediaReadback>(
    published.providerPostId,
    "id,caption,permalink,media_product_type,owner",
    input.accessToken,
    "Instagram media readback",
  );
  if (readback.id !== published.providerPostId) {
    throw new Error(
      `Instagram readback returned ${String(readback.id)} for ${published.providerPostId} — ` +
        "the publish is recorded as incomplete.",
    );
  }
  if (readback.owner?.id !== undefined && readback.owner.id !== igUserId) {
    throw new Error(
      `The published media belongs to account ${readback.owner.id}, not the intended ${igUserId}. ` +
        "Recorded as incomplete; reconcile before retrying.",
    );
  }
  const gotCaption = readback.caption ?? "";
  if (caption.trim().length > 0 && !captionsMatch(caption, gotCaption)) {
    throw new Error(
      "The Instagram caption read back different from the caption the publish carried. " +
        "The intended copy did not reach Meta; recorded as incomplete.",
    );
  }

  const permalink = readback.permalink ?? published.permalinkUrl;
  return {
    outcome: "posted",
    providerPostId: published.providerPostId,
    providerMediaId: published.providerMediaId,
    ...(permalink ? { providerPermalink: permalink } : {}),
    providerResult: {
      igUserId,
      captionVerified: true,
      captionLength: gotCaption.replace(/\r\n/g, "\n").trim().length,
      permalinkVerified: Boolean(readback.permalink),
      ...(readback.media_product_type
        ? { mediaProductType: readback.media_product_type }
        : {}),
      visibilityVerified: false,
    },
  };
}

/* -------------------------------------------------------------- insights */

/**
 * The transport speaks `InsightsFailureKind` (not_ready/auth/rate_limited/
 * unknown); the port speaks not_ready/unauthorized/unsupported/unknown. The
 * two retry-later kinds collapse into `not_ready` — throttled and too-fresh
 * both mean "come back, don't alarm" — and the detail string keeps the
 * distinction for anyone diagnosing.
 */
function toFetchInsightsResult(
  result: Awaited<ReturnType<typeof fetchReelInsights>>,
): FetchInsightsResult {
  if (result.ok) return { ok: true, metrics: result.metrics };
  const kind =
    result.kind === "auth"
      ? "unauthorized"
      : result.kind === "not_ready" || result.kind === "rate_limited"
        ? "not_ready"
        : "unknown";
  return { ok: false, kind, detail: result.detail };
}

/* ------------------------------------------------------------- adapters */

export const facebookAdapter: PublisherAdapter = {
  provider: "facebook",
  kind: "publisher",
  publish: publishFacebook,
  // Long-lived Page tokens do not refresh — the method is deliberately
  // absent, which the credential seam reads as "this provider has no
  // refresh hop", not as an error (see the port's base-type note).
  async fetchInsights(input: FetchInsightsInput): Promise<FetchInsightsResult> {
    return toFetchInsightsResult(
      await fetchReelInsights({
        provider: "facebook",
        providerPostId: input.providerPostId,
        accessToken: input.accessToken,
      }),
    );
  },
};

export const instagramAdapter: PublisherAdapter = {
  provider: "instagram",
  kind: "publisher",
  publish: publishInstagram,
  async fetchInsights(input: FetchInsightsInput): Promise<FetchInsightsResult> {
    return toFetchInsightsResult(
      await fetchReelInsights({
        provider: "instagram",
        providerPostId: input.providerPostId,
        accessToken: input.accessToken,
      }),
    );
  },
};
