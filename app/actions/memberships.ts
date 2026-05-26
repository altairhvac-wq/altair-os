"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  acceptPendingInvite,
  createTeamInvite,
  resolveUserEmailForInvite,
  updateMemberRole,
} from "@/lib/database/queries/memberships";
import type { CompanyRole } from "@/lib/database/types/enums";
import type { TeamMember } from "@/shared/types/team-member";

export type UpdateMemberRoleActionResult = {
  error?: string;
  member?: TeamMember;
};

export type InviteTeamMemberActionResult = {
  error?: string;
  member?: TeamMember;
};

export type AcceptInviteActionResult = {
  error?: string;
  companyId?: string;
};

export async function acceptInviteAction(
  membershipId: string,
): Promise<AcceptInviteActionResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "You must be signed in to accept an invitation." };
  }

  const profile = await getCurrentProfile();
  const emailResolution = resolveUserEmailForInvite(
    profile?.email,
    user.email ?? undefined,
  );

  if (emailResolution.mismatch) {
    return {
      error:
        "Your profile email and sign-in email do not match. Update them to the same address before accepting an invitation.",
    };
  }

  const email = emailResolution.email;

  if (!email) {
    return {
      error:
        "Your account email could not be verified. Update your profile email and try again.",
    };
  }

  const result = await acceptPendingInvite(membershipId, user.id, email);

  if (result.error || !result.companyId) {
    return { error: result.error ?? "Failed to accept invitation." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/setup");
  revalidatePath("/settings");
  revalidatePath("/dispatch", "layout");
  revalidatePath("/reports", "layout");
  revalidatePath("/jobs", "layout");
  revalidatePath("/technician", "layout");
  revalidatePath("/tech", "layout");

  return { companyId: result.companyId };
}

export async function inviteTeamMemberAction(
  email: string,
  role: CompanyRole,
): Promise<InviteTeamMemberActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.manageUsers) {
    return { error: "You do not have permission to invite team members." };
  }

  const result = await createTeamInvite(
    context.company.id,
    email,
    role,
    {
      userId: context.user.id,
      role: context.role,
    },
  );

  if (result.error || !result.member) {
    return { error: result.error ?? "Failed to send invitation." };
  }

  revalidatePath("/settings");

  return { member: result.member };
}

export async function updateMemberRoleAction(
  membershipId: string,
  newRole: CompanyRole,
): Promise<UpdateMemberRoleActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.manageUsers) {
    return { error: "You do not have permission to manage team members." };
  }

  const result = await updateMemberRole(
    context.company.id,
    membershipId,
    newRole,
    {
      userId: context.user.id,
      role: context.role,
    },
  );

  if (result.error || !result.member) {
    return { error: result.error ?? "Failed to update member role." };
  }

  revalidatePath("/settings");
  revalidatePath("/dispatch");

  return { member: result.member };
}
