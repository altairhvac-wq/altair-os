"use client";

import { useMemo, useState, useTransition } from "react";
import { formatDate } from "@/shared/types/customer";
import {
  canActorEditMemberRole,
  canActorReactivateMember,
  canActorSuspendMember,
  validateMemberReactivation,
  validateMemberSuspension,
} from "@/lib/database/services/member-role-guard";
import type { CompanyRole } from "@/lib/database/types/enums";
import {
  formatTeamMemberRole,
  getTeamMemberInitials,
  MANAGEABLE_TEAM_ROLES,
  type TeamMember,
} from "@/shared/types/team-member";
import {
  reactivateTeamMemberAction,
  suspendTeamMemberAction,
  updateMemberRoleAction,
} from "@/app/actions/memberships";
import { MembershipStatusBadge } from "./MembershipStatusBadge";

type TeamMembersTableProps = {
  members: TeamMember[];
  currentUserId: string;
  currentUserRole: CompanyRole;
  canManageTeam: boolean;
  onMemberUpdated: (member: TeamMember) => void;
  onRoleChangeError?: (message: string) => void;
};

type PendingStatusAction = "suspend" | "reactivate";

type ConfirmingAction = {
  membershipId: string;
  action: PendingStatusAction;
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
  currentUserId,
  currentUserRole,
  canManageTeam,
  onMemberUpdated,
  onRoleChangeError,
}: TeamMembersTableProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingMembershipId, setPendingMembershipId] = useState<string | null>(
    null,
  );
  const [confirmingAction, setConfirmingAction] =
    useState<ConfirmingAction | null>(null);

  const activeOwnerCount = useMemo(
    () =>
      members.filter(
        (member) => member.role === "owner" && member.status === "active",
      ).length,
    [members],
  );

  function handleRoleChange(membershipId: string, newRole: CompanyRole) {
    setPendingMembershipId(membershipId);

    startTransition(async () => {
      const result = await updateMemberRoleAction(membershipId, newRole);
      setPendingMembershipId(null);

      if (result.error) {
        onRoleChangeError?.(result.error);
        return;
      }

      if (result.member) {
        onMemberUpdated(result.member);
      } else {
        onRoleChangeError?.("Failed to update member role.");
      }
    });
  }

  function handleStatusAction(membershipId: string, action: PendingStatusAction) {
    setPendingMembershipId(membershipId);
    setConfirmingAction(null);

    startTransition(async () => {
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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Member</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="hidden px-4 py-3 md:table-cell">Date</th>
            {canManageTeam ? <th className="px-4 py-3">Actions</th> : null}
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
            const isConfirming =
              confirmingAction?.membershipId === member.id;
            const confirmingStatusAction = isConfirming
              ? confirmingAction?.action
              : null;

            return (
              <tr key={member.id} className="transition-colors hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white">
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
                      <p className="mt-0.5 text-xs text-slate-400 md:hidden">
                        {getMemberDateCaption(member)} {getMemberDateLabel(member)}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {canEditRole ? (
                    <select
                      value={member.role}
                      disabled={isRowPending}
                      onChange={(event) => {
                        const nextRole = event.target.value as CompanyRole;
                        if (nextRole === member.role) {
                          return;
                        }

                        handleRoleChange(member.id, nextRole);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60"
                      aria-label={`Role for ${member.name}`}
                    >
                      {MANAGEABLE_TEAM_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {formatTeamMemberRole(role)}
                        </option>
                      ))}
                      {member.role === "customer" ? (
                        <option value="customer">
                          {formatTeamMemberRole("customer")}
                        </option>
                      ) : null}
                    </select>
                  ) : (
                    <span className="font-medium text-slate-700">
                      {formatTeamMemberRole(member.role)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <MembershipStatusBadge status={member.status} />
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <p className="font-medium text-slate-700">
                    {getMemberDateLabel(member)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {getMemberDateCaption(member)}
                  </p>
                </td>
                {canManageTeam ? (
                  <td className="px-4 py-3">
                    {isConfirming && confirmingStatusAction ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-600">
                          {confirmingStatusAction === "suspend"
                            ? "Suspend access?"
                            : "Restore access?"}
                        </span>
                        <button
                          type="button"
                          disabled={isRowPending}
                          onClick={() => setConfirmingAction(null)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isRowPending}
                          onClick={() =>
                            handleStatusAction(member.id, confirmingStatusAction)
                          }
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60 ${
                            confirmingStatusAction === "suspend"
                              ? "bg-rose-600 hover:bg-rose-700"
                              : "bg-emerald-600 hover:bg-emerald-700"
                          }`}
                        >
                          {isRowPending
                            ? confirmingStatusAction === "suspend"
                              ? "Suspending..."
                              : "Reactivating..."
                            : confirmingStatusAction === "suspend"
                              ? "Confirm suspend"
                              : "Confirm reactivate"}
                        </button>
                      </div>
                    ) : member.status === "active" ? (
                      <button
                        type="button"
                        disabled={!canSuspend || isRowPending}
                        title={suspendBlockReason ?? undefined}
                        onClick={() => {
                          if (!canSuspend) {
                            return;
                          }

                          setConfirmingAction({
                            membershipId: member.id,
                            action: "suspend",
                          });
                        }}
                        className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent"
                      >
                        Suspend
                      </button>
                    ) : member.status === "suspended" ? (
                      <button
                        type="button"
                        disabled={!canReactivate || isRowPending}
                        title={reactivateBlockReason ?? undefined}
                        onClick={() => {
                          if (!canReactivate) {
                            return;
                          }

                          setConfirmingAction({
                            membershipId: member.id,
                            action: "reactivate",
                          });
                        }}
                        className="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent"
                      >
                        Reactivate
                      </button>
                    ) : (
                      <span
                        className="text-xs text-slate-400"
                        title="Pending invitations are already inactive."
                      >
                        —
                      </span>
                    )}
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
