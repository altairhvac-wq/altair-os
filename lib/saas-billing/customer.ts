import "server-only";

import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";
import {
  isSaasStripeLivemode,
  requireSaasStripeSecretKey,
} from "@/lib/saas-billing/constants";
import type { CompanyBillingAccountRow } from "@/lib/saas-billing/types";
import { createServiceRoleClient } from "@/lib/supabase/service";

let platformStripeClient: Stripe | null = null;

/**
 * Platform Stripe client for Altair SaaS billing.
 * Never pass stripeAccount — this is not Connect.
 */
export function getPlatformStripeClient(): Stripe {
  if (!platformStripeClient) {
    platformStripeClient = new Stripe(requireSaasStripeSecretKey(), {
      apiVersion: "2026-05-27.dahlia",
      typescript: true,
    });
  }

  return platformStripeClient;
}

function mapBillingAccountRow(
  row: Database["public"]["Tables"]["company_billing_accounts"]["Row"],
): CompanyBillingAccountRow {
  return {
    id: row.id,
    company_id: row.company_id,
    stripe_customer_id: row.stripe_customer_id,
    livemode: row.livemode,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function findBillingAccountByCompanyId(
  companyId: string,
  supabase: SupabaseClient<Database> = createServiceRoleClient(),
): Promise<CompanyBillingAccountRow | null> {
  const { data, error } = await supabase
    .from("company_billing_accounts")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[saas-billing] findBillingAccountByCompanyId failed:", {
      companyId,
      code: error.code,
    });
    throw new Error("Failed to load company billing account.");
  }

  return data ? mapBillingAccountRow(data) : null;
}

async function loadCompanyForCustomer(
  companyId: string,
  supabase: SupabaseClient<Database>,
): Promise<{ id: string; name: string; email: string | null }> {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, email")
    .eq("id", companyId)
    .maybeSingle();

  if (error || !data) {
    console.error("[saas-billing] loadCompanyForCustomer failed:", {
      companyId,
      code: error?.code,
    });
    throw new Error("Company not found for billing customer creation.");
  }

  return data;
}

/**
 * One Stripe Customer per company forever, on the Altair platform account.
 * Creates the local billing account row when missing. Does not use Connect.
 */
export async function getOrCreateBillingCustomer(
  companyId: string,
  supabase: SupabaseClient<Database> = createServiceRoleClient(),
): Promise<CompanyBillingAccountRow> {
  const expectedLivemode = isSaasStripeLivemode();
  const existing = await findBillingAccountByCompanyId(companyId, supabase);

  if (existing?.stripe_customer_id) {
    if (existing.livemode !== expectedLivemode) {
      throw new Error(
        "Stripe live/test mode mismatch for this company's billing customer.",
      );
    }

    return existing;
  }

  const company = await loadCompanyForCustomer(companyId, supabase);
  const stripe = getPlatformStripeClient();

  const customer = await stripe.customers.create({
    name: company.name,
    email: company.email ?? undefined,
    metadata: {
      purpose: "saas_subscription",
      company_id: companyId,
    },
  });

  if (customer.livemode !== expectedLivemode) {
    throw new Error(
      "Stripe returned a customer in a different live/test mode than this server.",
    );
  }

  if (existing) {
    const { data, error } = await supabase
      .from("company_billing_accounts")
      .update({
        stripe_customer_id: customer.id,
        livemode: customer.livemode,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error || !data) {
      console.error("[saas-billing] billing account update failed:", {
        companyId,
        code: error?.code,
      });
      throw new Error("Failed to save Stripe customer on billing account.");
    }

    return mapBillingAccountRow(data);
  }

  const { data, error } = await supabase
    .from("company_billing_accounts")
    .insert({
      company_id: companyId,
      stripe_customer_id: customer.id,
      livemode: customer.livemode,
    })
    .select("*")
    .single();

  if (error || !data) {
    // Unique race: another request created the row — reload and reuse.
    if (error?.code === "23505") {
      const raced = await findBillingAccountByCompanyId(companyId, supabase);
      if (raced?.stripe_customer_id) {
        if (raced.livemode !== expectedLivemode) {
          throw new Error(
            "Stripe live/test mode mismatch for this company's billing customer.",
          );
        }
        return raced;
      }
    }

    console.error("[saas-billing] billing account insert failed:", {
      companyId,
      code: error?.code,
    });
    throw new Error("Failed to create company billing account.");
  }

  return mapBillingAccountRow(data);
}
