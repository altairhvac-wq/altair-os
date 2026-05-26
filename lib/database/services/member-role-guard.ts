import type { CompanyMembershipRow } from "@/lib/database/types/core-tables";
import type { CompanyRole } from "@/lib/database/types/enums";
import { compareCompanyRoles } from "@/lib/database/types/roles";
import {
  INVITABLE_TEAM_ROLES,
  isInvitableTeamRole,
  isManageableTeamRole,
  type InvitableTeamRole,
} from "@/shared/types/team-member";

type MemberRoleSubject = Pick<
  CompanyMembershipRow,
  "role" | "user_id" | "status"
>;

type MemberStatusChangeInput = {
  membership: MemberRoleSubject;
  activeOwnerCount: number;
  actorUserId: string;
  actorRole: CompanyRole;
};

type ValidateMemberRoleChangeInput = {
  membership: MemberRoleSubject;
  newRole: CompanyRole;
  activeOwnerCount: number;
  actorUserId: string;
  actorRole: CompanyRole;
};

export function canActorEditMemberRole(
  actorRole: CompanyRole,
  actorUserId: string,
  member: MemberRoleSubject,
): boolean {
  if (member.status === "invited" && !member.user_id) {
    return false;
  }

  if (member.user_id === actorUserId) {
    return false;
  }

  if (member.status === "suspended" || member.role === "customer") {
    return false;
  }

  if (
    actorRole !== "owner" &&
    compareCompanyRoles(member.role, actorRole)
  ) {
    return false;
  }

  return true;
}

export function validateMemberRoleChange({
  membership,
  newRole,
  activeOwnerCount,
  actorUserId,
  actorRole,
}: ValidateMemberRoleChangeInput): string | null {
  if (!isManageableTeamRole(newRole)) {
    return "That role cannot be assigned through team management.";
  }

  if (membership.role === newRole) {
    return null;
  }

  if (membership.user_id === actorUserId) {
    return "You cannot change your own role.";
  }

  if (membership.status === "invited" && !membership.user_id) {
    return "Pending invitations cannot be edited.";
  }

  if (membership.status === "suspended") {
    return "Suspended members cannot be edited.";
  }

  if (membership.role === "customer") {
    return "Customer roles cannot be changed through team management.";
  }

  if (
    actorRole !== "owner" &&
    compareCompanyRoles(membership.role, actorRole)
  ) {
    return "You cannot change the role of a member with equal or higher access.";
  }

  if (!compareCompanyRoles(actorRole, newRole)) {
    return "You cannot assign a role higher than your own.";
  }

  if (membership.role === "owner" && newRole !== "owner") {
    if (activeOwnerCount < 0) {
      return "Unable to verify owner count. Try again later.";
    }

    if (activeOwnerCount <= 1) {
      return "Cannot change the role of the last owner. Promote another member to owner first.";
    }
  }

  return null;
}

type ValidateInviteRoleInput = {
  role: CompanyRole;
  actorRole: CompanyRole;
};

export function validateInviteRole({
  role,
  actorRole,
}: ValidateInviteRoleInput): string | null {
  if (!isInvitableTeamRole(role)) {
    return "That role cannot be assigned through team invitations.";
  }

  if (actorRole !== "owner" && role === "owner") {
    return "Only owners can invite other owners.";
  }

  if (!compareCompanyRoles(actorRole, role)) {
    return "You cannot assign a role higher than your own.";
  }

  return null;
}

export function getInvitableTeamRoles(actorRole: CompanyRole): InvitableTeamRole[] {
  return INVITABLE_TEAM_ROLES.filter((role) => {
    if (actorRole !== "owner" && role === "owner") {
      return false;
    }

    return compareCompanyRoles(actorRole, role);
  });
}

function validatePrivilegedMemberTarget({
  membership,
  actorRole,
}: Pick<MemberStatusChangeInput, "membership" | "actorRole">): string | null {
  if (membership.role === "customer") {
    return "Customer memberships cannot be changed through team management.";
  }

  if (membership.status === "invited" && !membership.user_id) {
    return "Pending invitations cannot be suspended.";
  }

  if (
    actorRole !== "owner" &&
    (membership.role === "owner" || membership.role === "admin")
  ) {
    return "Only owners can suspend or reactivate owners and admins.";
  }

  if (
    actorRole !== "owner" &&
    compareCompanyRoles(membership.role, actorRole)
  ) {
    return "You cannot change the status of a member with equal or higher access.";
  }

  return null;
}

export function canActorSuspendMember(
  actorRole: CompanyRole,
  actorUserId: string,
  member: MemberRoleSubject,
  activeOwnerCount: number,
): boolean {
  return (
    validateMemberSuspension({
      membership: member,
      activeOwnerCount,
      actorUserId,
      actorRole,
    }) === null
  );
}

export function canActorReactivateMember(
  actorRole: CompanyRole,
  actorUserId: string,
  member: MemberRoleSubject,
): boolean {
  return (
    validateMemberReactivation({
      membership: member,
      activeOwnerCount: 0,
      actorUserId,
      actorRole,
    }) === null
  );
}

export function validateMemberSuspension({
  membership,
  activeOwnerCount,
  actorUserId,
  actorRole,
}: MemberStatusChangeInput): string | null {
  if (membership.status !== "active") {
    return "Only active members can be suspended.";
  }

  if (membership.user_id === actorUserId) {
    return "You cannot suspend yourself.";
  }

  const privilegedError = validatePrivilegedMemberTarget({
    membership,
    actorRole,
  });

  if (privilegedError) {
    return privilegedError;
  }

  if (membership.role === "owner") {
    if (activeOwnerCount < 0) {
      return "Unable to verify owner count. Try again later.";
    }

    if (activeOwnerCount <= 1) {
      return "Cannot suspend the last active owner. Promote another member to owner first.";
    }
  }

  return null;
}

export function validateMemberReactivation({
  membership,
  actorRole,
}: MemberStatusChangeInput): string | null {
  if (membership.status !== "suspended") {
    return "Only suspended members can be reactivated.";
  }

  return validatePrivilegedMemberTarget({
    membership,
    actorRole,
  });
}
