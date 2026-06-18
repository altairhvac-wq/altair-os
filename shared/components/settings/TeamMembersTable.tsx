"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { formatDate } from "@/shared/types/customer";
import {
  canActorCancelInvite,
  canActorEditMemberReportsTo,
  canActorEditMemberRole,
  canActorEditMemberSpecialties,
  canActorReactivateMember,
  canActorSuspendMember,
  getInvitableTeamRoles,
  validateMemberReactivation,
  validateMemberSuspension,
} from "@/lib/database/services/member-role-guard";
import type { CompanyRole } from "@/lib/database/types/enums";
import { getActiveReportsToOptions } from "@/shared/lib/company-org-tree";
import {
  formatTeamMemberRole,
  getTeamMemberInitials,
  type TeamMember,
} from "@/shared/types/team-member";
import type { TechnicianSpecialty } from "@/shared/types/technician-specialties";
import { isSensitiveTeamRole } from "@/shared/lib/team-role-descriptions";
import {
  cancelTeamInviteAction,
  reactivateTeamMemberAction,
  suspendTeamMemberAction,
  updateMemberReportsToAction,
  updateMemberRoleAction,
  updateMemberSpecialtiesAction,
} from "@/app/actions/memberships";
import { CopyTeamInviteLinkButton } from "./CopyTeamInviteLinkButton";
import { MembershipStatusBadge } from "./MembershipStatusBadge";
import { ReportsToSelectorField } from "./ReportsToSelectorField";
import {
  shouldShowMemberSpecialties,
  TeamMemberSpecialtiesField,
} from "./TeamMemberSpecialtiesField";

type TeamMembersTableProps = {
  members: TeamMember[];
  allMembers: TeamMember[];
  currentUserId: string;
  currentUserRole: CompanyRole;
  canManageTeam: boolean;
  onMemberUpdated: (member: TeamMember) => void;
  onMemberRemoved?: (membershipId: string) => void;
  onRoleChangeError?: (message: string) => void;
  onRoleChangeSuccess?: (message: string) => void;
  northStar?: boolean;
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

function getMemberSubject(member: TeamMember) {
  return {
    role: member.role,
    user_id: member.userId,
    status: member.status,
  };
}

export function TeamMembersTable({
  members,
  allMembers,
  currentUserId,
  currentUserRole,
  canManageTeam,
  onMemberUpdated,
  onMemberRemoved,
  onRoleChangeError,
  onRoleChangeSuccess,
  northStar = false,
}: TeamMembersTableProps) {
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

  function handleReportsToChange(
    member: TeamMember,
    reportsToMemberId: string | null,
  ) {
    if (isPending || reportsToMemberId === member.reportsToMemberId) {
      return;
    }

    setPendingMembershipId(member.id);

    startTransition(async () => {
      const result = await updateMemberReportsToAction(
        member.id,
        reportsToMemberId,
      );
      setPendingMembershipId(null);

      if (result.error) {
        onRoleChangeError?.(result.error);
        return;
      }

      if (result.member) {
        onMemberUpdated(result.member);
        onRoleChangeSuccess?.(
          reportsToMemberId
            ? `${member.name}'s reporting line has been updated.`
            : `${member.name} no longer reports to a manager.`,
        );
      } else {
        onRoleChangeError?.("Failed to update reporting relationship.");
      }
    });
  }

  function handleSpecialtiesChange(
    member: TeamMember,
    specialties: TechnicianSpecialty[],
  ) {
    if (isPending) {
      return;
    }

    setPendingMembershipId(member.id);

    startTransition(async () => {
      const result = await updateMemberSpecialtiesAction(member.id, specialties);
      setPendingMembershipId(null);

      if (result.error) {
        onRoleChangeError?.(result.error);
        return;
      }

      if (result.member) {
        onMemberUpdated(result.member);
        onRoleChangeSuccess?.(`${member.name}'s specialties have been updated.`);
      } else {
        onRoleChangeError?.("Failed to update member specialties.");
      }
    });
  }

  function handleStatusAction(membershipId: string, action: PendingStatusAction) {
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
    <div
      className={`hidden overflow-x-auto md:block${
        northStar ? " settings-north-star-team-ledger" : ""
      }`}
    >
      {pendingRoleChange ? (
        <div className="mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:mx-6">
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
              className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
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
              className="inline-flex min-h-[44px] items-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
            >
              {isPending ? "Updating..." : "Confirm role change"}
            </button>
          </div>
        </div>
      ) : null}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 lg:px-6">Member</th>
            <th className="px-4 py-3">Role</th>
            <th className="hidden px-4 py-3 lg:table-cell">Specialties</th>
            {canManageTeam ? (
              <th className="hidden px-4 py-3 xl:table-cell">Reports to</th>
            ) : null}
            <th className="px-4 py-3">Status</th>
            <th className="hidden px-4 py-3 lg:table-cell">Date</th>
            <th className="px-4 py-3">Profile</th>
            {canManageTeam ? <th className="px-4 py-3 lg:px-6">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {members.map((member) => {
            const isCurrentUser =
              member.userId !== null && member.userId === currentUserId;
            const memberSubject = getMemberSubject(member);
            const canEditRole =
              canManageTeam &&
              canActorEditMemberRole(currentUserRole, currentUserId, memberSubject);
            const canEditReportsTo =
              canManageTeam &&
              canActorEditMemberReportsTo(
                currentUserRole,
                currentUserId,
                memberSubject,
              );
            const canEditSpecialties =
              canManageTeam &&
              canActorEditMemberSpecialties(
                currentUserRole,
                currentUserId,
                memberSubject,
              );
            const showSpecialties = shouldShowMemberSpecialties(member.role);
            const reportsToOptions = getActiveReportsToOptions(
              allMembers,
              member.id,
            );
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
            const isRowPending =
              isPending && pendingMembershipId === member.id;
            const isActionLocked = isPending;
            const isConfirming =
              confirmingAction?.membershipId === member.id;
            const confirmingStatusAction = isConfirming
              ? confirmingAction?.action
              : null;
            const roleOptions: CompanyRole[] = (
              editableRoles as readonly CompanyRole[]
            ).includes(member.role)
              ? [...editableRoles]
              : [...editableRoles, member.role];

            return (
              <tr key={member.id} className="transition-colors hover:bg-slate-50/80">
                <td className="px-4 py-3 lg:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white">
                      {getTeamMemberInitials(member.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {member.name}
                        {isCurrentUser ? (
                          <span className="ml-2 text-xs font-medium text-slate-500">
                            (You)
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {member.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {canEditRole ? (
                    <select
                      value={member.role}
                      disabled={isActionLocked}
                      onChange={(event) => {
                        handleRoleChange(
                          member,
                          event.target.value as CompanyRole,
                        );
                      }}
                      className="min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60"
                      aria-label={`Role for ${member.name}`}
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {formatTeamMemberRole(role)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-medium text-slate-700">
                      {formatTeamMemberRole(member.role)}
                    </span>
                  )}
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  {showSpecialties ? (
                    <TeamMemberSpecialtiesField
                      specialties={member.technicianSpecialties}
                      canEdit={canEditSpecialties}
                      disabled={isActionLocked}
                      compact
                      onChange={(nextSpecialties) =>
                        handleSpecialtiesChange(member, nextSpecialties)
                      }
                    />
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </td>
                {canManageTeam ? (
                  <td className="hidden px-4 py-3 xl:table-cell">
                    {canEditReportsTo ? (
                      <ReportsToSelectorField
                        value={member.reportsToMemberId}
                        options={reportsToOptions}
                        onChange={(nextReportsToMemberId) =>
                          handleReportsToChange(member, nextReportsToMemberId)
                        }
                        disabled={isActionLocked}
                        compact
                        aria-label={`Reports to for ${member.name}`}
                      />
                    ) : member.reportsToMemberId ? (
                      <span className="text-sm text-slate-600">
                        {allMembers.find(
                          (item) => item.id === member.reportsToMemberId,
                        )?.name ?? "Unknown"}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </td>
                ) : null}
                <td className="px-4 py-3">
                  <MembershipStatusBadge status={member.status} />
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <p className="font-medium text-slate-700">
                    {getMemberDateLabel(member)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {getMemberDateCaption(member)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/team/${member.id}`}
                    className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    View Profile
                  </Link>
                </td>
                {canManageTeam ? (
                  <td className="px-4 py-3 lg:px-6">
                    {isConfirming && confirmingStatusAction ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-600">
                          {confirmingStatusAction === "suspend"
                            ? "Suspend access?"
                            : confirmingStatusAction === "reactivate"
                              ? "Restore access?"
                              : "Cancel invite?"}
                        </span>
                        <button
                          type="button"
                          disabled={isActionLocked}
                          onClick={() => setConfirmingAction(null)}
                          className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isActionLocked}
                          onClick={() =>
                            handleStatusAction(member.id, confirmingStatusAction)
                          }
                          className={`inline-flex min-h-[44px] items-center rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 ${
                            confirmingStatusAction === "suspend"
                              ? "bg-rose-600 hover:bg-rose-700"
                              : confirmingStatusAction === "reactivate"
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : "bg-slate-600 hover:bg-slate-700"
                          }`}
                        >
                          {isRowPending
                            ? confirmingStatusAction === "suspend"
                              ? "Suspending..."
                              : confirmingStatusAction === "reactivate"
                                ? "Reactivating..."
                                : "Cancelling..."
                            : confirmingStatusAction === "suspend"
                              ? "Confirm suspend"
                              : confirmingStatusAction === "reactivate"
                                ? "Confirm reactivate"
                                : "Confirm cancel"}
                        </button>
                      </div>
                    ) : member.status === "active" ? (
                      <button
                        type="button"
                        disabled={!canSuspend || isActionLocked}
                        title={suspendBlockReason ?? undefined}
                        onClick={() => {
                          if (!canSuspend || isPending) {
                            return;
                          }

                          setConfirmingAction({
                            membershipId: member.id,
                            action: "suspend",
                          });
                        }}
                        className="inline-flex min-h-[44px] items-center rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent"
                      >
                        Suspend
                      </button>
                    ) : member.status === "suspended" ? (
                      <button
                        type="button"
                        disabled={!canReactivate || isActionLocked}
                        title={reactivateBlockReason ?? undefined}
                        onClick={() => {
                          if (!canReactivate || isPending) {
                            return;
                          }

                          setConfirmingAction({
                            membershipId: member.id,
                            action: "reactivate",
                          });
                        }}
                        className="inline-flex min-h-[44px] items-center rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent"
                      >
                        Reactivate
                      </button>
                    ) : member.status === "invited" ? (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <CopyTeamInviteLinkButton
                          inviteEmail={member.email}
                          disabled={isActionLocked}
                        />
                        <button
                          type="button"
                          disabled={!canCancelInvite || isActionLocked}
                          onClick={() => {
                            if (!canCancelInvite || isPending) {
                              return;
                            }

                            setConfirmingAction({
                              membershipId: member.id,
                              action: "cancelInvite",
                            });
                          }}
                          className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
                        >
                          Cancel invite
                        </button>
                      </div>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
