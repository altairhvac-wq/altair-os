import "server-only";

import type { CompanyPaymentAccountRow } from "@/lib/database/types/core-tables";
import type { CompanyPaymentAccount } from "@/lib/payments/types";
import { createServiceRoleClient } from "@/lib/supabase/service";

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

const STRIPE_ACCOUNT_SELECT =
  "id, company_id, provider, provider_account_id, status, charges_enabled, payouts_enabled, online_payments_enabled, onboarding_completed_at, disabled_at, last_synced_at, provider_metadata, created_at, updated_at";

export async function insertStripePaymentAccountForOnboarding(
  companyId: string,
  providerAccountId: string,
): Promise<{ account: CompanyPaymentAccount | null; error?: string }> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("company_payment_accounts")
    .insert({
      company_id: companyId,
      provider: "stripe",
      provider_account_id: providerAccountId,
      status: "pending",
      charges_enabled: false,
      payouts_enabled: false,
      online_payments_enabled: false,
      provider_metadata: {},
    })
    .select(STRIPE_ACCOUNT_SELECT)
    .single();

  if (error) {
    console.error("[insertStripePaymentAccountForOnboarding] insert failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return { account: null, error: "Failed to save Stripe account linkage." };
  }

  return { account: mapCompanyPaymentAccountRow(data as CompanyPaymentAccountRow) };
}

export async function attachStripeProviderAccountId(
  companyId: string,
  accountRowId: string,
  providerAccountId: string,
): Promise<{ account: CompanyPaymentAccount | null; error?: string }> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("company_payment_accounts")
    .update({
      provider_account_id: providerAccountId,
      status: "pending",
      charges_enabled: false,
      payouts_enabled: false,
      online_payments_enabled: false,
    })
    .eq("id", accountRowId)
    .eq("company_id", companyId)
    .eq("provider", "stripe")
    .select(STRIPE_ACCOUNT_SELECT)
    .single();

  if (error) {
    console.error("[attachStripeProviderAccountId] update failed:", {
      companyId,
      accountRowId,
      code: error.code,
      message: error.message,
    });
    return { account: null, error: "Failed to update Stripe account linkage." };
  }

  return { account: mapCompanyPaymentAccountRow(data as CompanyPaymentAccountRow) };
}
