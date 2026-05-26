"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  acceptPendingInvite,
  createTeamInvite,
  resolveUserEmailForInvite,
  updateMemberRole,
  updateMemberStatus,
} from "@/lib/database/queries/memberships";
import {
  emitInviteAcceptedEvent,
  emitMemberReactivatedEvent,
  emitMemberRoleChangedEvent,
  emitMemberSuspendedEvent,
  emitTeamInviteCreatedEvent,
  type MembershipActivityTarget,
} from "@/lib/database/services/operational-events";
import type { CompanyRole } from "@/lib/database/types/enums";
import type { TeamMember } from "@/shared/types/team-member";

function toMembershipActivityTarget(member: TeamMember): MembershipActivityTarget {
  return {
    membershipId: member.id,
    userId: member.userId,
    email: member.email,
    name: member.name,
    role: member.role,
    status: member.status,
  };
}

export type UpdateMemberRoleActionResult = {
  error?: string;
  member?: TeamMember;
};

export type UpdateMemberStatusActionResult = {
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

  if (result.audit) {
    await emitInviteAcceptedEvent({
      companyId: result.companyId,
      actorId: user.id,
      target: {
        membershipId: result.audit.membershipId,
        userId: user.id,
        email: result.audit.inviteEmail,
        name: profile?.full_name?.trim() || result.audit.inviteEmail,
        role: result.audit.role,
        status: "active",
      },
      inviteEmail: result.audit.inviteEmail,
    });
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

  await emitTeamInviteCreatedEvent({
    companyId: context.company.id,
    actorId: context.user.id,
    target: toMembershipActivityTarget(result.member),
    inviteEmail: result.member.email,
  });

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

  if (result.audit?.changed) {
    await emitMemberRoleChangedEvent({
      companyId: context.company.id,
      actorId: context.user.id,
      target: toMembershipActivityTarget(result.member),
      fromRole: result.audit.previousRole,
      toRole: result.member.role,
    });
  }

  revalidatePath("/settings");
  revalidatePath("/dispatch");

  return { member: result.member };
}

async function runMemberStatusAction(
  membershipId: string,
  targetStatus: "active" | "suspended",
): Promise<UpdateMemberStatusActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.manageUsers) {
    return {
      error:
        targetStatus === "suspended"
          ? "You do not have permission to suspend team members."
          : "You do not have permission to reactivate team members.",
    };
  }

  const result = await updateMemberStatus(
    context.company.id,
    membershipId,
    targetStatus,
    {
      userId: context.user.id,
      role: context.role,
    },
  );

  if (result.error || !result.member) {
    return {
      error:
        result.error ??
        (targetStatus === "suspended"
          ? "Failed to suspend team member."
          : "Failed to reactivate team member."),
    };
  }

  if (result.audit?.changed) {
    const emitPayload = {
      companyId: context.company.id,
      actorId: context.user.id,
      target: toMembershipActivityTarget(result.member),
      fromStatus: result.audit.previousStatus,
    };

    if (targetStatus === "suspended") {
      await emitMemberSuspendedEvent(emitPayload);
    } else {
      await emitMemberReactivatedEvent(emitPayload);
    }
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  revalidatePath("/dispatch", "layout");
  revalidatePath("/reports", "layout");
  revalidatePath("/jobs", "layout");
  revalidatePath("/technician", "layout");
  revalidatePath("/tech", "layout");

  return { member: result.member };
}

export async function suspendTeamMemberAction(
  membershipId: string,
): Promise<UpdateMemberStatusActionResult> {
  return runMemberStatusAction(membershipId, "suspended");
}

export async function reactivateTeamMemberAction(
  membershipId: string,
): Promise<UpdateMemberStatusActionResult> {
  return runMemberStatusAction(membershipId, "active");
}
