"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Profile photo upload (profiles.avatar_url — the column existed since
 * 001_core_auth.sql; this is the first write path). Two entry points:
 *
 * - updateOwnAvatarAction: any signed-in user sets their own photo.
 * - updateMemberAvatarAction: owner/admin sets a member's photo from the
 *   Team member profile (verified against a membership in THEIR company).
 *
 * Uploads go through the service role client after the permission checks
 * here — mirroring the app's established privileged-write pattern — into
 * the public `avatars` bucket (migration 132), pathed {userId}/avatar-*.
 * The timestamped filename busts CDN caches on replacement.
 */

const ALLOWED_AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024; // matches bucket limit

export type AvatarActionResult = {
  error?: string;
  avatarUrl?: string;
};

function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

async function uploadAvatarForUser(
  userId: string,
  file: File,
): Promise<AvatarActionResult> {
  const mime = file.type.toLowerCase();

  if (!ALLOWED_AVATAR_MIME_TYPES.includes(mime)) {
    return { error: "Photo must be a JPEG, PNG, or WebP image." };
  }

  if (file.size <= 0 || file.size > MAX_AVATAR_FILE_SIZE) {
    return { error: "Photo must be between 1 byte and 5 MB." };
  }

  const service = createServiceRoleClient();
  const path = `${userId}/avatar-${Date.now()}.${extensionForMime(mime)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await service.storage
    .from("avatars")
    .upload(path, bytes, { contentType: mime, upsert: true });

  if (uploadError) {
    return { error: "Photo upload failed. Please try again." };
  }

  const { data: publicUrlData } = service.storage
    .from("avatars")
    .getPublicUrl(path);

  const avatarUrl = publicUrlData.publicUrl;

  const { error: profileError } = await service
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId);

  if (profileError) {
    return { error: "Photo uploaded but could not be saved to the profile." };
  }

  return { avatarUrl };
}

function revalidateAvatarSurfaces() {
  // The avatar renders in both shells' chrome — bust the layouts.
  revalidatePath("/", "layout");
  revalidatePath("/technician", "layout");
  revalidatePath("/team");
}

/** Any signed-in user updates their own photo (header avatar tap). */
export async function updateOwnAvatarAction(
  formData: FormData,
): Promise<AvatarActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { error: "No photo was selected." };
  }

  const result = await uploadAvatarForUser(context.user.id, file);

  if (result.error) {
    return result;
  }

  revalidateAvatarSurfaces();
  return result;
}

/** Owner/admin sets a member's photo from their Team profile. */
export async function updateMemberAvatarAction(
  membershipId: string,
  formData: FormData,
): Promise<AvatarActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (context.role !== "owner" && context.role !== "admin") {
    return { error: "Only owners and admins can change member photos." };
  }

  const normalizedMembershipId = membershipId.trim();

  if (!normalizedMembershipId) {
    return { error: "Team member not found." };
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { error: "No photo was selected." };
  }

  // Resolve the membership inside the caller's own company only.
  const service = createServiceRoleClient();
  const { data: membership, error: membershipError } = await service
    .from("company_memberships")
    .select("id, user_id, company_id")
    .eq("id", normalizedMembershipId)
    .eq("company_id", context.company.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return { error: "Team member not found." };
  }

  if (!membership.user_id) {
    return { error: "Team member not found." };
  }

  const result = await uploadAvatarForUser(membership.user_id, file);

  if (result.error) {
    return result;
  }

  revalidateAvatarSurfaces();
  revalidatePath(`/team/${normalizedMembershipId}`);
  return result;
}
