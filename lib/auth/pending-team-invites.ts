import type { User } from "@supabase/supabase-js";
import { getCurrentProfile } from "@/lib/database/auth";
import {
  listPendingInvitesForUserEmail,
  resolveUserEmailForInvite,
} from "@/lib/database/queries/memberships";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { normalizeEmail } from "@/shared/lib/email-validation";

/**
 * Returns true when the signed-in user's email has pending team invites
 * that should defer automatic company bootstrap until acceptance on /setup.
 */
export async function userHasPendingTeamInvites(user: User): Promise<boolean> {
  const profile = await getCurrentProfile();
  const emailResolution = resolveUserEmailForInvite(
    profile?.email,
    user.email ?? undefined,
  );

  if (!emailResolution.email || emailResolution.mismatch) {
    return false;
  }

  const result = await listPendingInvitesForUserEmail(emailResolution.email);
  return result.invites.length > 0;
}

/**
 * Whether a team invite is waiting for an address that has NO account yet.
 *
 * ============ WHY THE SERVICE ROLE ============
 * This is asked at signup, before any session exists, so the user-scoped
 * client would see nothing: `company_memberships` RLS exposes invites to the
 * invitee only once they are signed in. The question is narrow — "is there an
 * open invite addressed to exactly this email" — and the answer is a boolean;
 * nothing about the inviting company leaves this function.
 *
 * ============ WHAT IT REVEALS ============
 * A signup attempt with no company name learns whether an invite exists for
 * the email it submitted. That is the same fact the invitee is about to be
 * shown on /setup, the attempt is rate-limited per address and per email, and
 * acting on a false positive requires confirming the inbox. Acceptable, and
 * far cheaper than the alternative the audit found (M4): making every invitee
 * invent a company name and a trade to get past the form.
 *
 * Errors read as "no invite" so a database blip degrades to the stricter
 * form, never the looser one.
 */
export async function emailHasPendingTeamInvite(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    return false;
  }

  try {
    const supabase = createServiceRoleClient();
    const { count, error } = await supabase
      .from("company_memberships")
      .select("id", { count: "exact", head: true })
      .eq("status", "invited")
      .is("user_id", null)
      .eq("invite_email", normalized);

    if (error) {
      console.error("[emailHasPendingTeamInvite] query failed:", {
        code: error.code,
      });
      return false;
    }

    return (count ?? 0) > 0;
  } catch (error) {
    console.error("[emailHasPendingTeamInvite] threw:", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}
