"use client";

import { useState, useTransition } from "react";
import { formatDate } from "@/shared/types/customer";
import { canActorEditMemberRole } from "@/lib/database/services/member-role-guard";
import type { CompanyRole } from "@/lib/database/types/enums";
import {
  formatTeamMemberRole,
  getTeamMemberInitials,
  MANAGEABLE_TEAM_ROLES,
  type TeamMember,
} from "@/shared/types/team-member";
import { updateMemberRoleAction } from "@/app/actions/memberships";
import { MembershipStatusBadge } from "./MembershipStatusBadge";

type TeamMembersTableProps = {
  members: TeamMember[];
  currentUserId: string;
  currentUserRole: CompanyRole;
  canManageTeam: boolean;
  onMemberUpdated: (member: TeamMember) => void;
  onRoleChangeError?: (message: string) => void;
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

  function handleRoleChange(
    membershipId: string,
    newRole: CompanyRole,
  ) {
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Member</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="hidden px-4 py-3 md:table-cell">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {members.map((member) => {
            const isCurrentUser =
              member.userId !== null && member.userId === currentUserId;
            const canEditRole =
              canManageTeam &&
              canActorEditMemberRole(currentUserRole, currentUserId, {
                role: member.role,
                user_id: member.userId,
                status: member.status,
              });

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
                      disabled={
                        isPending && pendingMembershipId === member.id
                      }
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
