import { assertTeamRosterReadAccess } from "@/lib/database/access-control";
import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import { validateMemberRoleChange, validateInviteRole, validateMemberSuspension, validateMemberReactivation, validatePendingInviteCancellation } from "@/lib/database/services/member-role-guard";
import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";
import { hasCompanyPermission } from "@/lib/database/types/roles";
import type {
  CompanyMembershipRow,
  CompanyRow,
  MembershipWithProfile,
} from "@/lib/database/types/core-tables";
import type { CompanyRole } from "@/lib/database/types/enums";
import {
  mapMembershipToTeamMember,
  type TeamMember,
} from "@/shared/types/team-member";

type MembershipProfileRow = {
  id: string;
  user_id: string | null;
  role: CompanyRole;
  status: CompanyMembershipRow["status"];
  invite_email: string | null;
  invited_by: string | null;
  invited_at: string | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
  company_id: string;
  profile: MembershipWithProfile["profile"] | null;
};

export type ListCompanyMembersResult = {
  members: TeamMember[];
  error?: string;
};

function assertTeamManagementActor(actor: MemberRoleActor): string | null {
  if (!hasCompanyPermission(actor.role, "manageUsers")) {
    return "You do not have permission to manage team members.";
  }

  return null;
}

async function fetchCompanyMemberRoster(
  companyId: string,
): Promise<ListCompanyMembersResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_memberships")
    .select(
      "id, user_id, role, status, invite_email, invited_by, invited_at, joined_at, created_at, updated_at, company_id, profile:profiles!company_memberships_user_id_fkey(*)",
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[listCompanyMembers] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return {
      members: [],
      error: "Failed to load team members. Please refresh and try again.",
    };
  }

  const members = ((data ?? []) as MembershipProfileRow[])
    .flatMap((row) => {
      const member = mapMembershipToTeamMember({
        ...row,
        profile: row.profile,
        invite_email: row.invite_email,
      });

      return member ? [member] : [];
    });

  return { members };
}

async function fetchCompanyMemberById(
  companyId: string,
  membershipId: string,
): Promise<TeamMember | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_memberships")
    .select(
      "id, user_id, role, status, invite_email, invited_by, invited_at, joined_at, created_at, updated_at, company_id, profile:profiles!company_memberships_user_id_fkey(*)",
    )
    .eq("company_id", companyId)
    .eq("id", membershipId)
    .maybeSingle();

  if (error) {
    console.error("[fetchCompanyMemberById] query failed:", {
      companyId,
      membershipId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  if (!data) {
    return null;
  }

  const row = data as MembershipProfileRow;

  return mapMembershipToTeamMember({
    ...row,
    profile: row.profile,
    invite_email: row.invite_email,
  });
}

export async function listCompanyMembers(
  companyId: string,
  context: ActiveCompanyContext,
): Promise<ListCompanyMembersResult> {
  const accessError = assertTeamRosterReadAccess(context, companyId);
  if (accessError) {
    return { members: [], error: accessError };
  }

  return fetchCompanyMemberRoster(companyId);
}

export async function countActiveCompanyOwners(
  companyId: string,
): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("company_memberships")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("role", "owner")
    .eq("status", "active");

  if (error) {
    console.error("[countActiveCompanyOwners] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return -1;
  }

  return count ?? 0;
}

export async function getCompanyMembershipById(
  companyId: string,
  membershipId: string,
): Promise<CompanyMembershipRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_memberships")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", membershipId)
    .maybeSingle();

  if (error) {
    console.error("[getCompanyMembershipById] query failed:", {
      companyId,
      membershipId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return data as CompanyMembershipRow | null;
}

export type MemberRoleChangeAudit = {
  previousRole: CompanyRole;
  changed: boolean;
};

export type UpdateMemberRoleResult = {
  member?: TeamMember;
  error?: string;
  audit?: MemberRoleChangeAudit;
};

type MemberRoleActor = {
  userId: string;
  role: CompanyRole;
};

export async function updateMemberRole(
  companyId: string,
  membershipId: string,
  newRole: CompanyRole,
  actor: MemberRoleActor,
): Promise<UpdateMemberRoleResult> {
  const actorError = assertTeamManagementActor(actor);
  if (actorError) {
    return { error: actorError };
  }

  const membership = await getCompanyMembershipById(companyId, membershipId);

  if (!membership) {
    return { error: "Team member not found in this company." };
  }

  const activeOwnerCount = await countActiveCompanyOwners(companyId);
  const validationError = validateMemberRoleChange({
    membership,
    newRole,
    activeOwnerCount,
    actorUserId: actor.userId,
    actorRole: actor.role,
  });

  if (validationError) {
    return { error: validationError };
  }

  if (membership.role === newRole) {
    const member = await fetchCompanyMemberById(companyId, membershipId);
    return member
      ? { member, audit: { previousRole: membership.role, changed: false } }
      : { error: "Team member not found." };
  }

  const previousRole = membership.role;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_memberships")
    .update({ role: newRole })
    .eq("company_id", companyId)
    .eq("id", membershipId)
    .select(
      "id, user_id, role, status, invite_email, invited_by, invited_at, joined_at, created_at, updated_at, company_id, profile:profiles!company_memberships_user_id_fkey(*)",
    )
    .single();

  if (error) {
    console.error("[updateMemberRole] update failed:", {
      companyId,
      membershipId,
      newRole,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  const row = data as MembershipProfileRow;

  if (!row.profile) {
    return { error: "Updated membership could not be loaded." };
  }

  const member = mapMembershipToTeamMember({
    ...row,
    profile: row.profile,
  });

  if (!member) {
    return { error: "Updated membership could not be loaded." };
  }

  return {
    member,
    audit: { previousRole, changed: true },
  };
}

export type MemberStatusChangeAudit = {
  previousStatus: CompanyMembershipRow["status"];
  changed: boolean;
};

export type UpdateMemberStatusResult = {
  member?: TeamMember;
  error?: string;
  audit?: MemberStatusChangeAudit;
};

export async function updateMemberStatus(
  companyId: string,
  membershipId: string,
  targetStatus: Extract<CompanyMembershipRow["status"], "active" | "suspended">,
  actor: MemberRoleActor,
): Promise<UpdateMemberStatusResult> {
  const actorError = assertTeamManagementActor(actor);
  if (actorError) {
    return { error: actorError };
  }

  const membership = await getCompanyMembershipById(companyId, membershipId);

  if (!membership) {
    return { error: "Team member not found in this company." };
  }

  const activeOwnerCount = await countActiveCompanyOwners(companyId);

  const validationError =
    targetStatus === "suspended"
      ? validateMemberSuspension({
          membership,
          activeOwnerCount,
          actorUserId: actor.userId,
          actorRole: actor.role,
        })
      : validateMemberReactivation({
          membership,
          activeOwnerCount,
          actorUserId: actor.userId,
          actorRole: actor.role,
        });

  if (validationError) {
    return { error: validationError };
  }

  if (membership.status === targetStatus) {
    const member = await fetchCompanyMemberById(companyId, membershipId);
    return member
      ? { member, audit: { previousStatus: membership.status, changed: false } }
      : { error: "Team member not found." };
  }

  const previousStatus = membership.status;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_memberships")
    .update({ status: targetStatus })
    .eq("company_id", companyId)
    .eq("id", membershipId)
    .select(
      "id, user_id, role, status, invite_email, invited_by, invited_at, joined_at, created_at, updated_at, company_id, profile:profiles!company_memberships_user_id_fkey(*)",
    )
    .single();

  if (error) {
    console.error("[updateMemberStatus] update failed:", {
      companyId,
      membershipId,
      targetStatus,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  const row = data as MembershipProfileRow;

  const member = mapMembershipToTeamMember({
    ...row,
    profile: row.profile,
    invite_email: row.invite_email,
  });

  if (!member) {
    return { error: "Updated membership could not be loaded." };
  }

  return {
    member,
    audit: { previousStatus, changed: true },
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type InviteEmailResolution = {
  email: string | null;
  mismatch: boolean;
};

export function resolveUserEmailForInvite(
  profileEmail: string | undefined,
  authEmail: string | undefined,
): InviteEmailResolution {
  const normalizedProfile = profileEmail?.trim().toLowerCase() ?? "";
  const normalizedAuth = authEmail?.trim().toLowerCase() ?? "";

  if (normalizedProfile && normalizedAuth && normalizedProfile !== normalizedAuth) {
    return { email: null, mismatch: true };
  }

  return {
    email: normalizedProfile || normalizedAuth || null,
    mismatch: false,
  };
}

function inviteEmailMatchesUserEmail(
  inviteEmail: string,
  userEmail: string,
): boolean {
  return normalizeInviteEmail(inviteEmail) === normalizeInviteEmail(userEmail);
}

type PendingInviteRow = {
  id: string;
  company_id: string;
  role: CompanyRole;
  invite_email: string;
  invited_at: string | null;
  company: Pick<CompanyRow, "name"> | null;
};

export type PendingTeamInvite = {
  id: string;
  companyId: string;
  companyName: string;
  role: CompanyRole;
  inviteEmail: string;
  invitedAt: string | null;
};

export type ListPendingInvitesResult = {
  invites: PendingTeamInvite[];
  error?: string;
};

export async function listPendingInvitesForUserEmail(
  email: string,
): Promise<ListPendingInvitesResult> {
  const normalizedEmail = normalizeInviteEmail(email);

  if (!normalizedEmail) {
    return { invites: [] };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_memberships")
    .select(
      "id, company_id, role, invite_email, invited_at, company:companies(name)",
    )
    .eq("status", "invited")
    .is("user_id", null)
    .eq("invite_email", normalizedEmail)
    .order("invited_at", { ascending: false });

  if (error) {
    console.error("[listPendingInvitesForUserEmail] query failed:", {
      code: error.code,
      message: error.message,
    });
    return {
      invites: [],
      error: "Failed to load pending invitations. Please refresh and try again.",
    };
  }

  const invites = ((data ?? []) as PendingInviteRow[]).flatMap((row) => {
    const companyName = row.company?.name?.trim();
    const inviteEmail = row.invite_email?.trim();

    if (!companyName || !inviteEmail) {
      return [];
    }

    return [
      {
        id: row.id,
        companyId: row.company_id,
        companyName,
        role: row.role,
        inviteEmail,
        invitedAt: row.invited_at,
      },
    ];
  });

  return { invites };
}

export type AcceptPendingInviteAudit = {
  membershipId: string;
  role: CompanyRole;
  inviteEmail: string;
};

export type AcceptPendingInviteResult = {
  companyId?: string;
  error?: string;
  audit?: AcceptPendingInviteAudit;
};

export async function acceptPendingInvite(
  membershipId: string,
  userId: string,
  userEmail: string,
): Promise<AcceptPendingInviteResult> {
  const normalizedEmail = normalizeInviteEmail(userEmail);

  if (!normalizedEmail) {
    return { error: "A verified email address is required to accept an invitation." };
  }

  const supabase = await createClient();

  const { data: membership, error: membershipError } = await supabase
    .from("company_memberships")
    .select("id, company_id, role, status, user_id, invite_email")
    .eq("id", membershipId)
    .maybeSingle();

  if (membershipError) {
    console.error("[acceptPendingInvite] membership lookup failed:", {
      membershipId,
      userId,
      code: membershipError.code,
      message: membershipError.message,
    });
    return { error: "Failed to load invitation. Please try again." };
  }

  if (!membership) {
    return { error: "Invitation not found or no longer available." };
  }

  const row = membership as Pick<
    CompanyMembershipRow,
    "id" | "company_id" | "role" | "status" | "user_id" | "invite_email"
  >;

  if (row.status === "suspended") {
    return { error: "This invitation is suspended and cannot be accepted." };
  }

  if (row.status !== "invited") {
    return {
      error:
        row.status === "active"
          ? "This invitation has already been accepted."
          : "This invitation is no longer available.",
    };
  }

  if (row.user_id) {
    return { error: "This invitation has already been claimed." };
  }

  const inviteEmail = row.invite_email?.trim();

  if (!inviteEmail || !inviteEmailMatchesUserEmail(inviteEmail, normalizedEmail)) {
    return {
      error: "This invitation does not match your signed-in email address.",
    };
  }

  const { data: existingMembership, error: existingError } = await supabase
    .from("company_memberships")
    .select("id, status")
    .eq("company_id", row.company_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    console.error("[acceptPendingInvite] existing membership lookup failed:", {
      membershipId,
      userId,
      companyId: row.company_id,
      code: existingError.code,
      message: existingError.message,
    });
    return { error: "Failed to verify your membership status. Please try again." };
  }

  if (existingMembership) {
    const existing = existingMembership as Pick<
      CompanyMembershipRow,
      "id" | "status"
    >;

    if (existing.status === "active") {
      return { error: "You are already an active member of this company." };
    }

    return {
      error: "You already have a membership record in this company workspace.",
    };
  }

  const joinedAt = new Date().toISOString();

  const { data: updatedMembership, error: updateError } = await supabase
    .from("company_memberships")
    .update({
      user_id: userId,
      status: "active",
      joined_at: joinedAt,
    })
    .eq("id", membershipId)
    .eq("company_id", row.company_id)
    .eq("status", "invited")
    .is("user_id", null)
    .select("id, company_id")
    .maybeSingle();

  if (updateError) {
    console.error("[acceptPendingInvite] update failed:", {
      membershipId,
      userId,
      companyId: row.company_id,
      code: updateError.code,
      message: updateError.message,
    });

    if (updateError.code === "23505") {
      return {
        error: "You are already a member of this company or this invitation was claimed.",
      };
    }

    return { error: mapDatabaseError(updateError) };
  }

  if (!updatedMembership) {
    return {
      error:
        "This invitation was already accepted or is no longer available. Refresh and try again.",
    };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ default_company_id: row.company_id })
    .eq("id", userId)
    .is("default_company_id", null);

  if (profileError) {
    console.error("[acceptPendingInvite] default company update failed:", {
      userId,
      companyId: row.company_id,
      code: profileError.code,
      message: profileError.message,
    });
  }

  return {
    companyId: row.company_id,
    audit: {
      membershipId: row.id,
      role: row.role,
      inviteEmail,
    },
  };
}

export type CreateTeamInviteResult = {
  member?: TeamMember;
  error?: string;
};

async function findExistingMembershipForEmail(
  companyId: string,
  email: string,
): Promise<boolean> {
  const normalizedEmail = normalizeInviteEmail(email);
  const supabase = await createClient();

  const { data: inviteMatches, error: inviteError } = await supabase
    .from("company_memberships")
    .select("id")
    .eq("company_id", companyId)
    .in("status", ["active", "invited"])
    .eq("invite_email", normalizedEmail)
    .limit(1);

  if (inviteError) {
    console.error("[findExistingMembershipForEmail] invite query failed:", {
      companyId,
      code: inviteError.code,
      message: inviteError.message,
    });
    return true;
  }

  if ((inviteMatches ?? []).length > 0) {
    return true;
  }

  const { data: profileMatches, error: profileError } = await supabase
    .from("company_memberships")
    .select("id, profile:profiles!company_memberships_user_id_fkey(email)")
    .eq("company_id", companyId)
    .in("status", ["active", "invited"]);

  if (profileError) {
    console.error("[findExistingMembershipForEmail] profile query failed:", {
      companyId,
      code: profileError.code,
      message: profileError.message,
    });
    return true;
  }

  return (profileMatches ?? []).some((row) => {
    const profile = row.profile as { email?: string } | null;
    return profile?.email?.trim().toLowerCase() === normalizedEmail;
  });
}

export async function createTeamInvite(
  companyId: string,
  email: string,
  role: CompanyRole,
  actor: MemberRoleActor,
): Promise<CreateTeamInviteResult> {
  const actorError = assertTeamManagementActor(actor);
  if (actorError) {
    return { error: actorError };
  }

  const normalizedEmail = normalizeInviteEmail(email);

  if (!normalizedEmail) {
    return { error: "Email is required." };
  }

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return { error: "Please enter a valid email address." };
  }

  const validationError = validateInviteRole({
    role,
    actorRole: actor.role,
  });

  if (validationError) {
    return { error: validationError };
  }

  const alreadyMember = await findExistingMembershipForEmail(
    companyId,
    normalizedEmail,
  );

  if (alreadyMember) {
    return {
      error: "This email already has an active or pending membership in this company.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_memberships")
    .insert({
      company_id: companyId,
      user_id: null,
      invite_email: normalizedEmail,
      role,
      status: "invited",
      invited_by: actor.userId,
      invited_at: new Date().toISOString(),
      joined_at: null,
    })
    .select(
      "id, user_id, role, status, invite_email, invited_by, invited_at, joined_at, created_at, updated_at, company_id",
    )
    .single();

  if (error) {
    console.error("[createTeamInvite] insert failed:", {
      companyId,
      role,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    if (error.code === "23505") {
      return {
        error: "This email already has an active or pending membership in this company.",
      };
    }

    if (String(error.code) === "42501") {
      return {
        error:
          "You do not have permission to invite team members. Owner or admin access is required.",
      };
    }

    return { error: mapDatabaseError(error) };
  }

  const row = data as MembershipProfileRow;
  const member = mapMembershipToTeamMember({
    ...row,
    profile: null,
    invite_email: row.invite_email,
  });

  if (!member) {
    return { error: "Invitation was created but could not be loaded." };
  }

  return { member };
}

export type CancelPendingTeamInviteResult = {
  cancelled?: {
    membershipId: string;
    inviteEmail: string;
  };
  error?: string;
};

export async function cancelPendingTeamInvite(
  companyId: string,
  membershipId: string,
  actor: MemberRoleActor,
): Promise<CancelPendingTeamInviteResult> {
  const actorError = assertTeamManagementActor(actor);
  if (actorError) {
    return { error: actorError };
  }

  const membership = await getCompanyMembershipById(companyId, membershipId);

  if (!membership) {
    return { error: "Invitation not found in this company." };
  }

  const validationError = validatePendingInviteCancellation({
    membership,
  });

  if (validationError) {
    return { error: validationError };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_memberships")
    .delete()
    .eq("company_id", companyId)
    .eq("id", membershipId)
    .eq("status", "invited")
    .is("user_id", null)
    .select("id, invite_email")
    .maybeSingle();

  if (error) {
    console.error("[cancelPendingTeamInvite] delete failed:", {
      companyId,
      membershipId,
      actorUserId: actor.userId,
      code: error.code,
      message: error.message,
    });

    if (String(error.code) === "42501") {
      return {
        error:
          "You do not have permission to cancel invitations. Owner or admin access is required.",
      };
    }

    return { error: mapDatabaseError(error) };
  }

  if (!data) {
    return { error: "Invitation not found or already accepted." };
  }

  return {
    cancelled: {
      membershipId: data.id,
      inviteEmail: data.invite_email?.trim() ?? "",
    },
  };
}
