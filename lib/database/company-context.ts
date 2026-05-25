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
): ActiveCompanyContext {
  return {
    user,
    profile,
    membership,
    company,
    role: membership.role,
    permissions: buildPermissions(membership.role),
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

  let targetCompanyId = options.companyId ?? profile.default_company_id;

  if (!targetCompanyId) {
    const memberships = await getUserCompanies();
    targetCompanyId = memberships[0]?.company_id ?? null;
  }

  if (!targetCompanyId) {
    return null;
  }

  const { data: membershipRow, error: membershipError } = await supabase
    .from("company_memberships")
    .select("*, company:companies(*)")
    .eq("user_id", user.id)
    .eq("company_id", targetCompanyId)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) {
    console.error("[getActiveCompanyContext] membership lookup failed:", {
      userId: user.id,
      companyId: targetCompanyId,
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

  const row = membershipRow as MembershipWithCompanyRow;
  const { company, ...membership } = row;

  if (!company) {
    return null;
  }

  return toActiveCompanyContext(
    { id: user.id, email: user.email },
    profile as ProfileRow,
    membership,
    company,
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
