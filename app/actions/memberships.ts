"use server";

import { revalidatePath } from "next/cache";
import { resolvePostLoginRedirect } from "@/lib/auth/redirects";
import { assertTeamManagementAccess } from "@/lib/database/access-control";
import { getCurrentProfile, getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";
import {
  acceptPendingInvite,
  cancelPendingTeamInvite,
  createTeamInvite,
  resolveUserEmailForInvite,
  updateMemberReportsTo,
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
import { getAppBaseUrl, logInviteEmailEnvPresence } from "@/lib/email/env";
import { sendTeamInviteEmail } from "@/lib/email/team-invite";
import type { CompanyRole } from "@/lib/database/types/enums";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { buildTeamInviteAcceptUrl } from "@/shared/lib/team-invite-link";
import { isValidEmail } from "@/shared/lib/email-validation";
import type { TeamMember } from "@/shared/types/team-member";

function normalizeMembershipId(membershipId: string): string | null {
  const trimmed = membershipId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function requireTeamManagementContext(): Promise<
  { context: ActiveCompanyContext } | { error: string }
> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  const accessError = assertTeamManagementAccess(
    context,
    context.company.id,
  );

  if (accessError) {
    return { error: accessError };
  }

  return { context };
}

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

export type TeamInviteEmailDeliveryStatus =
  | "sent"
  | "not_configured"
  | "failed";

export type InviteTeamMemberActionResult = {
  error?: string;
  member?: TeamMember;
  emailDelivery?: {
    status: TeamInviteEmailDeliveryStatus;
    message?: string;
    missingEnv?: string[];
  };
  inviteAcceptUrl?: string;
};

export type AcceptInviteActionResult = {
  error?: string;
  companyId?: string;
  redirectPath?: string;
};

export type CancelTeamInviteActionResult = {
  error?: string;
  membershipId?: string;
  inviteEmail?: string;
};

export async function acceptInviteAction(
  membershipId: string,
  next?: string | null,
): Promise<AcceptInviteActionResult> {
  const normalizedMembershipId = normalizeMembershipId(membershipId);

  if (!normalizedMembershipId) {
    return { error: "A valid invitation is required." };
  }

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

  const result = await acceptPendingInvite(
    normalizedMembershipId,
    user.id,
    email,
  );

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

  const context = await getActiveCompanyContext({
    companyId: result.companyId,
  });

  return {
    companyId: result.companyId,
    redirectPath: context ? resolvePostLoginRedirect(context, next) : "/",
  };
}

export async function inviteTeamMemberAction(
  email: string,
  role: CompanyRole,
): Promise<InviteTeamMemberActionResult> {
  console.info("[team-invite-prod-debug] inviteTeamMemberAction entered", {
    role,
    toDomain: email.includes("@") ? email.split("@")[1] : "invalid",
  });

  const access = await requireTeamManagementContext();

  if ("error" in access) {
    return { error: access.error };
  }

  const { context } = access;
  const trimmedEmail = email.trim();

  if (!isValidEmail(trimmedEmail)) {
    return { error: "Enter a valid email address." };
  }

  const result = await createTeamInvite(
    context.company.id,
    trimmedEmail,
    role,
    {
      userId: context.user.id,
      role: context.role,
    },
  );

  if (result.error || !result.member) {
    return { error: result.error ?? "We couldn't create this invitation. Try again." };
  }

  const appBaseUrl = getAppBaseUrl();
  const inviteAcceptUrl = appBaseUrl
    ? buildTeamInviteAcceptUrl(appBaseUrl)
    : undefined;

  console.info("[team-invite-prod-debug] env presence check", {
    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY?.trim()),
    RESEND_FROM_EMAIL: Boolean(process.env.RESEND_FROM_EMAIL?.trim()),
    NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
    VERCEL_URL: Boolean(process.env.VERCEL_URL?.trim()),
    NODE_ENV: process.env.NODE_ENV ?? "unknown",
  });

  console.info("[team-invite-prod-debug] resolved app URL", {
    appBaseUrl: appBaseUrl ?? null,
    source: process.env.NEXT_PUBLIC_APP_URL?.trim()
      ? "NEXT_PUBLIC_APP_URL"
      : process.env.VERCEL_URL?.trim()
        ? "VERCEL_URL"
        : "none",
  });

  console.info("[team-invite-debug:inviteTeamMemberAction] invite saved, sending email", {
    toDomain: result.member.email.split("@")[1] ?? "unknown",
    membershipId: result.member.id,
  });
  logInviteEmailEnvPresence("inviteTeamMemberAction");

  const emailResult = await sendTeamInviteEmail({
    to: result.member.email,
    companyName: context.company.name,
    inviteEmail: result.member.email,
    role: result.member.role,
    inviterName: context.profile?.full_name,
  });

  console.info("[team-invite-debug:inviteTeamMemberAction] sendTeamInviteEmail result", {
    ok: emailResult.ok,
    reason: emailResult.ok ? undefined : emailResult.reason,
    providerMessageId: emailResult.ok ? emailResult.providerMessageId : undefined,
    missingEnv:
      !emailResult.ok && emailResult.reason === "not_configured"
        ? emailResult.missingEnv
        : undefined,
    message: emailResult.ok ? undefined : emailResult.message,
  });

  await emitTeamInviteCreatedEvent({
    companyId: context.company.id,
    actorId: context.user.id,
    target: toMembershipActivityTarget(result.member),
    inviteEmail: result.member.email,
  });

  revalidatePath("/settings");

  if (emailResult.ok) {
    const emailDelivery = { status: "sent" as const };
    console.info("[team-invite-prod-debug] final emailDelivery status", {
      emailDelivery,
      membershipId: result.member.id,
    });
    return {
      member: result.member,
      inviteAcceptUrl,
      emailDelivery,
    };
  }

  if (emailResult.reason === "not_configured") {
    const emailDelivery = {
      status: "not_configured" as const,
      message: emailResult.message,
      missingEnv: emailResult.missingEnv,
    };
    console.info("[team-invite-prod-debug] final emailDelivery status", {
      emailDelivery,
      membershipId: result.member.id,
    });
    return {
      member: result.member,
      inviteAcceptUrl,
      emailDelivery,
    };
  }

  const emailDelivery = {
    status: "failed" as const,
    message: emailResult.message,
  };
  console.info("[team-invite-prod-debug] final emailDelivery status", {
    emailDelivery,
    membershipId: result.member.id,
  });
  return {
    member: result.member,
    inviteAcceptUrl,
    emailDelivery,
  };
}

export async function cancelTeamInviteAction(
  membershipId: string,
): Promise<CancelTeamInviteActionResult> {
  const normalizedMembershipId = normalizeMembershipId(membershipId);

  if (!normalizedMembershipId) {
    return { error: "A valid invitation is required." };
  }

  const access = await requireTeamManagementContext();

  if ("error" in access) {
    return { error: access.error };
  }

  const { context } = access;

  const result = await cancelPendingTeamInvite(
    context.company.id,
    normalizedMembershipId,
    {
      userId: context.user.id,
      role: context.role,
    },
  );

  if (result.error || !result.cancelled) {
    return { error: result.error ?? "Failed to cancel invitation." };
  }

  revalidatePath("/settings");

  return {
    membershipId: result.cancelled.membershipId,
    inviteEmail: result.cancelled.inviteEmail,
  };
}

export async function updateMemberRoleAction(
  membershipId: string,
  newRole: CompanyRole,
): Promise<UpdateMemberRoleActionResult> {
  const normalizedMembershipId = normalizeMembershipId(membershipId);

  if (!normalizedMembershipId) {
    return { error: "A valid team member is required." };
  }

  const access = await requireTeamManagementContext();

  if ("error" in access) {
    return { error: access.error };
  }

  const { context } = access;

  const result = await updateMemberRole(
    context.company.id,
    normalizedMembershipId,
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
  const normalizedMembershipId = normalizeMembershipId(membershipId);

  if (!normalizedMembershipId) {
    return { error: "A valid team member is required." };
  }

  const access = await requireTeamManagementContext();

  if ("error" in access) {
    return { error: access.error };
  }

  const { context } = access;

  const result = await updateMemberStatus(
    context.company.id,
    normalizedMembershipId,
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

export type UpdateMemberReportsToActionResult = {
  error?: string;
  member?: TeamMember;
};

export async function updateMemberReportsToAction(
  membershipId: string,
  reportsToMemberId: string | null,
): Promise<UpdateMemberReportsToActionResult> {
  const normalizedMembershipId = normalizeMembershipId(membershipId);

  if (!normalizedMembershipId) {
    return { error: "A valid team member is required." };
  }

  const access = await requireTeamManagementContext();

  if ("error" in access) {
    return { error: access.error };
  }

  const { context } = access;
  const normalizedReportsToMemberId = reportsToMemberId?.trim() || null;

  const result = await updateMemberReportsTo(
    context.company.id,
    normalizedMembershipId,
    normalizedReportsToMemberId,
    {
      userId: context.user.id,
      role: context.role,
    },
  );

  if (result.error || !result.member) {
    return { error: result.error ?? "Failed to update reporting relationship." };
  }

  revalidatePath("/settings");

  return { member: result.member };
}
