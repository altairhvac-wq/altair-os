import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";

export type SwitchDefaultCompanyResult = {
  error?: string;
  companyId?: string;
};

export async function switchDefaultCompany(
  userId: string,
  companyId: string,
): Promise<SwitchDefaultCompanyResult> {
  const supabase = await createClient();

  const { data: membership, error: membershipError } = await supabase
    .from("company_memberships")
    .select("id, company_id, status")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) {
    console.error("[switchDefaultCompany] membership lookup failed:", {
      userId,
      companyId,
      code: membershipError.code,
      message: membershipError.message,
    });
    return { error: mapDatabaseError(membershipError) };
  }

  if (!membership) {
    return { error: "You do not have active access to that company." };
  }

  const { data: updatedProfile, error: profileError } = await supabase
    .from("profiles")
    .update({ default_company_id: companyId })
    .eq("id", userId)
    .select("default_company_id")
    .maybeSingle();

  if (profileError) {
    console.error("[switchDefaultCompany] profile update failed:", {
      userId,
      companyId,
      code: profileError.code,
      message: profileError.message,
    });
    return { error: mapDatabaseError(profileError) };
  }

  if (!updatedProfile || updatedProfile.default_company_id !== companyId) {
    return { error: "Unable to switch companies. Please try again." };
  }

  return { companyId };
}
