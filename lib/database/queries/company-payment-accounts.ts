import { createClient } from "@/lib/supabase/server";
import type { CompanyPaymentAccountRow } from "@/lib/database/types/core-tables";
import type {
  CompanyPaymentAccount,
  CompanyPaymentAccountProvider,
} from "@/lib/payments/types";

function mapProviderMetadata(
  value: CompanyPaymentAccountRow["provider_metadata"],
): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function mapCompanyPaymentAccountRow(
  row: CompanyPaymentAccountRow,
): CompanyPaymentAccount {
  return {
    id: row.id,
    companyId: row.company_id,
    provider: row.provider,
    providerAccountId: row.provider_account_id,
    status: row.status,
    chargesEnabled: row.charges_enabled,
    payoutsEnabled: row.payouts_enabled,
    onlinePaymentsEnabled: row.online_payments_enabled,
    onboardingCompletedAt: row.onboarding_completed_at,
    disabledAt: row.disabled_at,
    lastSyncedAt: row.last_synced_at,
    providerMetadata: mapProviderMetadata(row.provider_metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCompanyPaymentAccount(
  companyId: string,
  provider: CompanyPaymentAccountProvider,
): Promise<CompanyPaymentAccount | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_payment_accounts")
    .select(
      "id, company_id, provider, provider_account_id, status, charges_enabled, payouts_enabled, online_payments_enabled, onboarding_completed_at, disabled_at, last_synced_at, provider_metadata, created_at, updated_at",
    )
    .eq("company_id", companyId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) {
    console.error("[getCompanyPaymentAccount] query failed:", {
      companyId,
      provider,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  if (!data) {
    return null;
  }

  return mapCompanyPaymentAccountRow(data);
}

export async function listCompanyPaymentAccounts(
  companyId: string,
): Promise<CompanyPaymentAccount[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_payment_accounts")
    .select(
      "id, company_id, provider, provider_account_id, status, charges_enabled, payouts_enabled, online_payments_enabled, onboarding_completed_at, disabled_at, last_synced_at, provider_metadata, created_at, updated_at",
    )
    .eq("company_id", companyId)
    .order("provider", { ascending: true });

  if (error) {
    console.error("[listCompanyPaymentAccounts] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data ?? []).map(mapCompanyPaymentAccountRow);
}
