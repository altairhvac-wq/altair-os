"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { formatDate } from "@/shared/types/customer";
import { buttonClassName } from "@/shared/design-system/components/button-styles";
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
import {
  buildCompanyOrgTreeLayout,
  getActiveReportsToOptions,
  type CompanyOrgTreeNode,
} from "@/shared/lib/company-org-tree";
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
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const treeLayout = useMemo(() => buildCompanyOrgTreeLayout(members), [members]);

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

  function renderMemberDetails(member: TeamMember): ReactNode {
    const memberSubject = getMemberSubject(member);
    const canEditRole =
      canManageTeam &&
      canActorEditMemberRole(currentUserRole, currentUserId, memberSubject);
    const canEditReportsTo =
      canManageTeam &&
      canActorEditMemberReportsTo(currentUserRole, currentUserId, memberSubject);
    const canEditSpecialties =
      canManageTeam &&
      canActorEditMemberSpecialties(currentUserRole, currentUserId, memberSubject);
    const showSpecialties = shouldShowMemberSpecialties(member.role);
    const reportsToOptions = getActiveReportsToOptions(allMembers, member.id);
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
      canActorReactivateMember(currentUserRole, currentUserId, memberSubject);
    const canCancelInvite = canManageTeam && canActorCancelInvite(memberSubject);
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
    const confirmingStatusAction = isConfirming ? confirmingAction?.action : null;
    const roleOptions: CompanyRole[] = (
      editableRoles as readonly CompanyRole[]
    ).includes(member.role)
      ? [...editableRoles]
      : [...editableRoles, member.role];

    return (
      <div className="mt-1 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              Role
            </p>
            {canEditRole ? (
              <select
                value={member.role}
                disabled={isActionLocked}
                onChange={(event) => {
                  handleRoleChange(member, event.target.value as CompanyRole);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60"
                aria-label={`Role for ${member.name}`}
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {formatTeamMemberRole(role)}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm font-medium text-slate-700">
                {formatTeamMemberRole(member.role)}
              </p>
            )}
          </div>

          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              Reports to
            </p>
            {canManageTeam && canEditReportsTo ? (
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
              <p className="text-sm text-slate-600">
                {allMembers.find((item) => item.id === member.reportsToMemberId)
                  ?.name ?? "Unknown"}
              </p>
            ) : (
              <p className="text-sm text-slate-400">—</p>
            )}
          </div>

          {showSpecialties ? (
            <div className="min-w-0 sm:col-span-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                Specialties
              </p>
              <TeamMemberSpecialtiesField
                specialties={member.technicianSpecialties}
                canEdit={canEditSpecialties}
                disabled={isActionLocked}
                compact
                onChange={(nextSpecialties) =>
                  handleSpecialtiesChange(member, nextSpecialties)
                }
              />
            </div>
          ) : null}
        </div>

        <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-2 border-t border-slate-200/70 pt-2.5">
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-700">
              {getMemberDateLabel(member)}
            </span>{" "}
            · {getMemberDateCaption(member)}
          </p>
          <span className="mx-1 h-3 w-px bg-slate-200" aria-hidden="true" />
          <Link
            href={`/team/${member.id}`}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View Profile
          </Link>

          {canManageTeam ? (
            <span className="ml-auto flex flex-wrap items-center gap-2">
              {isConfirming && confirmingStatusAction ? (
                <>
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
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isActionLocked}
                    onClick={() =>
                      handleStatusAction(member.id, confirmingStatusAction)
                    }
                    className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60 ${
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
                </>
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
                  className="inline-flex items-center rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent"
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
                  className="inline-flex items-center rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent"
                >
                  Reactivate
                </button>
              ) : member.status === "invited" ? (
                <>
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
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
                  >
                    Cancel invite
                  </button>
                </>
              ) : null}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  function renderNodeCard(member: TeamMember, isRoot: boolean): ReactNode {
    const isCurrentUser =
      member.userId !== null && member.userId === currentUserId;
    const selected = expandedMemberId === member.id;

    return (
      <button
        type="button"
        aria-expanded={selected}
        onClick={() => setExpandedMemberId(selected ? null : member.id)}
        className={`flex w-36 flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center shadow-sm transition ${
          isRoot
            ? "border-cyan-800 bg-cyan-700"
            : "border-slate-200 bg-white hover:border-cyan-300 hover:shadow"
        } ${selected ? "ring-2 ring-altair-brass/60" : ""}`}
      >
        {/* Avatar is the drop-in point for employee photos later. */}
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-full text-xs font-bold text-white ${
            isRoot ? "bg-white/20" : "bg-cyan-600"
          }`}
        >
          {getTeamMemberInitials(member.name)}
        </span>
        <span className="w-full">
          <span
            className={`block truncate text-xs font-bold leading-tight ${
              isRoot ? "text-white" : "text-slate-900"
            }`}
          >
            {member.name}
            {isCurrentUser ? " (You)" : ""}
          </span>
          <span
            className={`mt-0.5 block truncate text-[10px] font-medium leading-tight ${
              isRoot ? "text-cyan-100" : "text-slate-500"
            }`}
          >
            {formatTeamMemberRole(member.role)}
          </span>
        </span>
        {member.status !== "active" ? (
          <MembershipStatusBadge status={member.status} className="scale-75" />
        ) : null}
      </button>
    );
  }

  function renderChartNode(node: CompanyOrgTreeNode, isRoot: boolean): ReactNode {
    return (
      <div className="flex flex-col items-center">
        {renderNodeCard(node.member, isRoot)}
        {node.children.length > 0 ? (
          <>
            <div className="h-4 w-px bg-slate-300" aria-hidden="true" />
            <div className="flex items-start">
              {node.children.map((child, index) => {
                const isFirst = index === 0;
                const isLast = index === node.children.length - 1;
                const only = node.children.length === 1;

                return (
                  <div
                    key={child.member.id}
                    className="relative flex flex-col items-center px-2"
                  >
                    {!only ? (
                      <span
                        aria-hidden="true"
                        className={`absolute top-0 h-px bg-slate-300 ${
                          isFirst
                            ? "left-1/2 right-0"
                            : isLast
                              ? "left-0 right-1/2"
                              : "left-0 right-0"
                        }`}
                      />
                    ) : null}
                    <span className="h-4 w-px bg-slate-300" aria-hidden="true" />
                    {renderChartNode(child, false)}
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    );
  }

  const roots = "roots" in treeLayout ? treeLayout.roots : [];
  const unassignedMembers = "unassigned" in treeLayout ? treeLayout.unassigned : [];
  // The chart's apex is the owner (plus anyone who actually has reports).
  // Manager-less members with no reports move to the strip below so the
  // chart always reads top-down from who runs the company.
  const chartRoots = roots.filter(
    (node) => node.member.role === "owner" || node.children.length > 0,
  );
  const looseMembers = [
    ...roots
      .filter(
        (node) => node.member.role !== "owner" && node.children.length === 0,
      )
      .map((node) => node.member),
    ...unassignedMembers,
  ];
  const hasChart = chartRoots.length > 0;
  const selectedMember = expandedMemberId
    ? members.find((member) => member.id === expandedMemberId) ?? null
    : null;

  return (
    <div
      className={`hidden md:block${
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
              className={buttonClassName("primary", "md")}
            >
              {isPending ? "Updating..." : "Confirm role change"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="px-4 py-4 lg:px-6">
        <div className="overflow-x-auto pb-2">
          {hasChart ? (
            <div className="flex min-w-max items-start justify-center gap-10 px-2">
              {chartRoots.map((node) => (
                <div key={node.member.id}>{renderChartNode(node, true)}</div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-start justify-center gap-3 px-2">
              {members.map((member) => (
                <div key={member.id}>{renderNodeCard(member, false)}</div>
              ))}
            </div>
          )}
        </div>

        {hasChart && looseMembers.length > 0 ? (
          <div className="mt-5 border-t border-slate-100 pt-3">
            <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Not on the tree yet — click one and set who they report to
            </p>
            <div className="flex flex-wrap items-start justify-center gap-3">
              {looseMembers.map((member) => (
                <div key={member.id}>{renderNodeCard(member, false)}</div>
              ))}
            </div>
          </div>
        ) : null}

        {selectedMember ? (
          <div className="mx-auto mt-4 max-w-2xl">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Managing {selectedMember.name}
              </p>
              <button
                type="button"
                onClick={() => setExpandedMemberId(null)}
                className="text-xs font-semibold text-slate-500 transition hover:text-slate-700"
              >
                Close
              </button>
            </div>
            {renderMemberDetails(selectedMember)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
