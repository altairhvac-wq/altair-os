import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { isAuthorizedBearerRequest, secretsMatch } from "@/lib/operations/bearer-auth";
import {
  MARKETING_MEDIA_MAX_BYTES,
  uploadMarketingMedia,
} from "@/lib/storage/marketing-media";

export const runtime = "nodejs";

/**
 * Machine-to-machine ingest for rendered marketing video.
 *
 * ==================== WHY THIS IS PUBLIC AT THE MIDDLEWARE LAYER ====================
 * The render pipeline that posts here has no browser session and no Supabase
 * cookie. Exactly like the cron and Agent Platform bridge routes, it is
 * exempted in lib/supabase/middleware.ts and enforces its own credential here.
 * Without that exemption an unauthenticated POST is 307'd to /login and the
 * handler never executes — which is how this route sat unreachable while
 * looking correct.
 *
 * ==================== TENANT BINDING IS CONFIGURATION ====================
 * The company is fixed by ALTAIR_MEDIA_INGEST_COMPANY_ID and merely checked
 * against the request header. A valid credential cannot choose which tenant it
 * writes into, and the header is a sanity check rather than an input.
 *
 * ==================== WHAT IT ACCEPTS ====================
 * One non-empty MP4 up to MARKETING_MEDIA_MAX_BYTES, keyed by render id. The
 * content hash is computed here, and uploadMarketingMedia's
 * UNIQUE (company_id, source_job_id) makes a repeated post idempotent rather
 * than a duplicate.
 */

const INGEST_SECRET_ENV = "ALTAIR_MEDIA_INGEST_SECRET";
const INGEST_COMPANY_ENV = "ALTAIR_MEDIA_INGEST_COMPANY_ID";
const COMPANY_HEADER = "x-altair-company-id";
/** Legacy header from the first pipeline revision; Bearer is preferred. */
const LEGACY_SECRET_HEADER = "x-altair-media-ingest-secret";

function getIngestSecret(): string | null {
  return process.env[INGEST_SECRET_ENV]?.trim() || null;
}

function getIngestCompanyId(): string | null {
  return process.env[INGEST_COMPANY_ENV]?.trim() || null;
}

/**
 * Accepts either `Authorization: Bearer <secret>` or the legacy
 * `x-altair-media-ingest-secret` header. Both go through the single
 * constant-time comparison in lib/operations/bearer-auth.ts — this route used
 * to carry its own third copy of that logic.
 */
function isAuthorizedIngestRequest(request: Request, expected: string): boolean {
  if (isAuthorizedBearerRequest(request, expected)) {
    return true;
  }

  const legacy = request.headers.get(LEGACY_SECRET_HEADER)?.trim();
  if (!legacy) {
    return false;
  }

  return secretsMatch(legacy, expected);
}

export async function POST(request: Request) {
  const expectedSecret = getIngestSecret();
  const allowedCompanyId = getIngestCompanyId();

  // Unconfigured is 503, not 401: nothing is wrong with the caller, the
  // deployment simply has no ingest configured. Mirrors the cron routes.
  if (!expectedSecret || !allowedCompanyId) {
    return NextResponse.json(
      { error: "Media ingest is not configured." },
      { status: 503 },
    );
  }

  if (!isAuthorizedIngestRequest(request, expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const companyId = request.headers.get(COMPANY_HEADER)?.trim() ?? "";
  if (!companyId || companyId !== allowedCompanyId) {
    return NextResponse.json(
      { error: "Company is not authorized for media ingest." },
      { status: 403 },
    );
  }

  const form = await request.formData();
  const renderId = String(form.get("render_id") ?? "").trim();
  const file = form.get("file");

  if (!renderId || !(file instanceof File)) {
    return NextResponse.json(
      { error: "render_id and an MP4 file are required." },
      { status: 400 },
    );
  }

  if (
    file.type !== "video/mp4" ||
    file.size <= 0 ||
    file.size > MARKETING_MEDIA_MAX_BYTES
  ) {
    return NextResponse.json(
      { error: "Only non-empty MP4 files up to 500 MB are accepted." },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    const asset = await uploadMarketingMedia({
      // Bound from configuration, never from the request.
      companyId: allowedCompanyId,
      renderId,
      contentSha256: createHash("sha256").update(bytes).digest("hex"),
      byteSize: bytes.byteLength,
      file: bytes,
    });

    return NextResponse.json({ asset });
  } catch (error) {
    console.error("[marketing-media-ingest] upload failed", {
      renderId,
      message: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Media ingest failed.",
      },
      { status: 409 },
    );
  }
}
