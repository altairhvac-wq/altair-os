import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { Database } from "@/lib/database/types";
import type { Json } from "@/lib/database/types/enums";
import type { CompanyPaymentAccountRow } from "@/lib/database/types/core-tables";
import { deriveStripeAccountSyncFields } from "@/lib/payments/stripe-account-sync";
import {
  mapStripeConnectSetupError,
  retrieveStripeConnectedAccount,
} from "@/lib/payments/stripe-connect";
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

export async function findStripeCompanyPaymentAccountByProviderAccountId(
  supabase: SupabaseClient<Database>,
  providerAccountId: string,
): Promise<CompanyPaymentAccountRow | null> {
  const { data, error } = await supabase
    .from("company_payment_accounts")
    .select(STRIPE_ACCOUNT_SELECT)
    .eq("provider", "stripe")
    .eq("provider_account_id", providerAccountId)
    .maybeSingle();

  if (error) {
    console.error(
      "[findStripeCompanyPaymentAccountByProviderAccountId] query failed:",
      {
        providerAccountId,
        code: error.code,
        message: error.message,
      },
    );
    return null;
  }

  return (data as CompanyPaymentAccountRow | null) ?? null;
}

export async function findStripeCompanyPaymentAccountByCompanyId(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<CompanyPaymentAccountRow | null> {
  const { data, error } = await supabase
    .from("company_payment_accounts")
    .select(STRIPE_ACCOUNT_SELECT)
    .eq("company_id", companyId)
    .eq("provider", "stripe")
    .maybeSingle();

  if (error) {
    console.error("[findStripeCompanyPaymentAccountByCompanyId] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return (data as CompanyPaymentAccountRow | null) ?? null;
}

export async function syncStripeCompanyPaymentAccountFromWebhook(
  supabase: SupabaseClient<Database>,
  accountRow: CompanyPaymentAccountRow,
  stripeAccount: Stripe.Account,
): Promise<{ ok: boolean; error?: string }> {
  const syncFields = deriveStripeAccountSyncFields(stripeAccount, {
    disabledAt: accountRow.disabled_at,
    onboardingCompletedAt: accountRow.onboarding_completed_at,
  });
  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from("company_payment_accounts")
    .update({
      status: syncFields.status,
      charges_enabled: syncFields.chargesEnabled,
      payouts_enabled: syncFields.payoutsEnabled,
      onboarding_completed_at: syncFields.onboardingCompletedAt,
      last_synced_at: nowIso,
      provider_metadata: syncFields.providerMetadata as Json,
    })
    .eq("id", accountRow.id)
    .eq("company_id", accountRow.company_id)
    .eq("provider", "stripe");

  if (error) {
    console.error("[syncStripeCompanyPaymentAccountFromWebhook] update failed:", {
      accountRowId: accountRow.id,
      companyId: accountRow.company_id,
      code: error.code,
      message: error.message,
    });
    return { ok: false, error: "Failed to sync Stripe account status." };
  }

  return { ok: true };
}

export async function refreshStripeCompanyPaymentAccountStatus(
  companyId: string,
): Promise<
  | { ok: true; account: CompanyPaymentAccount }
  | { ok: false; error: string }
> {
  const supabase = createServiceRoleClient();
  const accountRow = await findStripeCompanyPaymentAccountByCompanyId(
    supabase,
    companyId,
  );

  if (!accountRow) {
    return {
      ok: false,
      error: "No Stripe payment account is connected for this company.",
    };
  }

  if (!accountRow.provider_account_id) {
    return { ok: false, error: "Stripe account linkage is incomplete." };
  }

  let stripeAccount: Stripe.Account;

  try {
    stripeAccount = await retrieveStripeConnectedAccount(
      accountRow.provider_account_id,
    );
  } catch (error) {
    console.error("[refreshStripeCompanyPaymentAccountStatus] retrieve failed:", {
      companyId,
      error,
    });
    return { ok: false, error: mapStripeConnectSetupError(error) };
  }

  const syncResult = await syncStripeCompanyPaymentAccountFromWebhook(
    supabase,
    accountRow,
    stripeAccount,
  );

  if (!syncResult.ok) {
    return {
      ok: false,
      error: syncResult.error ?? "Failed to sync Stripe account status.",
    };
  }

  const updatedAccountRow = await findStripeCompanyPaymentAccountByCompanyId(
    supabase,
    companyId,
  );

  if (!updatedAccountRow) {
    return {
      ok: false,
      error: "Failed to load updated Stripe account status.",
    };
  }

  return {
    ok: true,
    account: mapCompanyPaymentAccountRow(updatedAccountRow),
  };
}

function validateOnlineCheckoutEnablePreconditions(
  account: CompanyPaymentAccount,
): { ok: true } | { ok: false; error: string } {
  if (account.provider !== "stripe") {
    return { ok: false, error: "Stripe payment account is required." };
  }

  if (account.status !== "active") {
    return {
      ok: false,
      error: "Stripe account must be active before enabling online checkout.",
    };
  }

  if (!account.chargesEnabled) {
    return {
      ok: false,
      error: "Stripe charges must be enabled before enabling online checkout.",
    };
  }

  if (!account.payoutsEnabled) {
    return {
      ok: false,
      error: "Stripe payouts must be enabled before enabling online checkout.",
    };
  }

  if (!account.onboardingCompletedAt) {
    return {
      ok: false,
      error: "Stripe onboarding must be completed before enabling online checkout.",
    };
  }

  if (account.disabledAt) {
    return {
      ok: false,
      error: "Stripe account is disabled and cannot enable online checkout.",
    };
  }

  if (!account.providerAccountId) {
    return {
      ok: false,
      error: "Stripe account linkage is incomplete.",
    };
  }

  if (account.onlinePaymentsEnabled) {
    return { ok: false, error: "Online checkout is already enabled." };
  }

  return { ok: true };
}

export async function enableOnlineCheckoutForCompany(
  companyId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("company_payment_accounts")
    .select(STRIPE_ACCOUNT_SELECT)
    .eq("company_id", companyId)
    .eq("provider", "stripe")
    .maybeSingle();

  if (error) {
    console.error("[enableOnlineCheckoutForCompany] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return { ok: false, error: "Failed to load Stripe payment account." };
  }

  if (!data) {
    return {
      ok: false,
      error: "Connect Stripe before enabling online checkout.",
    };
  }

  const account = mapCompanyPaymentAccountRow(data as CompanyPaymentAccountRow);
  const validation = validateOnlineCheckoutEnablePreconditions(account);

  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const { error: updateError } = await supabase
    .from("company_payment_accounts")
    .update({ online_payments_enabled: true })
    .eq("id", account.id)
    .eq("company_id", companyId)
    .eq("provider", "stripe")
    .eq("online_payments_enabled", false);

  if (updateError) {
    console.error("[enableOnlineCheckoutForCompany] update failed:", {
      companyId,
      accountId: account.id,
      code: updateError.code,
      message: updateError.message,
    });
    return { ok: false, error: "Failed to enable online checkout." };
  }

  return { ok: true };
}

export async function disableOnlineCheckoutForCompany(
  companyId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("company_payment_accounts")
    .select("id")
    .eq("company_id", companyId)
    .eq("provider", "stripe")
    .maybeSingle();

  if (error) {
    console.error("[disableOnlineCheckoutForCompany] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return { ok: false, error: "Failed to load Stripe payment account." };
  }

  if (!data) {
    return {
      ok: false,
      error: "No Stripe payment account is connected for this company.",
    };
  }

  const { error: updateError } = await supabase
    .from("company_payment_accounts")
    .update({ online_payments_enabled: false })
    .eq("id", data.id)
    .eq("company_id", companyId)
    .eq("provider", "stripe");

  if (updateError) {
    console.error("[disableOnlineCheckoutForCompany] update failed:", {
      companyId,
      accountId: data.id,
      code: updateError.code,
      message: updateError.message,
    });
    return { ok: false, error: "Failed to disable online checkout." };
  }

  return { ok: true };
}
