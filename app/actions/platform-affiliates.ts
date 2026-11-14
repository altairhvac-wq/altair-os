"use server";

import { revalidatePath } from "next/cache";
import { decideApplication } from "@/lib/affiliates/applications";
import { getCurrentUser } from "@/lib/database/auth";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin";
import {
  AFFILIATES_REVIEW_PATH,
  AFFILIATE_LIMITS,
  isAffiliateStatus,
  normalizePartnerCode,
} from "@/shared/types/affiliates";

/**
 * The owner's side of the affiliate program: approve an application, decline
 * it, or put it back to waiting.
 *
 * Platform admins only. The action checks the session itself; the page being
 * behind the platform layout is not the authorisation.
 *
 * A decision is a record and nothing more. It sends no email, creates no code
 * in Stripe and pays nobody. The review screen shows the welcome message for
 * the owner to send, and reminds them to make the code in Stripe.
 */

export type AffiliateReviewActionResult = { error?: string; success?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function cleanNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const note = value.replace(/\s+/g, " ").trim().slice(0, AFFILIATE_LIMITS.reviewNote.max);
  return note === "" ? null : note;
}

export async function decideAffiliateApplicationAction(input: {
  applicationId: string;
  status: string;
  partnerCode?: string;
  note?: string;
}): Promise<AffiliateReviewActionResult> {
  const user = await getCurrentUser();
  if (!user || !canAccessPlatformAdmin(user)) {
    return { error: "You do not have permission to review partner applications." };
  }
  if (typeof input?.applicationId !== "string" || !UUID.test(input.applicationId)) {
    return { error: "That application no longer exists." };
  }
  if (!isAffiliateStatus(input.status)) return { error: "Choose approve or decline." };

  let partnerCode: string | null = null;
  if (input.status === "approved") {
    partnerCode = normalizePartnerCode(input.partnerCode);
    if (!partnerCode) {
      const { min, max } = AFFILIATE_LIMITS.partnerCode;
      return { error: `Give the partner a code: ${min} to ${max} letters or numbers, no spaces.` };
    }
  }

  const outcome = await decideApplication({
    id: input.applicationId,
    reviewerId: user.id,
    status: input.status,
    partnerCode,
    reviewNote: cleanNote(input.note),
  });

  switch (outcome.status) {
    case "done":
      revalidatePath(AFFILIATES_REVIEW_PATH);
      return {
        success:
          input.status === "approved"
            ? "Approved. Nothing was sent: make the code in Stripe, then send the welcome message below."
            : input.status === "declined"
              ? "Declined. Nothing was sent to the applicant."
              : "Moved back to waiting.",
      };
    case "not_found":
      return { error: "That application no longer exists." };
    case "code_taken":
      return {
        error:
          input.status === "approved"
            ? "Another partner already has that code. Choose a different one."
            : "This person has a newer application waiting. Decide that one instead.",
      };
    default:
      return { error: "The application could not be updated just now. Please try again." };
  }
}
