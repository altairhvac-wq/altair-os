import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import { buildMediaObjectKey, isSafeSourceJobId } from "@/shared/types/marketing-media";

/**
 * Storage for renders arriving from the editor's media bridge.
 *
 * ==================== WHY THIS FILE WAS REWRITTEN ====================
 * It inserted three columns — `render_id`, `content_sha256`, `mime_type` —
 * that do not exist. Not "were renamed later": no migration in this repo has
 * ever defined them, and a read of the LIVE schema confirms the table is
 * exactly migration 144. Every insert on this path would have failed on first
 * contact with the real database, which is why the bridge's heavily-audited
 * client had never once completed an upload.
 *
 * The applied schema represents the contract fully, so nothing here needed a
 * migration. The columns simply had to be the real ones:
 *
 *     render_id       -> source_job_id
 *     content_sha256  -> client_reported_sha256
 *     mime_type       -> content_type
 *
 * ==================== TWO THINGS THAT ARE NOT RENAMES ====================
 * 1. `upload_state`. It is NOT NULL and defaults to `'pending'`, and
 *    `listStoredMediaAssets` — the query that decides whether a render is
 *    offerable in the UI — filters on `'stored'`. Omitting it wrote rows that
 *    were durably invisible. This path receives the bytes and stores them in
 *    one call, so the row is `'stored'` the moment it exists.
 *
 * 2. The object key. It used to be
 *    `company/{id}/marketing/renders/{renderId}/{sha}.mp4`, which violates the
 *    table's own `object_key like '%/video/%'` check AND cannot be re-derived
 *    by `decideMediaRead`, which recomputes `${companyId}/video/${jobId}.mp4`
 *    and refuses a mismatch. Two independent guards were being failed by one
 *    key. It is now derived by `buildMediaObjectKey` — the same function the
 *    read path uses, so there is one definition of the key rather than two
 *    that agree by hand.
 *
 * The WIRE contract is unchanged. `MarketingMediaAsset` still returns
 * `renderId`, `contentSha256` and `mimeType`, because the editor's bridge
 * validates those field names and that hash. Only the mapping to storage
 * moved.
 */

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

function mediaTable(client: ServiceClient) {
  return (
    client as ServiceClient & {
      from(table: "marketing_media_assets"): ReturnType<ServiceClient["from"]>;
    }
  ).from("marketing_media_assets");
}

export const MARKETING_MEDIA_BUCKET = "marketing-media";
export const MARKETING_MEDIA_SIGNED_URL_TTL_SECONDS = 300;
/**
 * Stricter than the table's own 2 GB ceiling, on purpose: this route accepts a
 * whole file in one request body, and the limit that matters is what a single
 * request may cost, not what the column can hold.
 */
export const MARKETING_MEDIA_MAX_BYTES = 500 * 1024 * 1024;

export type MarketingMediaAsset = {
  id: string;
  companyId: string;
  renderId: string;
  objectKey: string;
  contentSha256: string;
  byteSize: number;
  mimeType: "video/mp4";
  createdAt: string;
};

export type MarketingMediaUpload = {
  companyId: string;
  renderId: string;
  contentSha256: string;
  byteSize: number;
  file: Uint8Array;
};

/** The real columns. Names here are the schema's, not the wire's. */
type MediaRow = {
  id: string;
  company_id: string;
  source_job_id: string;
  object_key: string;
  client_reported_sha256: string | null;
  byte_size: number | null;
  content_type: string;
  upload_state: string;
  created_at: string;
};

function toAsset(row: MediaRow): MarketingMediaAsset {
  return {
    id: row.id,
    companyId: row.company_id,
    renderId: row.source_job_id,
    objectKey: row.object_key,
    contentSha256: row.client_reported_sha256 ?? "",
    byteSize: Number(row.byte_size ?? 0),
    mimeType: "video/mp4",
    createdAt: row.created_at,
  };
}

/**
 * The storage key for a render.
 *
 * Delegates to `buildMediaObjectKey` rather than formatting its own string:
 * the read path recomputes the key from the row and refuses a mismatch, so two
 * hand-kept formats is one refactor away from an unopenable asset.
 *
 * The render id is VALIDATED, never sanitised. Rewriting `a.b` to `a_b` would
 * store a key that cannot be re-derived from the id the client sent, which is
 * precisely the mismatch the read path rejects — a silent break at preview
 * time instead of a loud one at upload time.
 */
export function buildMarketingMediaObjectKey(input: {
  companyId: string;
  renderId: string;
}): string {
  const companyId = input.companyId.trim();
  const renderId = input.renderId.trim();
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(companyId)) {
    throw new Error("Invalid company identity for a media key.");
  }
  if (!isSafeSourceJobId(renderId)) {
    throw new Error(
      "Render id must be alphanumeric with dashes or underscores, 1-128 characters.",
    );
  }
  return buildMediaObjectKey({ companyId, sourceJobId: renderId });
}

export async function findMarketingMediaAsset(input: {
  companyId: string;
  renderId: string;
}): Promise<MarketingMediaAsset | null> {
  const service = createServiceRoleClient();
  const { data, error } = await mediaTable(service)
    .select("*")
    .eq("company_id", input.companyId)
    .eq("source_job_id", input.renderId)
    .maybeSingle();
  if (error) throw new Error(`Media metadata lookup failed: ${error.message}`);
  return data ? toAsset(data as MediaRow) : null;
}

export async function uploadMarketingMedia(
  input: MarketingMediaUpload,
): Promise<MarketingMediaAsset> {
  if (input.byteSize <= 0 || input.byteSize > MARKETING_MEDIA_MAX_BYTES)
    throw new Error("Marketing media must be between 1 byte and 500 MB.");
  const existing = await findMarketingMediaAsset(input);
  if (existing) {
    if (
      existing.contentSha256 !== input.contentSha256 ||
      existing.byteSize !== input.byteSize
    )
      throw new Error("Render id is already bound to different media.");
    return existing;
  }
  const objectKey = buildMarketingMediaObjectKey(input);
  const service = createServiceRoleClient();
  const { error: uploadError } = await service.storage
    .from(MARKETING_MEDIA_BUCKET)
    .upload(objectKey, input.file, { contentType: "video/mp4", upsert: true });
  if (uploadError)
    throw new Error(`Marketing media upload failed: ${uploadError.message}`);
  const { data, error } = await mediaTable(service)
    .insert({
      company_id: input.companyId,
      source_job_id: input.renderId,
      bucket: MARKETING_MEDIA_BUCKET,
      object_key: objectKey,
      client_reported_sha256: input.contentSha256,
      byte_size: input.byteSize,
      content_type: "video/mp4",
      // The bytes are already in the bucket by the time this row is written,
      // so 'stored' is the truth. Leaving the 'pending' default would have
      // made every row invisible to `listStoredMediaAssets` and therefore to
      // every surface that offers a render.
      upload_state: "stored",
      stored_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error || !data) {
    const retry = await findMarketingMediaAsset(input);
    if (retry) {
      if (
        retry.contentSha256 !== input.contentSha256 ||
        retry.byteSize !== input.byteSize
      )
        throw new Error("Render id is already bound to different media.");
      return retry;
    }
    throw new Error(
      `Marketing media metadata write failed: ${error?.message ?? "unknown error"}`,
    );
  }
  return toAsset(data as MediaRow);
}

export async function createMarketingMediaSignedUrl(input: {
  companyId: string;
  assetId: string;
}): Promise<string> {
  const service = createServiceRoleClient();
  const { data, error } = await mediaTable(service)
    .select("object_key")
    .eq("id", input.assetId)
    .eq("company_id", input.companyId)
    .maybeSingle();
  if (error || !data) throw new Error("Marketing media asset not found.");
  const signed = await service.storage
    .from(MARKETING_MEDIA_BUCKET)
    .createSignedUrl(data.object_key, MARKETING_MEDIA_SIGNED_URL_TTL_SECONDS);
  if (signed.error || !signed.data?.signedUrl)
    throw new Error(
      `Marketing media signed URL failed: ${signed.error?.message ?? "unknown error"}`,
    );
  return signed.data.signedUrl;
}
