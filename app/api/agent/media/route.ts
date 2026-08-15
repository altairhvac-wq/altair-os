import { NextResponse } from "next/server";
import {
  getAgentIngestCompanyId,
  getAgentPlatformCompanyId,
  getMissingAgentBridgeEnvVars,
  isAgentBridgeConfigured,
  isAuthorizedAgentRequest,
} from "@/lib/agent-bridge/env";
import {
  getMediaAssetByJob,
  markMediaFailed,
  markMediaStored,
  reserveMediaUpload,
} from "@/lib/database/queries/marketing-media-assets";
import {
  createMediaUploadGrant,
  describeStoredObject,
} from "@/lib/media/marketing-media-storage";
import {
  isSafeSourceJobId,
  normalizeContentType,
  validateMediaMetadata,
} from "@/shared/types/marketing-media";

/**
 * Media transport for rendered video — the Agent Platform's upload surface.
 *
 * WHY A GRANT AND NOT AN UPLOAD. The bytes are on the operator's laptop and
 * can be hundreds of megabytes. Three options existed:
 *
 *   (a) give the laptop storage credentials — new durable secret on a
 *       machine we do not control;
 *   (b) POST the bytes through this route — a Next.js body limit and a large
 *       buffer in a serverless function, for no benefit;
 *   (c) mint a SHORT-LIVED grant scoped to ONE object key and let the laptop
 *       PUT directly to storage.
 *
 * (c) is what this implements. The laptop never holds a durable capability,
 * the bytes never transit this deployment, and the grant it does hold cannot
 * address any object but the one derived for it.
 *
 * TWO ACTIONS, ONE ROUTE:
 *   POST { action: "reserve",  sourceJobId }  -> a signed upload grant
 *   POST { action: "complete", sourceJobId }  -> verify + record metadata
 *
 * COMPANY BINDING IS SERVER-SIDE, exactly as in the snapshot route: the uuid
 * comes from configuration and the payload's slug is merely checked against
 * it. A caller with a valid credential still cannot choose whose media it
 * writes, and the object key is DERIVED rather than accepted.
 *
 * `complete` VERIFIES AGAINST STORAGE. It reads the object's real size and
 * content type back from the bucket and refuses a completion that disagrees,
 * so a client can neither report a success it never achieved nor record
 * metadata the bytes do not support. The one field it cannot establish is the
 * checksum — confirming that means downloading up to 2 GB — so
 * `checksum_sha256` is stored as the uploader's assertion and is labelled as
 * such wherever it is read.
 *
 * THIS ROUTE PUBLISHES NOTHING. It moves bytes into private storage. No
 * provider is contacted, and nothing here can cause a post or a spend.
 */

export const runtime = "nodejs";

const ROUTE_NAME = "agent-media";
const MAX_BODY_BYTES = 8_000;

type Body = {
  action?: unknown;
  companyId?: unknown;
  sourceJobId?: unknown;
  byteSize?: unknown;
  contentType?: unknown;
  checksumSha256?: unknown;
  durationMs?: unknown;
  widthPx?: unknown;
  heightPx?: unknown;
};

function reject(status: number, error: string) {
  return NextResponse.json({ ok: false, route: ROUTE_NAME, error }, { status });
}

export async function POST(request: Request) {
  if (!isAgentBridgeConfigured()) {
    return reject(
      503,
      `Agent bridge is not configured (missing: ${getMissingAgentBridgeEnvVars().join(", ")})`,
    );
  }

  if (!isAuthorizedAgentRequest(request)) {
    return reject(401, "Unauthorized");
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return reject(413, "Request body too large");
  }

  let body: Body;
  try {
    body = JSON.parse(raw) as Body;
  } catch {
    return reject(400, "Body is not valid JSON");
  }

  // The company is bound from configuration. The payload's slug is checked,
  // never trusted to select a target.
  const expectedSlug = getAgentPlatformCompanyId();
  const companyId = getAgentIngestCompanyId();
  if (!companyId || !expectedSlug) {
    return reject(503, "Agent bridge company mapping is not configured");
  }
  if (typeof body.companyId !== "string" || body.companyId.trim() !== expectedSlug) {
    return reject(403, "Payload company does not match the configured mapping");
  }

  const sourceJobId =
    typeof body.sourceJobId === "string" ? body.sourceJobId.trim() : "";
  if (!sourceJobId || !isSafeSourceJobId(sourceJobId)) {
    return reject(400, "sourceJobId is missing or not in an acceptable format");
  }

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  /* ------------------------------------------------------------ reserve */
  if (body.action === "reserve") {
    const reservation = await reserveMediaUpload({ companyId, sourceJobId, nowIso });

    if (reservation.error) {
      return reject(500, reservation.error);
    }

    // Already stored: return the identity, no grant. Re-uploading is
    // permitted by storage but pointless, and issuing a write capability
    // nobody needs is how one leaks.
    if (reservation.decision === "ALREADY_STORED" && reservation.asset) {
      return NextResponse.json({
        ok: true,
        route: ROUTE_NAME,
        decision: "ALREADY_STORED",
        objectKey: reservation.asset.objectKey,
        bucket: reservation.asset.bucket,
      });
    }

    if (reservation.decision === "IN_PROGRESS") {
      return NextResponse.json({
        ok: true,
        route: ROUTE_NAME,
        decision: "IN_PROGRESS",
      });
    }

    const grant = await createMediaUploadGrant({ companyId, sourceJobId, nowMs });
    if (grant.error || !grant.grant) {
      await markMediaFailed({ companyId, sourceJobId });
      return reject(500, grant.error ?? "Could not create an upload grant");
    }

    // The grant is RETURNED, never stored. It expires on its own.
    return NextResponse.json({
      ok: true,
      route: ROUTE_NAME,
      decision: "UPLOAD",
      uploadUrl: grant.grant.url,
      uploadToken: grant.grant.token,
      objectKey: grant.grant.objectKey,
      bucket: grant.grant.bucket,
      expiresAt: grant.grant.expiresAt,
    });
  }

  /* ----------------------------------------------------------- complete */
  if (body.action === "complete") {
    const byteSize = typeof body.byteSize === "number" ? body.byteSize : NaN;
    const contentType =
      typeof body.contentType === "string" ? body.contentType.trim() : "video/mp4";

    const invalid = validateMediaMetadata({ contentType, byteSize });
    if (invalid) return reject(400, invalid);

    const existing = await getMediaAssetByJob(companyId, sourceJobId);
    if (!existing) {
      return reject(409, "No reservation exists for this job; reserve first");
    }

    // VERIFY BEFORE RECORDING. A client must not be able to mark its own
    // upload successful — otherwise the control plane shows a video that
    // does not exist and a publish attempt fails at the provider instead of
    // here.
    //
    // Existence alone is not enough (independent audit P2-1). An object can be
    // present and the reported metadata still be wrong, and every later
    // consumer — a resumable YouTube upload sizing its request, a UI showing a
    // duration — reads the persisted numbers rather than the bytes. So the
    // facts are read back FROM STORAGE and the client's claim is checked
    // against them.
    const facts = await describeStoredObject(existing.objectKey);
    if (!facts.exists) {
      await markMediaFailed({ companyId, sourceJobId });
      return reject(409, "The object is not present in storage; upload did not complete");
    }

    // No storage-reported metadata means nothing to check against, and
    // recording an unverified number here would silently defeat the whole
    // check. Refuse instead: the reservation returns to `failed` and the next
    // cycle re-uploads. This is why `byte_size` and `content_type` in
    // `marketing_media_assets` are storage-verified BY CONSTRUCTION.
    if (facts.byteSize === null || facts.contentType === null) {
      await markMediaFailed({ companyId, sourceJobId });
      return reject(
        409,
        "Storage did not report size and content type for this object; it cannot be verified",
      );
    }

    if (facts.byteSize !== byteSize) {
      await markMediaFailed({ companyId, sourceJobId });
      return reject(
        409,
        `Reported size does not match storage (reported ${byteSize}, stored ${facts.byteSize})`,
      );
    }

    // Compared on the bare type: storage may append parameters the client did
    // not send, and a `; codecs=...` suffix is not a disagreement about what
    // the object is.
    const storedType = normalizeContentType(facts.contentType);
    if (storedType !== normalizeContentType(contentType)) {
      await markMediaFailed({ companyId, sourceJobId });
      return reject(
        409,
        `Reported content type does not match storage (reported ${contentType}, stored ${storedType})`,
      );
    }

    // Re-validated against the STORAGE values, since those are what get
    // persisted. The earlier call validated the client's claim; this one
    // validates the fact.
    const invalidStored = validateMediaMetadata({
      contentType: storedType,
      byteSize: facts.byteSize,
    });
    if (invalidStored) {
      await markMediaFailed({ companyId, sourceJobId });
      return reject(409, `Stored object is not acceptable: ${invalidStored}`);
    }

    const stored = await markMediaStored({
      companyId,
      sourceJobId,
      // STORAGE VALUES, not the client's. They have just been shown equal, so
      // this changes nothing today; it means a future divergence resolves in
      // favour of the bytes rather than the claim.
      byteSize: facts.byteSize,
      contentType: storedType,
      // CLIENT-REPORTED, and deliberately not presented as verified. Confirming
      // a checksum requires reading the object back — up to 2 GB through this
      // deployment on every completion — so it is recorded as the uploader's
      // assertion for later comparison, not as a fact this route established.
      checksumSha256:
        typeof body.checksumSha256 === "string" ? body.checksumSha256 : null,
      durationMs: typeof body.durationMs === "number" ? body.durationMs : null,
      widthPx: typeof body.widthPx === "number" ? body.widthPx : null,
      heightPx: typeof body.heightPx === "number" ? body.heightPx : null,
      nowIso,
    });

    if (stored.error || !stored.asset) {
      return reject(500, stored.error ?? "Could not record the stored media");
    }

    // Identity only. No URL of any kind is returned here — a caller that
    // wants the bytes asks for a read grant separately, which is an access
    // decision rather than a side effect of finishing an upload.
    return NextResponse.json({
      ok: true,
      route: ROUTE_NAME,
      objectKey: stored.asset.objectKey,
      bucket: stored.asset.bucket,
      uploadState: stored.asset.uploadState,
      storedAt: stored.asset.storedAt,
    });
  }

  return reject(400, 'action must be "reserve" or "complete"');
}
