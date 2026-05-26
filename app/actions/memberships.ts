"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  createTeamInvite,
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
