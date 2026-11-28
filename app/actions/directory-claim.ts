"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { linkListingToCompany, unlinkListingFromCompany } from "@/lib/directory/claims";
import {
  DIRECTORY_CLAIM_LIMIT,
  DIRECTORY_PATH,
  directoryListingPath,
  isValidListingSlug,
  normalizeDirectoryEmail,
} from "@/shared/types/directory";

/**
 * "Claim your listing": link a public directory listing to the workspace the
 * caller is signed in to, or remove that link.
 *
 * ============ WHO MAY LINK ============
 * Both must be true, and both are established here, on the server, from the
 * session. Nothing from the browser is trusted except which listing is meant.
 *   1. The caller is an owner or admin of the active workspace
 *      (`permissions.manageCompany`).
 *   2. The listing was confirmed with the same email address the caller signs
 *      in with, and that sign-in address is itself confirmed. Both inboxes
 *      were proven by an emailed link, so the same person controls both.
 * The email is read from the session and passed to the data layer, which
 * makes it part of the UPDATE's condition. A listing that is not the
 * caller's gives one answer whether it exists or not.
 *
 * ============ WHO MAY UNLINK ============
 * An owner or admin of the workspace the listing is linked to. The email
 * does not have to match: a workspace must always be able to take its own
 * name off a listing.
 *
 * Linking never changes what the listing says. The public details still go
 * through the directory owner's review.
 */

export type DirectoryClaimActionResult = { error?: string; success?: string };

type Caller =
  | { ok: true; companyId: string; email: string | null }
  | { ok: false; error: string };

async function resolveCaller(): Promise<Caller> {
  const context = await getActiveCompanyContext();
  if (!context) return { ok: false, error: "Sign in to your workspace first." };
  if (!context.permissions.manageCompany) {
    return { ok: false, error: "Only an owner or admin can link a listing to this workspace." };
  }
  // An unconfirmed sign-in address proves nothing about who owns the inbox.
  const user = await getCurrentUser();
  const email =
    user && user.id === context.user.id && user.email_confirmed_at ? normalizeDirectoryEmail(user.email) : null;
  return { ok: true, companyId: context.company.id, email };
}

function revalidate(slug: string): void {
  revalidatePath("/community");
  revalidatePath(DIRECTORY_PATH);
  revalidatePath(directoryListingPath(slug));
}

const NOT_YOURS =
  "That listing was not confirmed with the email you sign in with, so it cannot be linked from this account.";

export async function linkListingToWorkspaceAction(slug: string): Promise<DirectoryClaimActionResult> {
  const caller = await resolveCaller();
  if (!caller.ok) return { error: caller.error };
  if (!isValidListingSlug(slug) || !caller.email) return { error: NOT_YOURS };

  const outcome = await linkListingToCompany(slug, caller.email, caller.companyId);
  switch (outcome.status) {
    case "linked":
    case "already":
      revalidate(slug);
      // The screen itself now says what being linked means, and whether the
      // mark is showing; the message only confirms that it happened.
      return { success: "Linked." };
    case "not_yours":
      return { error: NOT_YOURS };
    case "linked_elsewhere":
      return { error: "That listing is already linked to another Altair workspace. Unlink it there first." };
    case "limit":
      return { error: `A workspace can link up to ${DIRECTORY_CLAIM_LIMIT} listings. Unlink one first.` };
    default:
      return { error: "The directory could not be updated just now. Please try again." };
  }
}

export async function unlinkListingFromWorkspaceAction(slug: string): Promise<DirectoryClaimActionResult> {
  const caller = await resolveCaller();
  if (!caller.ok) return { error: caller.error };
  if (!isValidListingSlug(slug)) return { error: "That listing is not linked to this workspace." };

  const outcome = await unlinkListingFromCompany(slug, caller.companyId);
  if (outcome === "unavailable") return { error: "The directory could not be updated just now. Please try again." };
  if (outcome === "not_linked") return { error: "That listing is not linked to this workspace." };
  revalidate(slug);
  return { success: "Unlinked. The listing itself stays public." };
}
