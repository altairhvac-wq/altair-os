import { NextResponse } from "next/server";
import { verifyManageLink } from "@/lib/directory/links";
import { getListingRecord } from "@/lib/directory/listings";
import { uploadPendingImage, viewableImageUrl } from "@/lib/directory/media";
import { isDirectory214Installed } from "@/lib/directory/schema";
import { enforcePublicRateLimit, resolveRequestAddress } from "@/lib/security/public-rate-limit";

export const runtime = "nodejs";

/**
 * A lister uploads a logo or a photo for their listing (migration 214).
 *
 * The lister has no account: the proof is the signed manage link from their
 * email (id + signature), posted with the file and checked here. The file is
 * stored in the PRIVATE pending bucket and nothing else changes: it is not
 * part of the listing until the lister saves their image set, and not public
 * until a person approves it.
 *
 * Only PNG, JPEG or WebP, by the file's own first bytes, and within the size
 * limit (lib/directory/media.ts). The answer is the new image's key and a
 * short-lived link so the lister can see what they uploaded.
 */

const MAX_REQUEST_BYTES = 3_500_000;

function refuse(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request): Promise<Response> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_REQUEST_BYTES) return refuse("That image is too large. Use one under 3 MB.", 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return refuse("The upload did not arrive. Please try again.", 400);
  }

  // The image buckets arrive with migration 214.
  if (!(await isDirectory214Installed())) return refuse("Images can be added after an update that is coming shortly. Please try again later.", 503);

  const id = form.get("id");
  const token = form.get("t");
  if (!verifyManageLink(id, token)) return refuse("This link is not valid any more. Open the link from your email again.", 403);

  const limit = await enforcePublicRateLimit("public.token_view", { ip: await resolveRequestAddress() });
  if (!limit.allowed) return refuse("Too many uploads at once. Please wait a minute and try again.", 429);

  const record = await getListingRecord(id);
  if (!record || record.status === "removed") return refuse("This listing cannot take images.", 404);

  const kind = form.get("kind") === "logo" ? "logo" : "photo";
  const file = form.get("file");
  if (!(file instanceof Blob)) return refuse("Choose an image to upload.", 400);
  const bytes = new Uint8Array(await file.arrayBuffer());

  const stored = await uploadPendingImage(record.id, kind, bytes);
  if (!stored.ok) {
    if (stored.reason === "type") return refuse("Use a PNG, JPEG or WebP image.", 415);
    if (stored.reason === "size") return refuse(kind === "logo" ? "Use a logo under 1 MB." : "Use a photo under 3 MB.", 413);
    return refuse("The image could not be saved just now. Please try again in a few minutes.", 503);
  }
  const url = await viewableImageUrl(stored.key, record.id);
  return NextResponse.json({ ok: true, key: stored.key, url });
}
