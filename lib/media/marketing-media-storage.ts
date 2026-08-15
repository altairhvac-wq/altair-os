import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  MARKETING_MEDIA_BUCKET,
  MEDIA_READ_URL_TTL_SECONDS,
  MEDIA_UPLOAD_URL_TTL_SECONDS,
  buildMediaObjectKey,
  mediaKeyBelongsToCompany,
  type MediaReadGrant,
} from "@/shared/types/marketing-media";

/**
 * Minting grants against the private `marketing-media` bucket.
 *
 * ==================== EVERY GRANT IS TEMPORARY ====================
 * Nothing in this module returns anything durable. An upload grant lives an
 * hour, a read grant fifteen minutes, and NEITHER is ever written to a
 * database by this module or by its callers. That rule has been standing
 * since the first architecture audit — "do not persist signed URLs or other
 * temporary capabilities as durable contract fields" — and this is the module
 * where it would be easiest to break, so it is stated here rather than
 * assumed.
 *
 * ================= SERVICE ROLE IS THE ONLY WAY IN =================
 * Migration 144 creates the bucket private with NO storage.objects policy for
 * `authenticated` or `anon`. Storage RLS denies by default, so the service
 * role is the only identity that can read or write these objects. Every
 * access therefore passes through server-side code that has already
 * authorized the caller — there is no path where a browser reaches the bytes
 * without this deployment deciding it may.
 *
 * ================= THE COMPANY IS BOUND, NOT PASSED =================
 * Both functions DERIVE the object key from a company id the caller has
 * already authorized. Neither accepts a key. A function that took a key from
 * a request payload would let the payload choose which company's prefix it
 * addressed, which is exactly the failure the snapshot ingest route avoids by
 * binding the company server-side.
 */

type SignedUploadGrant = {
  /** Short-lived. Never persisted. */
  readonly url: string;
  /** Supabase's upload token, paired with the URL. Never persisted. */
  readonly token: string;
  readonly objectKey: string;
  readonly bucket: string;
  readonly expiresAt: string;
};

/**
 * A grant to WRITE one specific object.
 *
 * Scoped to a single derived key, so the grant cannot be used to write
 * anywhere else in the bucket — including another company's prefix. This is
 * why the operator's laptop never needs storage credentials of its own: it
 * receives a capability narrow enough to be safe to hand out.
 */
export async function createMediaUploadGrant(input: {
  readonly companyId: string;
  readonly sourceJobId: string;
  readonly nowMs: number;
}): Promise<{ grant?: SignedUploadGrant; error?: string }> {
  let objectKey: string;
  try {
    objectKey = buildMediaObjectKey({
      companyId: input.companyId,
      sourceJobId: input.sourceJobId,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid media reference." };
  }

  const client = createServiceRoleClient();
  const result = await client.storage
    .from(MARKETING_MEDIA_BUCKET)
    .createSignedUploadUrl(objectKey, { upsert: true });

  if (result.error || !result.data) {
    // The key is safe to log — it is an identifier, not a capability. The
    // signed URL is not logged, here or anywhere.
    console.error("[createMediaUploadGrant] failed:", {
      objectKey,
      message: result.error?.message,
    });
    return { error: "Could not create an upload grant for this media." };
  }

  return {
    grant: {
      url: result.data.signedUrl,
      token: result.data.token,
      objectKey,
      bucket: MARKETING_MEDIA_BUCKET,
      expiresAt: new Date(
        input.nowMs + MEDIA_UPLOAD_URL_TTL_SECONDS * 1000,
      ).toISOString(),
    },
  };
}

/**
 * A grant to READ one specific object, for a provider that must fetch it.
 *
 * The company check is not ceremony: it turns a mis-scoped database query
 * into a refusal instead of a cross-tenant media leak. The key already
 * carries its owner as its first path segment, so the check is cheap and
 * cannot be forgotten by a caller who forgets to filter.
 */
export async function createMediaReadGrant(input: {
  readonly companyId: string;
  readonly objectKey: string;
  readonly contentType: string;
  readonly byteSize: number | null;
  readonly nowMs: number;
}): Promise<{ grant?: MediaReadGrant; error?: string }> {
  if (!mediaKeyBelongsToCompany(input.objectKey, input.companyId)) {
    console.error("[createMediaReadGrant] cross-company key refused:", {
      objectKey: input.objectKey,
    });
    return { error: "This media does not belong to the active company." };
  }

  const client = createServiceRoleClient();
  const result = await client.storage
    .from(MARKETING_MEDIA_BUCKET)
    .createSignedUrl(input.objectKey, MEDIA_READ_URL_TTL_SECONDS);

  if (result.error || !result.data?.signedUrl) {
    console.error("[createMediaReadGrant] failed:", {
      objectKey: input.objectKey,
      message: result.error?.message,
    });
    return { error: "Could not create a read grant for this media." };
  }

  return {
    grant: {
      url: result.data.signedUrl,
      expiresAt: new Date(
        input.nowMs + MEDIA_READ_URL_TTL_SECONDS * 1000,
      ).toISOString(),
      objectKey: input.objectKey,
      contentType: input.contentType,
      byteSize: input.byteSize,
    },
  };
}

/**
 * Whether the bytes are actually there.
 *
 * Called after an upload is reported complete, so `stored` means observed
 * rather than claimed. Without it a client could report success it never
 * achieved and the control plane would show a video that does not exist.
 */
export async function mediaObjectExists(objectKey: string): Promise<boolean> {
  const client = createServiceRoleClient();
  const slash = objectKey.lastIndexOf("/");
  const prefix = slash === -1 ? "" : objectKey.slice(0, slash);
  const name = slash === -1 ? objectKey : objectKey.slice(slash + 1);

  const result = await client.storage
    .from(MARKETING_MEDIA_BUCKET)
    .list(prefix, { search: name, limit: 1 });

  if (result.error || !result.data) {
    console.error("[mediaObjectExists] list failed:", {
      objectKey,
      message: result.error?.message,
    });
    return false;
  }
  return result.data.some((entry) => entry.name === name);
}
