"use server";

import { revalidatePath } from "next/cache";
import {
  sendChangesDeclinedEmail,
  sendPermissionAddedEmail,
  sendLiveEmail,
  sendNotPublishedEmail,
} from "@/lib/directory/emails";
import {
  approveListing,
  approveListingChanges,
  createListingWithPermission,
  discardListingChanges,
  rejectListing,
  removeListingAsOwner,
  resolveListingReports,
  type DirectoryListingRecord,
  type ReviewOutcome,
} from "@/lib/directory/listings";
import { isDirectory214Installed } from "@/lib/directory/schema";
import { getCurrentUser } from "@/lib/database/auth";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin";
import {
  DIRECTORY_LIMITS,
  DIRECTORY_PATH,
  directoryListingPath,
  normalizeDirectoryEmail,
  validateListingInput,
  validatePermissionInput,
  type DirectoryFieldErrors,
  type DirectoryPermissionErrors,
} from "@/shared/types/directory";

/**
 * The owner's side of the public directory: approve, decline, take down.
 *
 * Platform admins only. Every action checks the session itself; the page
 * being behind the platform layout is not the authorisation. These are the
 * ONLY actions that can make a listing, or a change to one, public.
 *
 * Each decision emails the lister. If that email cannot be sent the decision
 * still stands and the result says so, because approving a listing must not
 * depend on the mail provider being up.
 */

export type DirectoryReviewActionResult = { error?: string; success?: string; warning?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function requireReviewer(): Promise<string | null> {
  const user = await getCurrentUser();
  return user && canAccessPlatformAdmin(user) ? user.id : null;
}

function cleanNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const note = value.replace(/\s+/g, " ").trim().slice(0, DIRECTORY_LIMITS.reviewNote.max);
  return note === "" ? null : note;
}

function failure(outcome: Exclude<ReviewOutcome, { status: "done" }>): DirectoryReviewActionResult {
  if (outcome.status === "not_found") return { error: "That listing no longer exists." };
  if (outcome.status === "not_allowed") return { error: "That listing has changed since this page loaded. Refresh and try again." };
  return { error: "The directory could not be updated just now. Please try again." };
}

function revalidate(record: DirectoryListingRecord): void {
  revalidatePath("/platform/directory");
  revalidatePath(DIRECTORY_PATH);
  revalidatePath(directoryListingPath(record.slug));
}

const MAIL_WARNING = "The email to the business could not be sent, so they have not been told.";
const MEDIA_WARNING = "The images could not be published just now; they are still waiting. Press Approve the change again to retry.";

export async function approveListingAction(listingId: string): Promise<DirectoryReviewActionResult> {
  const reviewer = await requireReviewer();
  if (!reviewer) return { error: "You do not have permission to review directory listings." };
  if (!UUID.test(listingId)) return { error: "That listing no longer exists." };

  const outcome = await approveListing(listingId, reviewer);
  if (outcome.status !== "done") return failure(outcome);
  revalidate(outcome.record);
  const mail = await sendLiveEmail(
    outcome.record.contactEmail,
    { id: outcome.record.id, slug: outcome.record.slug, businessName: outcome.record.fields.businessName },
    false,
  );
  const warnings = [outcome.mediaFailed ? MEDIA_WARNING : null, mail.ok ? null : MAIL_WARNING].filter(Boolean).join(" ");
  return {
    success: mail.ok ? "Published. The business has been emailed." : "Published.",
    ...(warnings ? { warning: warnings } : {}),
  };
}

export async function rejectListingAction(listingId: string, note: string): Promise<DirectoryReviewActionResult> {
  const reviewer = await requireReviewer();
  if (!reviewer) return { error: "You do not have permission to review directory listings." };
  if (!UUID.test(listingId)) return { error: "That listing no longer exists." };

  const reason = cleanNote(note);
  const outcome = await rejectListing(listingId, reviewer, reason);
  if (outcome.status !== "done") return failure(outcome);
  revalidate(outcome.record);
  const mail = await sendNotPublishedEmail(
    outcome.record.contactEmail,
    { id: outcome.record.id, businessName: outcome.record.fields.businessName },
    reason,
    false,
  );
  return mail.ok ? { success: "Declined. The business has been emailed." } : { success: "Declined.", warning: MAIL_WARNING };
}

export async function approveListingChangesAction(listingId: string): Promise<DirectoryReviewActionResult> {
  const reviewer = await requireReviewer();
  if (!reviewer) return { error: "You do not have permission to review directory listings." };
  if (!UUID.test(listingId)) return { error: "That listing no longer exists." };

  const outcome = await approveListingChanges(listingId, reviewer);
  if (outcome.status !== "done") return failure(outcome);
  revalidate(outcome.record);
  const mail = await sendLiveEmail(
    outcome.record.contactEmail,
    { id: outcome.record.id, slug: outcome.record.slug, businessName: outcome.record.fields.businessName },
    true,
  );
  const warnings = [outcome.mediaFailed ? MEDIA_WARNING : null, mail.ok ? null : MAIL_WARNING].filter(Boolean).join(" ");
  return {
    success: mail.ok ? "Change published. The business has been emailed." : "Change published.",
    ...(warnings ? { warning: warnings } : {}),
  };
}

export async function discardListingChangesAction(listingId: string): Promise<DirectoryReviewActionResult> {
  const reviewer = await requireReviewer();
  if (!reviewer) return { error: "You do not have permission to review directory listings." };
  if (!UUID.test(listingId)) return { error: "That listing no longer exists." };

  const outcome = await discardListingChanges(listingId, reviewer);
  if (outcome.status !== "done") return failure(outcome);
  revalidate(outcome.record);
  const mail = await sendChangesDeclinedEmail(outcome.record.contactEmail, {
    id: outcome.record.id,
    slug: outcome.record.slug,
    businessName: outcome.record.fields.businessName,
  });
  return mail.ok
    ? { success: "Change declined. The listing is unchanged and the business has been emailed." }
    : { success: "Change declined. The listing is unchanged.", warning: MAIL_WARNING };
}

export async function removeListingAsOwnerAction(listingId: string, note: string): Promise<DirectoryReviewActionResult> {
  const reviewer = await requireReviewer();
  if (!reviewer) return { error: "You do not have permission to review directory listings." };
  if (!UUID.test(listingId)) return { error: "That listing no longer exists." };

  const reason = cleanNote(note);
  const outcome = await removeListingAsOwner(listingId, reviewer, reason);
  if (outcome.status !== "done") return failure(outcome);
  revalidate(outcome.record);
  await resolveListingReports(listingId);
  const mail = await sendNotPublishedEmail(
    outcome.record.contactEmail,
    { id: outcome.record.id, businessName: outcome.record.fields.businessName },
    reason,
    true,
  );
  return mail.ok ? { success: "Taken down. The business has been emailed." } : { success: "Taken down.", warning: MAIL_WARNING };
}

export type AddWithPermissionResult = DirectoryReviewActionResult & {
  errors?: DirectoryFieldErrors & DirectoryPermissionErrors;
  /** What was typed, so a form with a mistake keeps everything else. */
  values?: Record<string, string>;
  /** Set when a listing was created. */
  slug?: string;
};

const PERMISSION_FIELDS = [
  "businessName",
  "tradeType",
  "phone",
  "website",
  "city",
  "state",
  "serviceArea",
  "services",
  "contactEmail",
  "permissionGivenBy",
  "permissionGivenAt",
  "permissionNote",
  "publish",
] as const;

/**
 * "Add a business with permission" (migration 214). The owner phoned the
 * business, it said yes, and he enters its PUBLIC details plus its email so
 * it can confirm. Who gave permission and when are required and stored.
 *
 * Platform admins only, checked here. The business is emailed its
 * confirm / manage link at once, saying who agreed and when, and can
 * confirm, edit or remove the listing in one step like any lister. The
 * listing waits for that confirmation unless the owner chooses "publish
 * now", in which case it is live and marked as awaiting confirmation.
 */
export async function addListingWithPermissionAction(formData: FormData): Promise<AddWithPermissionResult> {
  const reviewer = await requireReviewer();
  if (!reviewer) return { error: "You do not have permission to add directory listings." };
  if (!(await isDirectory214Installed())) return { error: "This needs the directory update (migration 214). Run it first, then try again." };

  const values: Record<string, string> = {};
  for (const name of PERMISSION_FIELDS) {
    if (name === "services") {
      values.services = formData
        .getAll("services")
        .filter((item): item is string => typeof item === "string")
        .slice(0, 40)
        .map((item) => item.replace(/,/g, "").slice(0, 48))
        .join(",");
      continue;
    }
    const value = formData.get(name);
    if (typeof value === "string") values[name] = value.slice(0, 600);
  }

  const checked = validateListingInput(values);
  const permission = validatePermissionInput(values);
  const contactEmail = normalizeDirectoryEmail(values.contactEmail);
  const errors: AddWithPermissionResult["errors"] = {
    ...(checked.ok ? {} : checked.errors),
    ...(permission.ok ? {} : permission.errors),
    ...(contactEmail ? {} : { contactEmail: "Enter the business's email so it can confirm the listing." }),
  };
  if (!checked.ok || !permission.ok || !contactEmail) {
    return { error: "Some details need another look. They are marked below.", errors, values };
  }

  const created = await createListingWithPermission(checked.fields, contactEmail, permission.permission, reviewer);
  if (created.status === "exists") {
    return { error: "This business is already in the directory from that email address. Find it in the lists below.", values };
  }
  if (created.status === "unavailable") return { error: "The listing could not be saved just now. Please try again.", values };

  revalidatePath("/platform/directory");
  if (created.published) {
    revalidatePath(DIRECTORY_PATH);
    revalidatePath(directoryListingPath(created.slug));
  }
  const mail = await sendPermissionAddedEmail(
    contactEmail,
    { id: created.id, businessName: checked.fields.businessName },
    permission.permission,
    created.published,
  );
  const success = created.published
    ? "Added and published, marked as awaiting the business's confirmation."
    : "Added. It waits for the business to confirm by email, then for your review.";
  return {
    success: mail.ok ? `${success} The business has been emailed.` : success,
    ...(mail.ok ? {} : { warning: "The email to the business could not be sent, so they have not been told. Ask them to use “Manage your listing” on the directory to get their link." }),
    slug: created.slug,
  };
}

/** Marks a listing's reports as dealt with, leaving the listing as it is. */
export async function resolveListingReportsAction(listingId: string): Promise<DirectoryReviewActionResult> {
  const reviewer = await requireReviewer();
  if (!reviewer) return { error: "You do not have permission to review directory listings." };
  if (!UUID.test(listingId)) return { error: "That listing no longer exists." };

  const ok = await resolveListingReports(listingId);
  if (!ok) return { error: "The reports could not be updated just now. Please try again." };
  revalidatePath("/platform/directory");
  return { success: "Reports cleared. The listing is unchanged." };
}
