import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  MARKETING_MEDIA_BUCKET,
  buildMediaObjectKey,
  decideMediaUpload,
  type MarketingMediaAsset,
  type MediaUploadDecision,
} from "@/shared/types/marketing-media";

/**
 * Media asset records (migration 144).
 *
 * SERVICE-ROLE ONLY for writes. Dispatchers may SELECT so the UI can say
 * "video ready", but the table holds no capability — knowing an object key
 * grants nothing without a server-minted signed URL.
 *
 * THE OBJECT KEY IS DERIVED HERE, NEVER ACCEPTED. Every function takes a
 * company and a job id and computes the key itself, so no caller — and no
 * request payload reaching a caller — can choose which company prefix is
 * written to.
 */

const TABLE = "marketing_media_assets";

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

function assetsTable(client: ServiceClient) {
  // marketing_media_assets: migration 144 — wire into Database types on the
  // next generated-types run, matching the agent-snapshots helper.
  return (
    client as ServiceClient & {
      from(table: "marketing_media_assets"): ReturnType<ServiceClient["from"]>;
    }
  ).from(TABLE);
}

type AssetRow = {
  id: string;
  company_id: string;
  source_job_id: string;
  bucket: string;
  object_key: string;
  content_type: string;
  byte_size: number | null;
  checksum_sha256: string | null;
  duration_ms: number | null;
  width_px: number | null;
  height_px: number | null;
  upload_state: string;
  created_at: string;
  stored_at: string | null;
};

function toAsset(row: AssetRow): MarketingMediaAsset {
  return {
    id: row.id,
    companyId: row.company_id,
    sourceJobId: row.source_job_id,
    bucket: row.bucket,
    objectKey: row.object_key,
    contentType: row.content_type,
    byteSize: row.byte_size,
    checksumSha256: row.checksum_sha256,
    durationMs: row.duration_ms,
    widthPx: row.width_px,
    heightPx: row.height_px,
    uploadState: row.upload_state as MarketingMediaAsset["uploadState"],
    createdAt: row.created_at,
    storedAt: row.stored_at,
  };
}

export async function getMediaAssetByJob(
  companyId: string,
  sourceJobId: string,
): Promise<MarketingMediaAsset | null> {
  const client = createServiceRoleClient();
  const result = await assetsTable(client)
    .select("*")
    .eq("company_id", companyId)
    .eq("source_job_id", sourceJobId)
    .maybeSingle();

  if (result.error || !result.data) return null;
  return toAsset(result.data as AssetRow);
}

export type ReserveMediaResult = {
  decision: MediaUploadDecision;
  asset: MarketingMediaAsset | null;
  error?: string;
};

/**
 * Reserve the key for a render job.
 *
 * Upsert on (company_id, source_job_id) — the unique constraint from
 * migration 144. Unlike a publish claim, re-reserving is SAFE: object storage
 * is addressed by key, so a repeat upload replaces the same object rather
 * than creating a second one. That is why a stale reservation resolves to
 * UPLOAD rather than to a reconciliation case, and why this function is
 * allowed to be far less paranoid than `claimDelivery`.
 */
export async function reserveMediaUpload(input: {
  companyId: string;
  sourceJobId: string;
  nowIso: string;
}): Promise<ReserveMediaResult> {
  const existing = await getMediaAssetByJob(input.companyId, input.sourceJobId);
  const decision = decideMediaUpload(existing, input.nowIso);

  if (decision !== "UPLOAD") {
    return { decision, asset: existing };
  }

  let objectKey: string;
  try {
    objectKey = buildMediaObjectKey({
      companyId: input.companyId,
      sourceJobId: input.sourceJobId,
    });
  } catch (error) {
    return {
      decision: "UPLOAD",
      asset: null,
      error: error instanceof Error ? error.message : "Invalid media reference.",
    };
  }

  const client = createServiceRoleClient();
  const result = await assetsTable(client)
    .upsert(
      {
        company_id: input.companyId,
        source_job_id: input.sourceJobId,
        bucket: MARKETING_MEDIA_BUCKET,
        object_key: objectKey,
        upload_state: "pending",
        stored_at: null,
      },
      { onConflict: "company_id,source_job_id" },
    )
    .select("*")
    .single();

  if (result.error || !result.data) {
    console.error("[reserveMediaUpload] upsert failed:", result.error);
    return { decision: "UPLOAD", asset: null, error: "Could not reserve media storage." };
  }

  return { decision: "UPLOAD", asset: toAsset(result.data as AssetRow) };
}

/**
 * Record that the bytes are present.
 *
 * Only called after the object has been OBSERVED in the bucket, so `stored`
 * means verified rather than reported. A client cannot mark its own upload
 * successful.
 */
export async function markMediaStored(input: {
  companyId: string;
  sourceJobId: string;
  byteSize: number;
  contentType: string;
  checksumSha256?: string | null;
  durationMs?: number | null;
  widthPx?: number | null;
  heightPx?: number | null;
  nowIso: string;
}): Promise<{ asset?: MarketingMediaAsset; error?: string }> {
  const client = createServiceRoleClient();
  const result = await assetsTable(client)
    .update({
      upload_state: "stored",
      byte_size: input.byteSize,
      content_type: input.contentType,
      checksum_sha256: input.checksumSha256 ?? null,
      duration_ms: input.durationMs ?? null,
      width_px: input.widthPx ?? null,
      height_px: input.heightPx ?? null,
      stored_at: input.nowIso,
    })
    .eq("company_id", input.companyId)
    .eq("source_job_id", input.sourceJobId)
    .select("*")
    .maybeSingle();

  if (result.error || !result.data) {
    console.error("[markMediaStored] update failed:", result.error);
    return { error: "Could not record the stored media." };
  }
  return { asset: toAsset(result.data as AssetRow) };
}

export async function markMediaFailed(input: {
  companyId: string;
  sourceJobId: string;
}): Promise<void> {
  const client = createServiceRoleClient();
  const result = await assetsTable(client)
    .update({ upload_state: "failed" })
    .eq("company_id", input.companyId)
    .eq("source_job_id", input.sourceJobId)
    .eq("upload_state", "pending");

  if (result.error) {
    console.error("[markMediaFailed] update failed:", result.error);
  }
}

/** Stored media for a company, for the control plane's video section. */
export async function listStoredMediaAssets(
  companyId: string,
  limit = 50,
): Promise<MarketingMediaAsset[]> {
  const client = createServiceRoleClient();
  const result = await assetsTable(client)
    .select("*")
    .eq("company_id", companyId)
    .eq("upload_state", "stored")
    .order("stored_at", { ascending: false })
    .limit(limit);

  if (result.error || !result.data) return [];
  return (result.data as AssetRow[]).map(toAsset);
}
