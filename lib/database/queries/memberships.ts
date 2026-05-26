import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import { validateMemberRoleChange, validateInviteRole } from "@/lib/database/services/member-role-guard";
import type {
  CompanyMembershipRow,
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

export async function listCompanyMembers(
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

export type UpdateMemberRoleResult = {
  member?: TeamMember;
  error?: string;
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
    const { members } = await listCompanyMembers(companyId);
    const member = members.find((item) => item.id === membershipId);
    return member ? { member } : { error: "Team member not found." };
  }

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

  return { member };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type CreateTeamInviteResult = {
  member?: TeamMember;
  error?: string;
};

export async function findExistingMembershipForEmail(
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
      "id, user_id, role, status, invite_email, invited_by, invited_at, joined_at, created_at, updated_at, company_id, profile:profiles!company_memberships_user_id_fkey(*)",
    )
    .single();

  if (error) {
    console.error("[createTeamInvite] insert failed:", {
      companyId,
      role,
      code: error.code,
      message: error.message,
    });

    if (error.code === "23505") {
      return {
        error: "This email already has an active or pending membership in this company.",
      };
    }

    return { error: mapDatabaseError(error) };
  }

  const row = data as MembershipProfileRow;
  const member = mapMembershipToTeamMember({
    ...row,
    profile: row.profile,
    invite_email: row.invite_email,
  });

  if (!member) {
    return { error: "Invitation was created but could not be loaded." };
  }

  return { member };
}
