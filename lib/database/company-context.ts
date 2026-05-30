import { createClient } from "@/lib/supabase/server";
import type {
  ActiveCompanyContext,
  CompanyMembershipRow,
  CompanyRow,
  MembershipWithCompany,
  ProfileRow,
} from "@/lib/database/types/core-tables";
import {
  COMPANY_ROLE_PERMISSIONS,
  hasCompanyPermission,
  normalizeCompanyRole,
  type CompanyPermission,
} from "@/lib/database/types/roles";

type GetCompanyContextOptions = {
  companyId?: string;
};

type MembershipWithCompanyRow = CompanyMembershipRow & {
  company: CompanyRow | null;
};

function buildPermissions(role: CompanyMembershipRow["role"]) {
  return (Object.keys(COMPANY_ROLE_PERMISSIONS) as CompanyPermission[]).reduce(
    (acc, permission) => {
      acc[permission] = hasCompanyPermission(role, permission);
      return acc;
    },
    {} as ActiveCompanyContext["permissions"],
  );
}

function toActiveCompanyContext(
  user: { id: string; email: string | undefined },
  profile: ProfileRow,
  membership: CompanyMembershipRow,
  company: CompanyRow,
): ActiveCompanyContext | null {
  const role = normalizeCompanyRole(membership.role);

  if (!role) {
    console.error("[getActiveCompanyContext] unrecognized membership role:", {
      userId: user.id,
      companyId: company.id,
      role: membership.role,
    });
    return null;
  }

  return {
    user,
    profile,
    membership: { ...membership, role },
    company,
    role,
    permissions: buildPermissions(role),
  };
}

export async function getUserCompanies(): Promise<MembershipWithCompany[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("company_memberships")
    .select("*, company:companies(*)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return (data as MembershipWithCompanyRow[])
    .filter((row): row is MembershipWithCompanyRow & { company: CompanyRow } =>
      Boolean(row.company),
    )
    .map(({ company, ...membership }) => ({
      ...membership,
      company,
    }));
}

export async function getActiveCompanyContext(
  options: GetCompanyContextOptions = {},
): Promise<ActiveCompanyContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[getActiveCompanyContext] profile lookup failed:", {
      userId: user.id,
      code: profileError.code,
      message: profileError.message,
      details: profileError.details,
      hint: profileError.hint,
    });
    return null;
  }

  if (!profile) {
    return null;
  }

  const typedProfile = profile as ProfileRow;

  if (options.companyId) {
    return resolveActiveCompanyContext(
      supabase,
      { id: user.id, email: user.email },
      typedProfile,
      options.companyId,
    );
  }

  const activeMemberships = await getUserCompanies();

  if (activeMemberships.length === 0) {
    return null;
  }

  const preferredMembership =
    activeMemberships.find(
      (membership) => membership.company_id === typedProfile.default_company_id,
    ) ?? activeMemberships[0];

  if (
    typedProfile.default_company_id &&
    typedProfile.default_company_id !== preferredMembership.company_id
  ) {
    const { error: healError } = await supabase
      .from("profiles")
      .update({ default_company_id: preferredMembership.company_id })
      .eq("id", user.id);

    if (healError) {
      console.error("[getActiveCompanyContext] stale default heal failed:", {
        userId: user.id,
        staleDefaultCompanyId: typedProfile.default_company_id,
        nextDefaultCompanyId: preferredMembership.company_id,
        code: healError.code,
        message: healError.message,
      });
    } else {
      typedProfile.default_company_id = preferredMembership.company_id;
    }
  }

  return toActiveCompanyContext(
    { id: user.id, email: user.email },
    typedProfile,
    preferredMembership,
    preferredMembership.company,
  );
}

async function resolveActiveCompanyContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email: string | undefined },
  profile: ProfileRow,
  companyId: string,
): Promise<ActiveCompanyContext | null> {
  const { data: membershipRow, error: membershipError } = await supabase
    .from("company_memberships")
    .select("*")
    .eq("user_id", user.id)
    .eq("company_id", companyId)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) {
    console.error("[getActiveCompanyContext] membership lookup failed:", {
      userId: user.id,
      companyId,
      code: membershipError.code,
      message: membershipError.message,
      details: membershipError.details,
      hint: membershipError.hint,
    });
    return null;
  }

  if (!membershipRow) {
    return null;
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) {
    console.error("[getActiveCompanyContext] company lookup failed:", {
      userId: user.id,
      companyId,
      code: companyError.code,
      message: companyError.message,
      details: companyError.details,
      hint: companyError.hint,
    });
    return null;
  }

  if (!company) {
    return null;
  }

  return toActiveCompanyContext(
    user,
    profile,
    membershipRow as CompanyMembershipRow,
    company as CompanyRow,
  );
}

/** @deprecated Use getUserCompanies instead */
export async function listUserCompanies(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_memberships")
    .select("*, company:companies(*)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    return { data: null, error };
  }

  return {
    data: data as MembershipWithCompanyRow[] | null,
    error: null,
  };
}
