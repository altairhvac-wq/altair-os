"use client";

import {
  buildCompanyOrgTreeLayout,
  type CompanyOrgTreeNode,
} from "@/shared/lib/company-org-tree";
import {
  formatTeamMemberRole,
  getTeamMemberInitials,
  type TeamMember,
} from "@/shared/types/team-member";
import { MembershipStatusBadge } from "./MembershipStatusBadge";

type CompanyOrgTreeProps = {
  members: readonly TeamMember[];
};

function OrgTreeNode({
  node,
  depth,
}: {
  node: CompanyOrgTreeNode;
  depth: number;
}) {
  const { member, children } = node;

  return (
    <li className="min-w-0">
      <div
        className="flex min-w-0 items-start gap-2.5 rounded-lg border border-slate-100 bg-white px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-2.5"
        style={{ marginLeft: depth > 0 ? `${depth * 1.25}rem` : undefined }}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white sm:h-9 sm:w-9">
          {getTeamMemberInitials(member.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {member.name}
            </p>
            <MembershipStatusBadge status={member.status} className="scale-90" />
          </div>
          <p className="text-xs font-medium text-slate-600">
            {formatTeamMemberRole(member.role)}
          </p>
          <p className="truncate text-xs text-slate-500">{member.email}</p>
        </div>
      </div>

      {children.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {children.map((child) => (
            <OrgTreeNode key={child.member.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function OrgTreeMemberRow({ member }: { member: TeamMember }) {
  return (
    <li className="min-w-0">
      <div className="flex min-w-0 items-start gap-2.5 rounded-lg border border-slate-100 bg-white px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white sm:h-9 sm:w-9">
          {getTeamMemberInitials(member.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {member.name}
            </p>
            <MembershipStatusBadge status={member.status} className="scale-90" />
          </div>
          <p className="text-xs font-medium text-slate-600">
            {formatTeamMemberRole(member.role)}
          </p>
          <p className="truncate text-xs text-slate-500">{member.email}</p>
        </div>
      </div>
    </li>
  );
}

export function CompanyOrgTree({ members }: CompanyOrgTreeProps) {
  const layout = buildCompanyOrgTreeLayout(members);

  if (layout.variant === "solo") {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
        <p className="text-sm font-medium text-slate-700">
          Invite teammates to build your company tree.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Once you have more members, assign reporting relationships to map your
          organization.
        </p>
      </div>
    );
  }

  if (layout.variant === "unassigned") {
    return (
      <div className="space-y-3">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Unassigned reporting
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            No reporting relationships have been set yet.
          </p>
        </div>
        <ul className="space-y-2">
          {layout.unassigned.map((member) => (
            <OrgTreeMemberRow key={member.id} member={member} />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ul className="space-y-2">
        {layout.roots.map((node) => (
          <OrgTreeNode key={node.member.id} node={node} depth={0} />
        ))}
      </ul>

      {layout.unassigned.length > 0 ? (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Unassigned reporting
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              These members reference a manager who is no longer available.
            </p>
          </div>
          <ul className="space-y-2">
            {layout.unassigned.map((member) => (
              <OrgTreeMemberRow key={member.id} member={member} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
