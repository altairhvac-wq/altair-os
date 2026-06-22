import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";

export async function isSmsPhoneOptedOut(
  companyId: string,
  phoneE164: string,
): Promise<boolean> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("sms_opt_outs")
    .select("id")
    .eq("company_id", companyId)
    .eq("phone_e164", phoneE164)
    .maybeSingle();

  if (error) {
    console.error("[isSmsPhoneOptedOut] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return true;
  }

  return Boolean(data);
}
