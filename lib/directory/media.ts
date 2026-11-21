import "server-only";

import { randomUUID } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { DIRECTORY_DETAIL_LIMITS } from "@/shared/types/directory";

/**
 * A directory listing's logo and photos (migration 214).
 *
 * ============ TWO BUCKETS ============
 *   directory-pending  private. Every upload lands here. Only the service
 *                      role reads it, and people see a pending image only
 *                      through a short-lived signed link: the lister on
 *                      their own manage page, the owner on the review screen.
 *   directory-public   public read. A file arrives here only by
 *                      `publishMediaSet`, which only an approval calls.
 *
 * ============ KEYS ============
 * A proposed set names each image by bucket and path:
 *   "public/<listing id>/<file>"   already approved, kept as it is
 *   "pending/<listing id>/<file>"  uploaded, waiting
 * Every path is inside the listing's own folder, and `parseMediaSet` refuses
 * anything else, so one listing's proposal can never point at another's file.
 *
 * ============ WHAT IS ACCEPTED ============
 * PNG, JPEG or WebP, checked by the file's own first bytes, not by its name
 * or the type the browser claims. No SVG (it can carry script). The browser
 * resizes and re-encodes photos before upload, which also drops camera
 * metadata such as GPS position; the server still enforces the byte limits.
 */

export const DIRECTORY_PUBLIC_BUCKET = "directory-public";
export const DIRECTORY_PENDING_BUCKET = "directory-pending";

export type DirectoryMediaSet = { logo: string | null; photos: string[] };

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const FILE_PATH = new RegExp(`^(${UUID})/(${UUID})\\.(png|jpg|webp)$`);
const KEY = new RegExp(`^(public|pending)/(${UUID}/${UUID}\\.(png|jpg|webp))$`);

function logFailure(what: string, error: unknown): void {
  const code = (error as { code?: string; statusCode?: string } | null)?.code ?? (error as { statusCode?: string } | null)?.statusCode ?? "unknown";
  console.error(`[directory-media] ${what} failed:`, { code });
}

function keyFor(key: string, listingId: string): { bucket: "public" | "pending"; path: string } | null {
  const match = KEY.exec(key);
  if (!match) return null;
  const path = match[2];
  if (!path.startsWith(`${listingId}/`)) return null;
  return { bucket: match[1] as "public" | "pending", path };
}

/** A stored or submitted proposal, checked. Null when it is absent or not a valid set for this listing. */
export function parseMediaSet(value: unknown, listingId: string): DirectoryMediaSet | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as { logo?: unknown; photos?: unknown };
  const logo = typeof raw.logo === "string" && keyFor(raw.logo, listingId) ? raw.logo : null;
  if (raw.logo !== null && raw.logo !== undefined && logo === null) return null;
  const photos = Array.isArray(raw.photos) ? raw.photos : [];
  if (photos.length > DIRECTORY_DETAIL_LIMITS.photos.max) return null;
  const checked: string[] = [];
  for (const photo of photos) {
    if (typeof photo !== "string" || !keyFor(photo, listingId) || checked.includes(photo)) return null;
    checked.push(photo);
  }
  return { logo, photos: checked };
}

/** The public address of an approved file. Null for anything that is not a public-bucket path. */
export function publicImageUrl(path: string): string | null {
  if (!FILE_PATH.test(path)) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/${DIRECTORY_PUBLIC_BUCKET}/${path}`;
}

/**
 * Where a person who may see it can look at an image: the public address
 * for an approved one, a ten-minute signed link for a pending one.
 */
export async function viewableImageUrl(key: string, listingId: string): Promise<string | null> {
  const parsed = keyFor(key, listingId);
  if (!parsed) return null;
  if (parsed.bucket === "public") return publicImageUrl(parsed.path);
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.storage.from(DIRECTORY_PENDING_BUCKET).createSignedUrl(parsed.path, 600);
    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    logFailure("signed link", error);
    return null;
  }
}

export async function viewableMediaSet(set: DirectoryMediaSet, listingId: string): Promise<{ logo: string | null; photos: { key: string; url: string }[] }> {
  const logo = set.logo ? await viewableImageUrl(set.logo, listingId) : null;
  const photos: { key: string; url: string }[] = [];
  for (const key of set.photos) {
    const url = await viewableImageUrl(key, listingId);
    if (url) photos.push({ key, url });
  }
  return { logo, photos };
}

/** The image type by its first bytes, or null. */
export function sniffImageType(bytes: Uint8Array): { ext: "png" | "jpg" | "webp"; contentType: string } | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { ext: "png", contentType: "image/png" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", contentType: "image/jpeg" };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { ext: "webp", contentType: "image/webp" };
  }
  return null;
}

export type UploadOutcome = { ok: true; key: string } | { ok: false; reason: "type" | "size" | "unavailable" };

/** Stores one upload in the PRIVATE bucket and returns its "pending/..." key. Nothing is public. */
export async function uploadPendingImage(listingId: string, kind: "logo" | "photo", bytes: Uint8Array): Promise<UploadOutcome> {
  const limit = kind === "logo" ? DIRECTORY_DETAIL_LIMITS.logoBytes.max : DIRECTORY_DETAIL_LIMITS.photoBytes.max;
  if (bytes.length === 0 || bytes.length > limit) return { ok: false, reason: "size" };
  const type = sniffImageType(bytes);
  if (!type) return { ok: false, reason: "type" };
  const path = `${listingId}/${randomUUID()}.${type.ext}`;
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.storage.from(DIRECTORY_PENDING_BUCKET).upload(path, bytes, {
      contentType: type.contentType,
      upsert: false,
      cacheControl: "60",
    });
    if (error) throw error;
    return { ok: true, key: `pending/${path}` };
  } catch (error) {
    logFailure("upload", error);
    return { ok: false, reason: "unavailable" };
  }
}

/**
 * Copies a proposal's pending files into the public bucket. Returns the new
 * public paths, or null if any copy failed (then nothing is pointed at them,
 * and the files already copied are removed again).
 */
export async function publishMediaSet(listingId: string, set: DirectoryMediaSet): Promise<{ logoPath: string | null; photoPaths: string[] } | null> {
  const supabase = createServiceRoleClient();
  const copied: string[] = [];
  const toPublic = async (key: string): Promise<string | null> => {
    const parsed = keyFor(key, listingId);
    if (!parsed) return null;
    if (parsed.bucket === "public") return parsed.path;
    const download = await supabase.storage.from(DIRECTORY_PENDING_BUCKET).download(parsed.path);
    if (download.error || !download.data) {
      logFailure("publish download", download.error);
      return null;
    }
    const bytes = new Uint8Array(await download.data.arrayBuffer());
    const type = sniffImageType(bytes);
    if (!type) return null;
    const uploaded = await supabase.storage.from(DIRECTORY_PUBLIC_BUCKET).upload(parsed.path, bytes, {
      contentType: type.contentType,
      upsert: true,
      cacheControl: "604800",
    });
    if (uploaded.error) {
      logFailure("publish upload", uploaded.error);
      return null;
    }
    copied.push(parsed.path);
    return parsed.path;
  };

  try {
    const logoPath = set.logo ? await toPublic(set.logo) : null;
    if (set.logo && !logoPath) throw new Error("logo copy");
    const photoPaths: string[] = [];
    for (const key of set.photos) {
      const path = await toPublic(key);
      if (!path) throw new Error("photo copy");
      photoPaths.push(path);
    }
    return { logoPath, photoPaths };
  } catch (error) {
    logFailure("publish", error);
    if (copied.length > 0) await supabase.storage.from(DIRECTORY_PUBLIC_BUCKET).remove(copied);
    return null;
  }
}

function pendingPaths(set: DirectoryMediaSet | null, listingId: string | null): string[] {
  if (!set) return [];
  return [set.logo, ...set.photos]
    .filter((key): key is string => typeof key === "string" && key.startsWith("pending/"))
    .map((key) => key.slice("pending/".length))
    .filter((path) => (listingId ? path.startsWith(`${listingId}/`) : true));
}

/** Deletes the pending uploads of `set` that `keep` does not use. */
export async function discardPendingMedia(set: DirectoryMediaSet, keep: DirectoryMediaSet | null): Promise<void> {
  const kept = new Set(pendingPaths(keep, null));
  const gone = pendingPaths(set, null).filter((path) => !kept.has(path));
  if (gone.length === 0) return;
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.storage.from(DIRECTORY_PENDING_BUCKET).remove(gone);
    if (error) throw error;
  } catch (error) {
    logFailure("discard", error);
  }
}

/**
 * After an approval: removes the pending copies that were published, and the
 * previously approved public files the new set no longer uses.
 */
export async function cleanupReplacedMedia(
  previous: DirectoryMediaSet,
  proposal: DirectoryMediaSet,
  published: { logoPath: string | null; photoPaths: string[] },
): Promise<void> {
  const supabase = createServiceRoleClient();
  const live = new Set([published.logoPath, ...published.photoPaths].filter(Boolean) as string[]);
  const oldPublic = [previous.logo, ...previous.photos]
    .filter((key): key is string => typeof key === "string" && key.startsWith("public/"))
    .map((key) => key.slice("public/".length))
    .filter((path) => !live.has(path));
  try {
    const pending = pendingPaths(proposal, null);
    if (pending.length > 0) await supabase.storage.from(DIRECTORY_PENDING_BUCKET).remove(pending);
    if (oldPublic.length > 0) await supabase.storage.from(DIRECTORY_PUBLIC_BUCKET).remove(oldPublic);
  } catch (error) {
    logFailure("cleanup", error);
  }
}

/** Removes every image of a listing from both buckets: used when a listing is taken down. */
export async function deleteAllListingMedia(listingId: string): Promise<void> {
  if (!new RegExp(`^${UUID}$`).test(listingId)) return;
  const supabase = createServiceRoleClient();
  for (const bucket of [DIRECTORY_PUBLIC_BUCKET, DIRECTORY_PENDING_BUCKET]) {
    try {
      const listed = await supabase.storage.from(bucket).list(listingId, { limit: 100 });
      if (listed.error) throw listed.error;
      const paths = (listed.data ?? []).map((file) => `${listingId}/${file.name}`).filter((path) => FILE_PATH.test(path));
      if (paths.length > 0) await supabase.storage.from(bucket).remove(paths);
    } catch (error) {
      logFailure("delete all", error);
    }
  }
}
