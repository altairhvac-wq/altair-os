import { createClient } from "@/lib/supabase/server";
import type {
  CompanyMembershipRow,
  CompanyRow,
  ProfileRow,
  UserCompanyContext,
} from "@/lib/database/types";

type GetCompanyContextOptions = {
  companyId?: string;
};

type MembershipWithCompanyRow = CompanyMembershipRow & {
  company: CompanyRow | null;
};

export async function getActiveCompanyContext(
  options: GetCompanyContextOptions = {},
): Promise<UserCompanyContext | null> {
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

  if (profileError || !profile) {
    return null;
  }

  const targetCompanyId = options.companyId ?? profile.default_company_id;

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

  if (membershipError || !membershipRow) {
    return null;
  }

  const row = membershipRow as MembershipWithCompanyRow;
  const { company, ...membership } = row;

  if (!company) {
    return null;
  }

  return {
    profile: profile as ProfileRow,
    membership,
    company,
  };
}

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
