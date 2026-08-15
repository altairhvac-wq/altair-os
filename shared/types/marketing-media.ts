/**
 * Media transport — the bridge from a rendered MP4 on the operator's machine
 * to something a publishing API can actually fetch.
 *
 * ===================== THE PROBLEM THIS SOLVES =====================
 * AltairDemoTool writes a finished master to `masterPath`, documented in its
 * own spec as "an absolute path on the machine that ran" the job. That path
 * is useless to a cloud deployment and leaky if stored, so the snapshot
 * contract forbids transporting it. The consequence, recorded in the
 * integration audit: YouTube and TikTok OAuth could both be finished and
 * still publish nothing, because neither can reach the bytes.
 *
 * This module defines what IS safe to persist.
 *
 * ==================== THREE THINGS NEVER PERSISTED ====================
 * 1. LOCAL FILESYSTEM PATHS. Not in a column, not in metadata, not in a log.
 *    `assertNotLocalPath` is the enforcement, and it is applied to every
 *    caller-supplied string that could carry one.
 * 2. SIGNED URLS. A signed URL is a temporary capability, not an identity.
 *    Persisting one turns a 15-minute grant into a permanent one that
 *    outlives every access decision made around it. Mint at read time, use,
 *    discard — the same rule the snapshot contract has enforced since day one.
 * 3. PUBLIC URLS. The bucket is private. A permanent public URL would make
 *    every render world-readable forever, which is the opposite of the
 *    requirement.
 *
 * What IS persisted: a bucket name and an object key. Both stable, both
 * meaningless without credentials, both safe in a database and in a log.
 *
 * ======================= WHY THIS FILE IS PURE =======================
 * No imports. Key derivation, tenant scoping and the local-path rejection
 * are total functions, so the security-critical parts are testable without
 * storage, a database, or a network.
 */

/** Private bucket created by migration 144. */
export const MARKETING_MEDIA_BUCKET = "marketing-media";

/**
 * How long a read grant lives.
 *
 * Fifteen minutes is chosen against what actually consumes it: YouTube's
 * resumable upload and TikTok's PULL_FROM_URL both fetch promptly, and a
 * grant that outlives the operation it was minted for is a standing
 * capability nobody is tracking. Short enough that a leaked URL is close to
 * worthless; long enough that a slow provider fetch does not fail.
 */
export const MEDIA_READ_URL_TTL_SECONDS = 15 * 60;

/**
 * How long an upload grant lives. Longer, because the operator's machine may
 * be pushing hundreds of megabytes over a domestic connection.
 */
export const MEDIA_UPLOAD_URL_TTL_SECONDS = 60 * 60;

/** 2 GB. Above this the render is not a social video and something is wrong. */
export const MEDIA_MAX_BYTES = 2 * 1024 * 1024 * 1024;

export const MEDIA_ALLOWED_CONTENT_TYPES = ["video/mp4"] as const;
export type MediaContentType = (typeof MEDIA_ALLOWED_CONTENT_TYPES)[number];

export const MEDIA_UPLOAD_STATES = [
  /** A key has been reserved and an upload grant issued. Bytes not confirmed. */
  "pending",
  /** Bytes are in the bucket and the metadata is recorded. */
  "stored",
  /** The upload was attempted and did not complete. */
  "failed",
] as const;
export type MediaUploadState = (typeof MEDIA_UPLOAD_STATES)[number];

/**
 * Everything the control plane keeps about a piece of media.
 *
 * Note what is absent: no path, no URL, no token. A consumer that wants to
 * fetch the bytes must ask for a grant, which is an access decision, not a
 * property of the record.
 */
export type MarketingMediaAsset = {
  readonly id: string;
  readonly companyId: string;
  /** The render job that produced it. Idempotency key with companyId. */
  readonly sourceJobId: string;
  readonly bucket: string;
  readonly objectKey: string;
  readonly contentType: string;
  readonly byteSize: number | null;
  readonly checksumSha256: string | null;
  readonly durationMs: number | null;
  readonly widthPx: number | null;
  readonly heightPx: number | null;
  readonly uploadState: MediaUploadState;
  readonly createdAt: string;
  /**
   * Last write, maintained by the table's own trigger.
   *
   * This — not `createdAt` — is what staleness is measured from, because it
   * is the same value the database uses to arbitrate a concurrent re-claim.
   * Two clocks would let the pure decision and the conditional update
   * disagree about whether a reservation had been taken.
   */
  readonly updatedAt: string;
  readonly storedAt: string | null;
};

/* ------------------------------------------------------- local-path guard */

/**
 * Refuses anything that looks like a filesystem path or a URL.
 *
 * Deliberately broad. The cost of a false positive is a render job id that
 * has to be renamed; the cost of a false negative is an operator's home
 * directory in a database column that gets rendered into a browser.
 */
export function looksLikeLocalPath(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith("/") || v.startsWith("\\")) return true;   // POSIX / UNC
  if (/^[A-Za-z]:[\\/]/.test(v)) return true;                  // C:\ or C:/
  if (v.startsWith("~")) return true;                          // home
  if (v.includes("..")) return true;                           // traversal
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) return true;         // any URL scheme
  if (v.includes("\\")) return true;                           // stray backslash
  return false;
}

export function assertNotLocalPath(value: string, field: string): void {
  if (looksLikeLocalPath(value)) {
    // The offending value is NOT echoed: it is the thing we are trying to
    // keep out of logs.
    throw new Error(`${field} must not contain a filesystem path or URL.`);
  }
}

/* --------------------------------------------------------- key derivation */

/** Job ids that are safe inside an object key. */
const SAFE_JOB_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export function isSafeSourceJobId(sourceJobId: string): boolean {
  return SAFE_JOB_ID.test(sourceJobId.trim());
}

/**
 * The object key. TENANT ISOLATION IS STRUCTURAL: the company id is the first
 * path segment, so one company's media cannot be addressed from another
 * company's prefix even if a key were guessed.
 *
 * DERIVED, NEVER SUPPLIED. Callers pass a company and a job id; they never
 * pass a key. A route that accepted a key from its payload would let the
 * payload choose which company's prefix it wrote into — the same failure the
 * snapshot route avoids by binding the company server-side.
 *
 * DETERMINISTIC, which is what makes upload idempotent: the same job always
 * resolves to the same key, so a re-upload replaces rather than duplicates.
 */
export function buildMediaObjectKey(input: {
  readonly companyId: string;
  readonly sourceJobId: string;
}): string {
  const companyId = input.companyId.trim();
  const sourceJobId = input.sourceJobId.trim();

  if (!companyId) throw new Error("companyId is required to derive a media key.");
  if (!sourceJobId) throw new Error("sourceJobId is required to derive a media key.");

  assertNotLocalPath(companyId, "companyId");
  assertNotLocalPath(sourceJobId, "sourceJobId");

  if (!isSafeSourceJobId(sourceJobId)) {
    throw new Error(
      "sourceJobId must be alphanumeric with dashes or underscores, 1-128 chars.",
    );
  }
  if (!isSafeSourceJobId(companyId)) {
    throw new Error("companyId is not in an expected format for a media key.");
  }

  return `${companyId}/video/${sourceJobId}.mp4`;
}

/** The company a key belongs to, for verifying a key before using it. */
export function companyIdFromMediaObjectKey(objectKey: string): string | null {
  const [company, ...rest] = objectKey.split("/");
  if (!company || rest.length === 0) return null;
  return company;
}

/**
 * Guard for every read path: a key from the database is only usable if it
 * still belongs to the company asking. Cheap, and it turns a mis-scoped query
 * into a refusal rather than a cross-tenant media leak.
 */
export function mediaKeyBelongsToCompany(
  objectKey: string,
  companyId: string,
): boolean {
  const owner = companyIdFromMediaObjectKey(objectKey);
  return owner !== null && owner === companyId.trim();
}

/* ------------------------------------------------------------ idempotency */

export const MEDIA_UPLOAD_DECISIONS = [
  /** No record, or a previous failure. Issue a grant and upload. */
  "UPLOAD",
  /** Already stored. Reuse the existing object; do not re-upload. */
  "ALREADY_STORED",
  /** A grant was issued recently and may be in flight. */
  "IN_PROGRESS",
] as const;
export type MediaUploadDecision = (typeof MEDIA_UPLOAD_DECISIONS)[number];

/** A pending reservation older than this is assumed abandoned. */
export const MEDIA_PENDING_GRACE_MS = 2 * 60 * 60_000;

/**
 * Whether to upload.
 *
 * Unlike a publish, re-uploading is SAFE — object storage is
 * content-addressed by key, so a repeat write replaces the same object
 * rather than creating a second one. A stale `pending` therefore resolves to
 * UPLOAD, not to a reconciliation case. That asymmetry with
 * `decideDelivery` is deliberate and is the whole reason the two are
 * separate functions: publishing to Meta twice creates two posts; uploading
 * to the same key twice creates one object.
 *
 * ================= THIS PROPOSES; THE DATABASE DISPOSES =================
 * A UPLOAD here is a proposal, not a claim. The caller still has to win a
 * conditional update whose predicate uses this same `updatedAt` clock, so
 * two callers that both reach UPLOAD do not both proceed. Measuring
 * staleness from `updatedAt` rather than `createdAt` is what keeps the two
 * in agreement: a reservation another caller just re-took has a fresh
 * `updatedAt` and reads as IN_PROGRESS here, exactly as the update predicate
 * will treat it.
 */
export function decideMediaUpload(
  existing: Pick<MarketingMediaAsset, "uploadState" | "updatedAt"> | null,
  nowIso: string,
): MediaUploadDecision {
  if (!existing) return "UPLOAD";
  if (existing.uploadState === "stored") return "ALREADY_STORED";
  if (existing.uploadState === "failed") return "UPLOAD";

  const touched = Date.parse(existing.updatedAt);
  const now = Date.parse(nowIso);
  if (Number.isNaN(touched) || Number.isNaN(now)) return "UPLOAD";
  return now - touched <= MEDIA_PENDING_GRACE_MS ? "IN_PROGRESS" : "UPLOAD";
}

/**
 * The instant before which a `pending` reservation counts as abandoned.
 *
 * Exported so the conditional update and the decision above compute the same
 * boundary from the same constant, instead of one of them re-deriving it and
 * drifting.
 */
export function mediaStaleBefore(nowIso: string): string {
  return new Date(Date.parse(nowIso) - MEDIA_PENDING_GRACE_MS).toISOString();
}

/* -------------------------------------------------------------- read gate */

export const MEDIA_READ_DECISIONS = [
  /** Every condition holds. A short-lived signed URL may be minted. */
  "GRANT",
  /** No record for this job. */
  "NOT_FOUND",
  /** The record belongs to another company. */
  "WRONG_COMPANY",
  /** A record exists but the bytes are not confirmed present. */
  "NOT_STORED",
  /** The stored key is not the key this company and job derive to. */
  "KEY_MISMATCH",
] as const;
export type MediaReadDecision = (typeof MEDIA_READ_DECISIONS)[number];

/**
 * Whether a read grant may be minted — the whole authorization rule, as a
 * pure function.
 *
 * ================= WHY THIS IS NOT INSIDE THE MINTING CODE =================
 * The function that mints a signed URL needs storage and a service-role
 * client, so testing it means having both. The rule about WHO may read WHAT
 * needs neither, and it is the part that must never quietly weaken. Keeping
 * it here means every branch is exercised by a verifier that opens no socket.
 *
 * ==================== THE KEY IS RE-DERIVED, NOT TRUSTED ====================
 * `object_key` is a database column, and a column is something an attacker
 * with any write path — or a future migration, or a bad backfill — can
 * change. So the key is recomputed from the company and the job and required
 * to match. A row rewritten to point at another company's object is refused
 * here rather than turned into a signed URL for that object.
 *
 * ================== ORDER IS PART OF THE BEHAVIOUR ==================
 * WRONG_COMPANY is decided BEFORE NOT_STORED. A caller probing another
 * company's job ids learns only "not yours" and never "yours exists but is
 * still uploading", so the refusal carries no cross-tenant information.
 */
export function decideMediaRead(
  asset: Pick<
    MarketingMediaAsset,
    "companyId" | "sourceJobId" | "objectKey" | "uploadState"
  > | null,
  companyId: string,
): MediaReadDecision {
  if (!asset) return "NOT_FOUND";

  const requester = companyId.trim();
  if (!requester || asset.companyId !== requester) return "WRONG_COMPANY";

  if (asset.uploadState !== "stored") return "NOT_STORED";

  let derived: string;
  try {
    derived = buildMediaObjectKey({
      companyId: asset.companyId,
      sourceJobId: asset.sourceJobId,
    });
  } catch {
    return "KEY_MISMATCH";
  }
  if (derived !== asset.objectKey) return "KEY_MISMATCH";
  if (!mediaKeyBelongsToCompany(asset.objectKey, requester)) return "KEY_MISMATCH";

  return "GRANT";
}

/**
 * Operator-facing copy for a refusal.
 *
 * Deliberately uninformative across a tenant boundary: WRONG_COMPANY and
 * NOT_FOUND read the same to the person asking, because distinguishing them
 * would confirm the existence of another company's render.
 */
export function describeMediaReadDecision(decision: MediaReadDecision): string {
  switch (decision) {
    case "GRANT":
      return "";
    case "NOT_STORED":
      return "The video has not finished uploading yet.";
    case "KEY_MISMATCH":
      return "This media record is inconsistent and cannot be opened.";
    case "NOT_FOUND":
    case "WRONG_COMPANY":
    default:
      return "No stored video exists for this render.";
  }
}

/* ------------------------------------------------------------- validation */

/**
 * The bare media type, for comparing a claim against what storage reports.
 *
 * Object storage may record `video/mp4; codecs="avc1"` where the uploader sent
 * `video/mp4`. That is not a disagreement about what the object is, and
 * treating it as one would reject correct uploads — so the parameters are
 * dropped and the type is lowercased before the two are compared.
 */
export function normalizeContentType(value: string): string {
  const [base] = value.split(";");
  return (base ?? "").trim().toLowerCase();
}

export function validateMediaMetadata(input: {
  readonly contentType: string;
  readonly byteSize: number;
}): string | null {
  if (!MEDIA_ALLOWED_CONTENT_TYPES.includes(input.contentType as MediaContentType)) {
    return `Unsupported media type. Allowed: ${MEDIA_ALLOWED_CONTENT_TYPES.join(", ")}.`;
  }
  if (!Number.isFinite(input.byteSize) || input.byteSize <= 0) {
    return "Media byte size must be a positive number.";
  }
  if (input.byteSize > MEDIA_MAX_BYTES) {
    return `Media exceeds the ${MEDIA_MAX_BYTES} byte ceiling.`;
  }
  return null;
}

/**
 * A read grant. Returned to a caller, NEVER written to a database.
 *
 * `expiresAt` travels with the URL so a consumer can tell whether it still
 * has time to use it rather than discovering expiry mid-upload to a provider.
 */
export type MediaReadGrant = {
  readonly url: string;
  readonly expiresAt: string;
  readonly objectKey: string;
  readonly contentType: string;
  readonly byteSize: number | null;
};
