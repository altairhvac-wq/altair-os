import type { User } from "@supabase/supabase-js";
import { getCurrentProfile } from "@/lib/database/auth";
import {
  listPendingInvitesForUserEmail,
  resolveUserEmailForInvite,
} from "@/lib/database/queries/memberships";

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
