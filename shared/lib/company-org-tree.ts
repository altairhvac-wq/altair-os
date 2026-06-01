import type { TeamMember } from "@/shared/types/team-member";

export type CompanyOrgTreeNode = {
  member: TeamMember;
  children: CompanyOrgTreeNode[];
};

export type CompanyOrgTreeLayout = {
  variant: "solo" | "unassigned" | "hierarchy";
  roots: CompanyOrgTreeNode[];
  unassigned: TeamMember[];
};

type ReportingMemberRef = {
  id: string;
  reportsToMemberId: string | null;
};

export function wouldCreateReportingCycle(
  members: readonly ReportingMemberRef[],
  memberId: string,
  newReportsToMemberId: string | null,
): boolean {
  if (!newReportsToMemberId) {
    return false;
  }

  if (newReportsToMemberId === memberId) {
    return true;
  }

  const reportsToById = new Map(
    members.map((member) => [member.id, member.reportsToMemberId]),
  );

  let current: string | null = newReportsToMemberId;
  const visited = new Set<string>();

  while (current) {
    if (current === memberId) {
      return true;
    }

    if (visited.has(current)) {
      return true;
    }

    visited.add(current);
    current = reportsToById.get(current) ?? null;
  }

  return false;
}

export function buildCompanyOrgTreeLayout(
  members: readonly TeamMember[],
): CompanyOrgTreeLayout {
  if (members.length <= 1) {
    return {
      variant: "solo",
      roots: [],
      unassigned: [...members],
    };
  }

  const memberById = new Map(members.map((member) => [member.id, member]));
  const childrenByManagerId = new Map<string, TeamMember[]>();

  for (const member of members) {
    if (!member.reportsToMemberId) {
      continue;
    }

    const siblings = childrenByManagerId.get(member.reportsToMemberId) ?? [];
    siblings.push(member);
    childrenByManagerId.set(member.reportsToMemberId, siblings);
  }

  const hasAnyReportingAssignment = members.some(
    (member) => member.reportsToMemberId !== null,
  );

  if (!hasAnyReportingAssignment) {
    return {
      variant: "unassigned",
      roots: [],
      unassigned: [...members],
    };
  }

  function buildNode(member: TeamMember): CompanyOrgTreeNode {
    const children = (childrenByManagerId.get(member.id) ?? [])
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((child) => buildNode(child));

    return { member, children };
  }

  const roots = members
    .filter((member) => {
      if (member.reportsToMemberId) {
        return false;
      }

      return true;
    })
    .sort((left, right) => {
      if (left.role === "owner" && right.role !== "owner") {
        return -1;
      }

      if (right.role === "owner" && left.role !== "owner") {
        return 1;
      }

      return left.name.localeCompare(right.name);
    })
    .map((member) => buildNode(member));

  const assignedMemberIds = new Set<string>();
  const stack = [...roots];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) {
      continue;
    }

    assignedMemberIds.add(node.member.id);
    stack.push(...node.children);
  }

  const unassigned = members.filter((member) => {
    if (member.reportsToMemberId) {
      const manager = memberById.get(member.reportsToMemberId);
      return !manager;
    }

    return false;
  });

  return {
    variant: "hierarchy",
    roots,
    unassigned,
  };
}

export function getActiveReportsToOptions(
  members: readonly TeamMember[],
  memberId: string,
): TeamMember[] {
  return members
    .filter(
      (member) =>
        member.id !== memberId &&
        member.status === "active" &&
        member.userId !== null,
    )
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name));
}
