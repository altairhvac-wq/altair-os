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
  mediaObjectExists,
} from "@/lib/media/marketing-media-storage";
import {
  isSafeSourceJobId,
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
 * `complete` VERIFIES. It lists the object in the bucket before recording it
 * as stored, so a client cannot report a success it never achieved.
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
    const present = await mediaObjectExists(existing.objectKey);
    if (!present) {
      await markMediaFailed({ companyId, sourceJobId });
      return reject(409, "The object is not present in storage; upload did not complete");
    }

    const stored = await markMediaStored({
      companyId,
      sourceJobId,
      byteSize,
      contentType,
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
