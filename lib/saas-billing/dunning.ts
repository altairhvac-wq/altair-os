import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { Database } from "@/lib/database/types";
import { sendSaasDunningEmail } from "@/lib/email/saas-dunning";
import { captureMonitoredEvent } from "@/lib/operations/monitoring";
import { SAAS_PLAN_LABELS, isSaasPlanKey } from "@/lib/saas-billing/catalog";
import { isValidEmail } from "@/shared/lib/email-validation";

/**
 * Tells the company's owners that their subscription payment failed
 * (launch audit H8).
 *
 * ==================== IDEMPOTENT PER STRIPE EVENT ====================
 * The webhook ledger stops the same event from being PROCESSED twice, but a
 * retry after a partial failure re-runs the handler, and an email cannot be
 * rolled back. So the first thing this does is claim
 * `subscription_dunning_notices` for the event id (unique). A second pass
 * finds the claim and sends nothing. If every send fails, the claim is
 * released so a manual reprocess of the event can try again.
 *
 * ==================== NEVER FAILS THE WEBHOOK ====================
 * The subscription mirror has already been written by the time this runs.
 * A mail-provider outage must not turn a correctly recorded payment failure
 * into a 500 that Stripe retries for days; every failure here is logged,
 * reported to the monitor, and swallowed.
 *
 * Recipients are resolved from active OWNER memberships joined to profiles.
 * Addresses are never logged — only the count and the company id.
 */

export type DunningNotificationResult =
  | { status: "sent"; recipientCount: number }
  | { status: "already_sent" }
  | { status: "no_recipients" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

type OwnerRecipient = {
  email: string;
  fullName: string | null;
};

async function loadOwnerRecipients(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<OwnerRecipient[] | null> {
  const { data, error } = await supabase
    .from("company_memberships")
    .select("user_id, profile:profiles!company_memberships_user_id_fkey(email, full_name)")
    .eq("company_id", companyId)
    .eq("role", "owner")
    .eq("status", "active")
    .not("user_id", "is", null);

  if (error) {
    console.error("[saas-billing] dunning owner lookup failed:", {
      companyId,
      code: error.code,
    });
    return null;
  }

  const seen = new Set<string>();
  const recipients: OwnerRecipient[] = [];

  for (const row of data ?? []) {
    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    const email = profile?.email?.trim().toLowerCase();
    if (!email || !isValidEmail(email) || seen.has(email)) {
      continue;
    }
    seen.add(email);
    recipients.push({ email, fullName: profile?.full_name ?? null });
  }

  return recipients;
}

function invoiceAmountDue(invoice: Stripe.Invoice): number | null {
  const cents = invoice.amount_due;
  if (typeof cents !== "number" || !Number.isFinite(cents)) {
    return null;
  }
  return Math.round(cents) / 100;
}

export async function notifyOwnersOfSubscriptionPaymentFailure(
  supabase: SupabaseClient<Database>,
  params: {
    companyId: string;
    providerEventId: string;
    invoice: Stripe.Invoice;
    planKey: string | null;
    graceEndsAt: string | null;
  },
): Promise<DunningNotificationResult> {
  const { companyId, providerEventId } = params;

  try {
    // 1. Claim the event. A duplicate key means another pass already owns it.
    const { error: claimError } = await supabase
      .from("subscription_dunning_notices")
      .insert({
        company_id: companyId,
        provider: "stripe",
        provider_event_id: providerEventId,
        stripe_invoice_id: params.invoice.id ?? null,
        grace_period_ends_at: params.graceEndsAt,
      });

    if (claimError) {
      if (claimError.code === "23505") {
        return { status: "already_sent" };
      }
      console.error("[saas-billing] dunning claim failed:", {
        companyId,
        providerEventId,
        code: claimError.code,
      });
      return { status: "failed", reason: "claim_failed" };
    }

    // 2. Who gets it.
    const [recipients, company] = await Promise.all([
      loadOwnerRecipients(supabase, companyId),
      supabase
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .maybeSingle(),
    ]);

    if (!recipients) {
      await releaseClaim(supabase, providerEventId);
      return { status: "failed", reason: "owner_lookup_failed" };
    }

    if (recipients.length === 0) {
      captureMonitoredEvent({
        event: "billing.dunning_no_owner_recipients",
        level: "warning",
        companyId,
        meta: { providerEventId },
      });
      return { status: "no_recipients" };
    }

    const companyName = company.data?.name?.trim() || "your company";
    const planLabel =
      params.planKey && isSaasPlanKey(params.planKey)
        ? SAAS_PLAN_LABELS[params.planKey]
        : "subscription";

    // 3. Send. Sequential on purpose: owners are a handful, and a provider
    //    rate limit is easier to reason about than a burst.
    let sent = 0;
    for (const recipient of recipients) {
      const result = await sendSaasDunningEmail({
        to: recipient.email,
        recipientName: recipient.fullName,
        companyName,
        planLabel,
        graceEndsAt: params.graceEndsAt,
        amountDue: invoiceAmountDue(params.invoice),
        currency: params.invoice.currency ?? null,
        hostedInvoiceUrl: params.invoice.hosted_invoice_url ?? null,
      });

      if (result.ok) {
        sent += 1;
      } else {
        console.error("[saas-billing] dunning email send failed:", {
          companyId,
          providerEventId,
          reason: result.reason,
          failureCode: result.failureCode,
        });
      }
    }

    if (sent === 0) {
      await releaseClaim(supabase, providerEventId);
      captureMonitoredEvent({
        event: "billing.dunning_email_failed",
        level: "error",
        companyId,
        meta: { providerEventId, attempted: recipients.length },
      });
      return { status: "failed", reason: "all_sends_failed" };
    }

    // 4. Record what went out.
    const { error: finishError } = await supabase
      .from("subscription_dunning_notices")
      .update({ recipient_count: sent, sent_at: new Date().toISOString() })
      .eq("provider", "stripe")
      .eq("provider_event_id", providerEventId);

    if (finishError) {
      console.error("[saas-billing] dunning record update failed:", {
        companyId,
        providerEventId,
        code: finishError.code,
      });
    }

    console.info("[saas-billing] dunning email sent", {
      companyId,
      providerEventId,
      recipientCount: sent,
      attempted: recipients.length,
    });

    return { status: "sent", recipientCount: sent };
  } catch (error) {
    console.error("[saas-billing] dunning notification threw:", {
      companyId,
      providerEventId,
      errorName: error instanceof Error ? error.name : "unknown",
    });
    captureMonitoredEvent({
      event: "billing.dunning_email_failed",
      level: "error",
      companyId,
      meta: { providerEventId, thrown: true },
    });
    return { status: "failed", reason: "exception" };
  }
}

async function releaseClaim(
  supabase: SupabaseClient<Database>,
  providerEventId: string,
): Promise<void> {
  const { error } = await supabase
    .from("subscription_dunning_notices")
    .delete()
    .eq("provider", "stripe")
    .eq("provider_event_id", providerEventId)
    .is("sent_at", null);

  if (error) {
    console.error("[saas-billing] dunning claim release failed:", {
      providerEventId,
      code: error.code,
    });
  }
}
