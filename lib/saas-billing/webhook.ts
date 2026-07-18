import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import StripeSDK from "stripe";
import type { Database } from "@/lib/database/types";
import type { Json } from "@/lib/database/types/enums";
import {
  getSaasBillingWebhookSecret,
  isSaasCheckoutPlanKey,
  isSaasPlanKey,
  SAAS_CHECKOUT_METADATA_PURPOSE,
  SAAS_GRACE_PERIOD_DAYS,
} from "@/lib/saas-billing/constants";
import { getPlatformStripeClient } from "@/lib/saas-billing/customer";
import type {
  SaasPlanKey,
  SaasSubscriptionStatus,
  SubscriptionEventProcessingStatus,
} from "@/lib/saas-billing/types";

export const STALE_SUBSCRIPTION_EVENT_PROCESSING_MS = 10 * 60 * 1000;

export type ProcessBillingWebhookResult =
  | { processed: true; ignored: false }
  | { processed: false; ignored: true }
  | { processed: false; ignored: false; retryable: true; error: string };

export class SaasBillingWebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaasBillingWebhookVerificationError";
  }
}

const SUPPORTED_EVENT_TYPES = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

const STRIPE_STATUS_MAP: Record<string, SaasSubscriptionStatus> = {
  active: "active",
  trialing: "trialing",
  past_due: "past_due",
  canceled: "canceled",
  unpaid: "unpaid",
  incomplete: "incomplete",
  incomplete_expired: "incomplete_expired",
  paused: "paused",
};

export function verifyBillingWebhookEvent(
  rawBody: string,
  signature: string | null,
  webhookSecret: string = getSaasBillingWebhookSecret() ?? "",
): Stripe.Event {
  if (!webhookSecret) {
    throw new SaasBillingWebhookVerificationError(
      "STRIPE_BILLING_WEBHOOK_SECRET is not configured",
    );
  }

  if (!signature) {
    throw new SaasBillingWebhookVerificationError("Missing stripe-signature header");
  }

  try {
    return StripeSDK.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    throw new SaasBillingWebhookVerificationError("Invalid webhook signature");
  }
}

export function stripeEventPayload(event: unknown): Json {
  return JSON.parse(JSON.stringify(event)) as Json;
}

export type InsertSubscriptionEventResult =
  | { ok: true; duplicate: false }
  | { ok: true; duplicate: true }
  | { ok: false };

export async function insertSubscriptionEventLedger(
  supabase: SupabaseClient<Database>,
  row: {
    provider_event_id: string;
    event_type: string;
    processing_status?: SubscriptionEventProcessingStatus;
    payload: Json;
    company_id?: string | null;
  },
): Promise<InsertSubscriptionEventResult> {
  const { error } = await supabase.from("subscription_event_ledger").insert({
    provider: "stripe",
    provider_event_id: row.provider_event_id,
    event_type: row.event_type,
    processing_status: row.processing_status ?? "received",
    payload: row.payload,
    company_id: row.company_id ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: true, duplicate: true };
    }

    console.error("[saas-billing] subscription_event_ledger insert failed:", {
      code: error.code,
    });
    return { ok: false };
  }

  return { ok: true, duplicate: false };
}

export type SubscriptionEventLookup = {
  id: string;
  processingStatus: SubscriptionEventProcessingStatus;
  updatedAt: string;
};

export async function findSubscriptionEvent(
  supabase: SupabaseClient<Database>,
  providerEventId: string,
): Promise<SubscriptionEventLookup | null> {
  const { data, error } = await supabase
    .from("subscription_event_ledger")
    .select("id, processing_status, updated_at")
    .eq("provider", "stripe")
    .eq("provider_event_id", providerEventId)
    .maybeSingle();

  if (error) {
    console.error("[saas-billing] findSubscriptionEvent failed:", {
      providerEventId,
      code: error.code,
    });
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    processingStatus: data.processing_status as SubscriptionEventProcessingStatus,
    updatedAt: data.updated_at,
  };
}

export function isStaleSubscriptionEventProcessing(
  updatedAt: string,
  nowMs: number = Date.now(),
): boolean {
  const updatedAtMs = Date.parse(updatedAt);
  if (Number.isNaN(updatedAtMs)) {
    return false;
  }
  return nowMs - updatedAtMs >= STALE_SUBSCRIPTION_EVENT_PROCESSING_MS;
}

async function updateSubscriptionEvent(
  supabase: SupabaseClient<Database>,
  providerEventId: string,
  update: {
    processing_status: SubscriptionEventProcessingStatus;
    company_id?: string | null;
    error_message?: string | null;
    processed_at?: string | null;
  },
): Promise<boolean> {
  const { error } = await supabase
    .from("subscription_event_ledger")
    .update(update)
    .eq("provider", "stripe")
    .eq("provider_event_id", providerEventId);

  if (error) {
    console.error("[saas-billing] subscription_event_ledger update failed:", {
      providerEventId,
      code: error.code,
    });
    return false;
  }

  return true;
}

export async function claimSubscriptionEventForProcessing(
  supabase: SupabaseClient<Database>,
  providerEventId: string,
): Promise<{ claimed: boolean; error: boolean }> {
  const { data, error } = await supabase
    .from("subscription_event_ledger")
    .update({ processing_status: "processing", error_message: null })
    .eq("provider", "stripe")
    .eq("provider_event_id", providerEventId)
    .eq("processing_status", "received")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[saas-billing] claim for processing failed:", {
      providerEventId,
      code: error.code,
    });
    return { claimed: false, error: true };
  }

  return { claimed: Boolean(data), error: false };
}

export async function claimSubscriptionEventForReprocessing(
  supabase: SupabaseClient<Database>,
  providerEventId: string,
): Promise<{ claimed: boolean; error: boolean }> {
  const { data, error } = await supabase
    .from("subscription_event_ledger")
    .update({ processing_status: "processing", error_message: null })
    .eq("provider", "stripe")
    .eq("provider_event_id", providerEventId)
    .in("processing_status", ["failed", "received"])
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[saas-billing] claim for reprocessing failed:", {
      providerEventId,
      code: error.code,
    });
    return { claimed: false, error: true };
  }

  return { claimed: Boolean(data), error: false };
}

export async function claimStaleProcessingSubscriptionEvent(
  supabase: SupabaseClient<Database>,
  providerEventId: string,
  staleBeforeIso: string,
): Promise<{ claimed: boolean; error: boolean }> {
  const { data, error } = await supabase
    .from("subscription_event_ledger")
    .update({ processing_status: "processing", error_message: null })
    .eq("provider", "stripe")
    .eq("provider_event_id", providerEventId)
    .eq("processing_status", "processing")
    .lt("updated_at", staleBeforeIso)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[saas-billing] claim stale processing failed:", {
      providerEventId,
      code: error.code,
    });
    return { claimed: false, error: true };
  }

  return { claimed: Boolean(data), error: false };
}

function unixToIso(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return new Date(value * 1000).toISOString();
}

function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): SaasSubscriptionStatus {
  return STRIPE_STATUS_MAP[status] ?? "incomplete";
}

function readMetadataCompanyId(
  metadata: Stripe.Metadata | null | undefined,
): string | null {
  return metadata?.company_id?.trim() || null;
}

function readMetadataPlanKey(
  metadata: Stripe.Metadata | null | undefined,
): SaasPlanKey | null {
  const raw = metadata?.plan_key?.trim();
  if (!raw) {
    return null;
  }
  if (isSaasCheckoutPlanKey(raw) || isSaasPlanKey(raw)) {
    return raw;
  }
  return null;
}

function readMetadataPurpose(
  metadata: Stripe.Metadata | null | undefined,
): string | null {
  return metadata?.purpose?.trim() || null;
}

async function findBillingAccountByStripeCustomerId(
  supabase: SupabaseClient<Database>,
  stripeCustomerId: string,
): Promise<{ id: string; company_id: string } | null> {
  const { data, error } = await supabase
    .from("company_billing_accounts")
    .select("id, company_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (error) {
    console.error("[saas-billing] findBillingAccountByStripeCustomerId failed:", {
      code: error.code,
    });
    return null;
  }

  return data;
}

function extractCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | null {
  if (typeof customer === "string") {
    return customer.trim() || null;
  }
  if (customer && typeof customer === "object" && "id" in customer) {
    return customer.id;
  }
  return null;
}

function extractSubscriptionIdFromInvoice(
  invoice: Stripe.Invoice,
): string | null {
  const details = invoice.parent?.subscription_details;
  const subscription = details?.subscription;
  if (typeof subscription === "string") {
    return subscription.trim() || null;
  }
  if (subscription && typeof subscription === "object" && "id" in subscription) {
    return subscription.id;
  }
  return null;
}

async function retrieveStripeSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  return getPlatformStripeClient().subscriptions.retrieve(subscriptionId);
}

function graceEndsAtFromNow(): string {
  const ends = new Date();
  ends.setUTCDate(ends.getUTCDate() + SAAS_GRACE_PERIOD_DAYS);
  return ends.toISOString();
}

async function upsertCompanySubscriptionFromStripe(
  supabase: SupabaseClient<Database>,
  params: {
    companyId: string;
    billingAccountId: string | null;
    subscription: Stripe.Subscription;
    planKey?: SaasPlanKey | null;
    clearGrace?: boolean;
    setGrace?: boolean;
  },
): Promise<{ ok: boolean }> {
  const { subscription } = params;
  const status = mapStripeSubscriptionStatus(subscription.status);
  const planKey =
    params.planKey ??
    readMetadataPlanKey(subscription.metadata) ??
    "starter";

  const firstItem = subscription.items.data[0];
  const periodStart =
    unixToIso(firstItem?.current_period_start) ??
    unixToIso(subscription.start_date);
  const periodEnd = unixToIso(firstItem?.current_period_end);

  const patch = {
    billing_account_id: params.billingAccountId,
    plan_key: planKey,
    stripe_subscription_id: subscription.id,
    status,
    trial_starts_at: unixToIso(subscription.trial_start),
    trial_ends_at: unixToIso(subscription.trial_end),
    current_period_starts_at: periodStart,
    current_period_ends_at: periodEnd,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    canceled_at: unixToIso(subscription.canceled_at),
    // Paid subscription supersedes complimentary beta grant.
    access_grant: "none" as const,
    ...(params.clearGrace ? { grace_period_ends_at: null } : {}),
    ...(params.setGrace ? { grace_period_ends_at: graceEndsAtFromNow() } : {}),
  };

  const { data: existing, error: existingError } = await supabase
    .from("company_subscriptions")
    .select("id")
    .eq("company_id", params.companyId)
    .maybeSingle();

  if (existingError) {
    console.error("[saas-billing] load subscription for upsert failed:", {
      companyId: params.companyId,
      code: existingError.code,
    });
    return { ok: false };
  }

  if (existing) {
    const { error } = await supabase
      .from("company_subscriptions")
      .update(patch)
      .eq("id", existing.id);

    if (error) {
      console.error("[saas-billing] subscription update failed:", {
        companyId: params.companyId,
        code: error.code,
      });
      return { ok: false };
    }

    return { ok: true };
  }

  const { error } = await supabase.from("company_subscriptions").insert({
    company_id: params.companyId,
    ...patch,
  });

  if (error) {
    console.error("[saas-billing] subscription insert failed:", {
      companyId: params.companyId,
      code: error.code,
    });
    return { ok: false };
  }

  return { ok: true };
}

async function resolveCompanyContext(
  supabase: SupabaseClient<Database>,
  options: {
    metadataCompanyId?: string | null;
    stripeCustomerId?: string | null;
  },
): Promise<{ companyId: string; billingAccountId: string | null } | null> {
  if (options.metadataCompanyId) {
    const { data } = await supabase
      .from("company_billing_accounts")
      .select("id, company_id")
      .eq("company_id", options.metadataCompanyId)
      .maybeSingle();

    return {
      companyId: options.metadataCompanyId,
      billingAccountId: data?.id ?? null,
    };
  }

  if (options.stripeCustomerId) {
    const account = await findBillingAccountByStripeCustomerId(
      supabase,
      options.stripeCustomerId,
    );
    if (!account) {
      return null;
    }
    return {
      companyId: account.company_id,
      billingAccountId: account.id,
    };
  }

  return null;
}

function sanitizeProcessingError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.slice(0, 500);
  }
  return "SaaS billing webhook processing failed";
}

async function markProcessed(
  supabase: SupabaseClient<Database>,
  eventId: string,
  companyId: string | null,
): Promise<ProcessBillingWebhookResult> {
  const ok = await updateSubscriptionEvent(supabase, eventId, {
    processing_status: "processed",
    company_id: companyId,
    error_message: null,
    processed_at: new Date().toISOString(),
  });

  if (!ok) {
    return {
      processed: false,
      ignored: false,
      retryable: true,
      error: "Failed to mark event processed",
    };
  }

  return { processed: true, ignored: false };
}

async function markIgnored(
  supabase: SupabaseClient<Database>,
  eventId: string,
  companyId: string | null,
  reason: string,
): Promise<ProcessBillingWebhookResult> {
  const ok = await updateSubscriptionEvent(supabase, eventId, {
    processing_status: "ignored",
    company_id: companyId,
    error_message: reason,
    processed_at: new Date().toISOString(),
  });

  if (!ok) {
    return {
      processed: false,
      ignored: false,
      retryable: true,
      error: "Failed to mark event ignored",
    };
  }

  return { processed: false, ignored: true };
}

async function markFailed(
  supabase: SupabaseClient<Database>,
  eventId: string,
  companyId: string | null,
  error: unknown,
): Promise<ProcessBillingWebhookResult> {
  await updateSubscriptionEvent(supabase, eventId, {
    processing_status: "failed",
    company_id: companyId,
    error_message: sanitizeProcessingError(error),
    processed_at: null,
  });

  return {
    processed: false,
    ignored: false,
    retryable: true,
    error: sanitizeProcessingError(error),
  };
}

async function handleCheckoutSessionCompleted(
  supabase: SupabaseClient<Database>,
  event: Stripe.Event,
): Promise<{ companyId: string | null; result: ProcessBillingWebhookResult }> {
  const session = event.data.object as Stripe.Checkout.Session;

  if (session.mode !== "subscription") {
    return {
      companyId: null,
      result: await markIgnored(
        supabase,
        event.id,
        null,
        "Not a subscription checkout session",
      ),
    };
  }

  const purpose = readMetadataPurpose(session.metadata);
  if (purpose !== SAAS_CHECKOUT_METADATA_PURPOSE) {
    return {
      companyId: readMetadataCompanyId(session.metadata),
      result: await markIgnored(
        supabase,
        event.id,
        readMetadataCompanyId(session.metadata),
        "Checkout purpose is not saas_subscription",
      ),
    };
  }

  const companyId = readMetadataCompanyId(session.metadata);
  const planKey = readMetadataPlanKey(session.metadata);
  const customerId = extractCustomerId(session.customer);
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  if (!companyId || !subscriptionId) {
    return {
      companyId,
      result: await markFailed(
        supabase,
        event.id,
        companyId,
        new Error("Missing company_id or subscription on checkout session"),
      ),
    };
  }

  const resolved = await resolveCompanyContext(supabase, {
    metadataCompanyId: companyId,
    stripeCustomerId: customerId,
  });

  const stripeSubscription = await retrieveStripeSubscription(subscriptionId);
  const upsert = await upsertCompanySubscriptionFromStripe(supabase, {
    companyId,
    billingAccountId: resolved?.billingAccountId ?? null,
    subscription: stripeSubscription,
    planKey,
    clearGrace: true,
  });

  if (!upsert.ok) {
    return {
      companyId,
      result: await markFailed(
        supabase,
        event.id,
        companyId,
        new Error("Failed to mirror subscription after checkout"),
      ),
    };
  }

  return {
    companyId,
    result: await markProcessed(supabase, event.id, companyId),
  };
}

async function handleSubscriptionLifecycle(
  supabase: SupabaseClient<Database>,
  event: Stripe.Event,
  options: { deleted?: boolean } = {},
): Promise<{ companyId: string | null; result: ProcessBillingWebhookResult }> {
  const subscription = event.data.object as Stripe.Subscription;
  const purpose = readMetadataPurpose(subscription.metadata);

  if (purpose && purpose !== SAAS_CHECKOUT_METADATA_PURPOSE) {
    return {
      companyId: readMetadataCompanyId(subscription.metadata),
      result: await markIgnored(
        supabase,
        event.id,
        readMetadataCompanyId(subscription.metadata),
        "Subscription purpose is not saas_subscription",
      ),
    };
  }

  const customerId = extractCustomerId(subscription.customer);
  const resolved = await resolveCompanyContext(supabase, {
    metadataCompanyId: readMetadataCompanyId(subscription.metadata),
    stripeCustomerId: customerId,
  });

  if (!resolved) {
    return {
      companyId: null,
      result: await markIgnored(
        supabase,
        event.id,
        null,
        "No matching company billing account",
      ),
    };
  }

  const upsert = await upsertCompanySubscriptionFromStripe(supabase, {
    companyId: resolved.companyId,
    billingAccountId: resolved.billingAccountId,
    subscription: options.deleted
      ? {
          ...subscription,
          status: "canceled",
        }
      : subscription,
    planKey: readMetadataPlanKey(subscription.metadata),
    clearGrace:
      !options.deleted &&
      (subscription.status === "active" || subscription.status === "trialing"),
    setGrace: !options.deleted && subscription.status === "past_due",
  });

  if (!upsert.ok) {
    return {
      companyId: resolved.companyId,
      result: await markFailed(
        supabase,
        event.id,
        resolved.companyId,
        new Error("Failed to mirror subscription"),
      ),
    };
  }

  return {
    companyId: resolved.companyId,
    result: await markProcessed(supabase, event.id, resolved.companyId),
  };
}

async function handleInvoiceEvent(
  supabase: SupabaseClient<Database>,
  event: Stripe.Event,
  kind: "paid" | "payment_failed",
): Promise<{ companyId: string | null; result: ProcessBillingWebhookResult }> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = extractCustomerId(invoice.customer);
  const subscriptionId = extractSubscriptionIdFromInvoice(invoice);

  if (!subscriptionId) {
    return {
      companyId: null,
      result: await markIgnored(
        supabase,
        event.id,
        null,
        "Invoice is not tied to a subscription",
      ),
    };
  }

  const resolved = await resolveCompanyContext(supabase, {
    stripeCustomerId: customerId,
  });

  if (!resolved) {
    return {
      companyId: null,
      result: await markIgnored(
        supabase,
        event.id,
        null,
        "No matching company billing account for invoice",
      ),
    };
  }

  const stripeSubscription = await retrieveStripeSubscription(subscriptionId);
  const purpose = readMetadataPurpose(stripeSubscription.metadata);

  if (purpose && purpose !== SAAS_CHECKOUT_METADATA_PURPOSE) {
    return {
      companyId: resolved.companyId,
      result: await markIgnored(
        supabase,
        event.id,
        resolved.companyId,
        "Invoice subscription is not saas_subscription",
      ),
    };
  }

  const upsert = await upsertCompanySubscriptionFromStripe(supabase, {
    companyId: resolved.companyId,
    billingAccountId: resolved.billingAccountId,
    subscription: stripeSubscription,
    planKey: readMetadataPlanKey(stripeSubscription.metadata),
    clearGrace: kind === "paid",
    setGrace: kind === "payment_failed",
  });

  if (!upsert.ok) {
    return {
      companyId: resolved.companyId,
      result: await markFailed(
        supabase,
        event.id,
        resolved.companyId,
        new Error("Failed to mirror subscription from invoice event"),
      ),
    };
  }

  return {
    companyId: resolved.companyId,
    result: await markProcessed(supabase, event.id, resolved.companyId),
  };
}

/**
 * Processes a verified SaaS billing webhook event. Idempotent via ledger claims.
 */
export async function processBillingWebhookEvent(
  supabase: SupabaseClient<Database>,
  event: Stripe.Event,
): Promise<ProcessBillingWebhookResult> {
  if (!SUPPORTED_EVENT_TYPES.has(event.type)) {
    return markIgnored(supabase, event.id, null, `Unsupported event type: ${event.type}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const { result } = await handleCheckoutSessionCompleted(supabase, event);
        return result;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const { result } = await handleSubscriptionLifecycle(supabase, event);
        return result;
      }
      case "customer.subscription.deleted": {
        const { result } = await handleSubscriptionLifecycle(supabase, event, {
          deleted: true,
        });
        return result;
      }
      case "invoice.paid": {
        const { result } = await handleInvoiceEvent(supabase, event, "paid");
        return result;
      }
      case "invoice.payment_failed": {
        const { result } = await handleInvoiceEvent(
          supabase,
          event,
          "payment_failed",
        );
        return result;
      }
      default:
        return markIgnored(supabase, event.id, null, `Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error("[saas-billing] processBillingWebhookEvent failed:", {
      eventId: event.id,
      eventType: event.type,
    });
    return markFailed(supabase, event.id, null, error);
  }
}
