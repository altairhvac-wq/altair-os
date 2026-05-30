"use client";

import { useMemo, useState, useTransition } from "react";
import { formatDate } from "@/shared/types/customer";
import {
  canActorCancelInvite,
  canActorEditMemberRole,
  canActorReactivateMember,
  canActorSuspendMember,
  getInvitableTeamRoles,
  validateMemberReactivation,
  validateMemberSuspension,
} from "@/lib/database/services/member-role-guard";
import type { CompanyRole } from "@/lib/database/types/enums";
import {
  formatTeamMemberRole,
  getTeamMemberInitials,
  type TeamMember,
} from "@/shared/types/team-member";
import { isSensitiveTeamRole } from "@/shared/lib/team-role-descriptions";
import {
  cancelTeamInviteAction,
  reactivateTeamMemberAction,
  suspendTeamMemberAction,
  updateMemberRoleAction,
} from "@/app/actions/memberships";
import { CopyTeamInviteLinkButton } from "./CopyTeamInviteLinkButton";
import { MembershipStatusBadge } from "./MembershipStatusBadge";
import { RoleSelectorField } from "./RoleSelectorField";
import { SettingsAlertBanner } from "./SettingsAlertBanner";

type TeamMemberMobileCardsProps = {
  members: TeamMember[];
  currentUserId: string;
  currentUserRole: CompanyRole;
  canManageTeam: boolean;
  onMemberUpdated: (member: TeamMember) => void;
  onMemberRemoved?: (membershipId: string) => void;
  onRoleChangeError?: (message: string) => void;
  onRoleChangeSuccess?: (message: string) => void;
};

type PendingStatusAction = "suspend" | "reactivate" | "cancelInvite";

type ConfirmingAction = {
  membershipId: string;
  action: PendingStatusAction;
};

type PendingRoleChange = {
  membershipId: string;
  memberName: string;
  newRole: CompanyRole;
};

function getMemberSubject(member: TeamMember) {
  return {
    role: member.role,
    user_id: member.userId,
    status: member.status,
  };
}

function getMemberDateLabel(member: TeamMember): string {
  const date = member.joinedAt ?? member.createdAt;
  return formatDate(date);
}

function getMemberDateCaption(member: TeamMember): string {
  if (member.status === "invited") {
    return "Invited";
  }

  return member.joinedAt ? "Joined" : "Added";
}

export function TeamMemberMobileCards({
  members,
  currentUserId,
  currentUserRole,
  canManageTeam,
  onMemberUpdated,
  onMemberRemoved,
  onRoleChangeError,
  onRoleChangeSuccess,
}: TeamMemberMobileCardsProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingMembershipId, setPendingMembershipId] = useState<string | null>(
    null,
  );
  const [confirmingAction, setConfirmingAction] =
    useState<ConfirmingAction | null>(null);
  const [pendingRoleChange, setPendingRoleChange] =
    useState<PendingRoleChange | null>(null);

  const activeOwnerCount = useMemo(
    () =>
      members.filter(
        (member) => member.role === "owner" && member.status === "active",
      ).length,
    [members],
  );

  const editableRoles = useMemo(
    () => getInvitableTeamRoles(currentUserRole),
    [currentUserRole],
  );

  function applyRoleChange(
    membershipId: string,
    newRole: CompanyRole,
    memberName: string,
  ) {
    if (isPending) {
      return;
    }

    setPendingMembershipId(membershipId);
    setPendingRoleChange(null);

    startTransition(async () => {
      const result = await updateMemberRoleAction(membershipId, newRole);
      setPendingMembershipId(null);

      if (result.error) {
        onRoleChangeError?.(result.error);
        return;
      }

      if (result.member) {
        onMemberUpdated(result.member);
        onRoleChangeSuccess?.(
          `${memberName} is now ${formatTeamMemberRole(newRole)}.`,
        );
      } else {
        onRoleChangeError?.("Failed to update member role.");
      }
    });
  }

  function handleRoleChange(member: TeamMember, newRole: CompanyRole) {
    if (isPending || newRole === member.role) {
      return;
    }

    if (isSensitiveTeamRole(newRole) || isSensitiveTeamRole(member.role)) {
      setPendingRoleChange({
        membershipId: member.id,
        memberName: member.name,
        newRole,
      });
      return;
    }

    applyRoleChange(member.id, newRole, member.name);
  }

  function handleStatusAction(
    membershipId: string,
    action: PendingStatusAction,
  ) {
    if (isPending) {
      return;
    }

    setPendingMembershipId(membershipId);
    setConfirmingAction(null);

    startTransition(async () => {
      if (action === "cancelInvite") {
        const result = await cancelTeamInviteAction(membershipId);
        setPendingMembershipId(null);

        if (result.error) {
          onRoleChangeError?.(result.error);
          return;
        }

        onMemberRemoved?.(membershipId);
        onRoleChangeSuccess?.(
          result.inviteEmail
            ? `Invite for ${result.inviteEmail} has been cancelled.`
            : "Invitation has been cancelled.",
        );
        return;
      }

      const result =
        action === "suspend"
          ? await suspendTeamMemberAction(membershipId)
          : await reactivateTeamMemberAction(membershipId);

      setPendingMembershipId(null);

      if (result.error) {
        onRoleChangeError?.(result.error);
        return;
      }

      if (result.member) {
        onMemberUpdated(result.member);
        onRoleChangeSuccess?.(
          action === "suspend"
            ? `${result.member.name} has been suspended.`
            : `${result.member.name} has been reactivated.`,
        );
      } else {
        onRoleChangeError?.(
          action === "suspend"
            ? "Failed to suspend team member."
            : "Failed to reactivate team member.",
        );
      }
    });
  }

  return (
    <div className="min-w-0 space-y-3 p-4 md:hidden">
      {pendingRoleChange ? (
        <SettingsAlertBanner tone="warning">
          <p className="font-semibold">
            Change {pendingRoleChange.memberName} to{" "}
            {formatTeamMemberRole(pendingRoleChange.newRole)}?
          </p>
          <p className="mt-1 text-xs opacity-90">
            This updates workspace permissions immediately.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPendingRoleChange(null)}
              disabled={isPending}
              className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                applyRoleChange(
                  pendingRoleChange.membershipId,
                  pendingRoleChange.newRole,
                  pendingRoleChange.memberName,
                )
              }
              className="inline-flex min-h-[44px] items-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white"
            >
              {isPending ? "Updating..." : "Confirm role change"}
            </button>
          </div>
        </SettingsAlertBanner>
      ) : null}

      {members.map((member) => {
        const isCurrentUser =
          member.userId !== null && member.userId === currentUserId;
        const memberSubject = getMemberSubject(member);
        const canEditRole =
          canManageTeam &&
          canActorEditMemberRole(currentUserRole, currentUserId, memberSubject);
        const canSuspend =
          canManageTeam &&
          canActorSuspendMember(
            currentUserRole,
            currentUserId,
            memberSubject,
            activeOwnerCount,
          );
        const canReactivate =
          canManageTeam &&
          canActorReactivateMember(
            currentUserRole,
            currentUserId,
            memberSubject,
          );
        const canCancelInvite =
          canManageTeam && canActorCancelInvite(memberSubject);
        const suspendBlockReason = canManageTeam
          ? validateMemberSuspension({
              membership: memberSubject,
              activeOwnerCount,
              actorUserId: currentUserId,
              actorRole: currentUserRole,
            })
          : null;
        const reactivateBlockReason = canManageTeam
          ? validateMemberReactivation({
              membership: memberSubject,
              activeOwnerCount,
              actorUserId: currentUserId,
              actorRole: currentUserRole,
            })
          : null;
        const isRowPending = isPending && pendingMembershipId === member.id;
        const isActionLocked = isPending;
        const isConfirming = confirmingAction?.membershipId === member.id;
        const confirmingStatusAction = isConfirming
          ? confirmingAction?.action
          : null;
        const roleOptions: CompanyRole[] = (
          editableRoles as readonly CompanyRole[]
        ).includes(member.role)
          ? [...editableRoles]
          : [...editableRoles, member.role];

        return (
          <article
            key={member.id}
            className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-sm font-bold text-white">
                {getTeamMemberInitials(member.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="min-w-0 truncate font-semibold text-slate-900">
                    {member.name}
                  </p>
                  {isCurrentUser ? (
                    <span className="shrink-0 text-xs font-medium text-slate-500">
                      (You)
                    </span>
                  ) : null}
                  <MembershipStatusBadge
                    status={member.status}
                    className="shrink-0"
                  />
                </div>
                <p className="mt-0.5 truncate text-sm text-slate-500">
                  {member.email}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {getMemberDateCaption(member)} {getMemberDateLabel(member)}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              {canEditRole ? (
                <RoleSelectorField
                  value={member.role}
                  roles={roleOptions}
                  onChange={(nextRole) => handleRoleChange(member, nextRole)}
                  disabled={isActionLocked}
                  showDescription={false}
                  aria-label={`Role for ${member.name}`}
                />
              ) : (
                <p className="text-sm font-medium text-slate-700">
                  {formatTeamMemberRole(member.role)}
                </p>
              )}

              {canManageTeam ? (
                <div>
                  {isConfirming && confirmingStatusAction ? (
                    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-sm font-medium text-slate-700">
                        {confirmingStatusAction === "suspend"
                          ? "Suspend this member's access?"
                          : confirmingStatusAction === "reactivate"
                            ? "Restore this member's access?"
                            : "Cancel this pending invite?"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isActionLocked}
                          onClick={() => setConfirmingAction(null)}
                          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isActionLocked}
                          onClick={() =>
                            handleStatusAction(member.id, confirmingStatusAction)
                          }
                          className={`inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                            confirmingStatusAction === "suspend"
                              ? "bg-rose-600"
                              : confirmingStatusAction === "reactivate"
                                ? "bg-emerald-600"
                                : "bg-slate-600"
                          }`}
                        >
                          {isRowPending
                            ? "Working..."
                            : confirmingStatusAction === "suspend"
                              ? "Confirm suspend"
                              : confirmingStatusAction === "reactivate"
                                ? "Confirm reactivate"
                                : "Confirm cancel"}
                        </button>
                      </div>
                    </div>
                  ) : member.status === "active" ? (
                    <button
                      type="button"
                      disabled={!canSuspend || isActionLocked}
                      title={suspendBlockReason ?? undefined}
                      onClick={() => {
                        if (!canSuspend || isPending) return;
                        setConfirmingAction({
                          membershipId: member.id,
                          action: "suspend",
                        });
                      }}
                      className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      Suspend access
                    </button>
                  ) : member.status === "suspended" ? (
                    <button
                      type="button"
                      disabled={!canReactivate || isActionLocked}
                      title={reactivateBlockReason ?? undefined}
                      onClick={() => {
                        if (!canReactivate || isPending) return;
                        setConfirmingAction({
                          membershipId: member.id,
                          action: "reactivate",
                        });
                      }}
                      className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      Reactivate access
                    </button>
                  ) : member.status === "invited" ? (
                    <div className="flex flex-col gap-2">
                      <CopyTeamInviteLinkButton
                        inviteEmail={member.email}
                        className="w-full"
                        disabled={isActionLocked}
                      />
                      <button
                        type="button"
                        disabled={!canCancelInvite || isActionLocked}
                        onClick={() => {
                          if (!canCancelInvite || isPending) return;
                          setConfirmingAction({
                            membershipId: member.id,
                            action: "cancelInvite",
                          });
                        }}
                        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
                      >
                        Cancel invite
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
