"use server";

import { revalidatePath } from "next/cache";
import {
  sendChangesDeclinedEmail,
  sendLiveEmail,
  sendNotPublishedEmail,
} from "@/lib/directory/emails";
import {
  approveListing,
  approveListingChanges,
  discardListingChanges,
  rejectListing,
  removeListingAsOwner,
  resolveListingReports,
  type DirectoryListingRecord,
  type ReviewOutcome,
} from "@/lib/directory/listings";
import { getCurrentUser } from "@/lib/database/auth";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin";
import { DIRECTORY_LIMITS, DIRECTORY_PATH, directoryListingPath } from "@/shared/types/directory";

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
  return mail.ok ? { success: "Published. The business has been emailed." } : { success: "Published.", warning: MAIL_WARNING };
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
  return mail.ok ? { success: "Change published. The business has been emailed." } : { success: "Change published.", warning: MAIL_WARNING };
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
