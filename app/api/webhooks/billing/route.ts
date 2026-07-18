import { NextResponse } from "next/server";
import {
  claimStaleProcessingSubscriptionEvent,
  claimSubscriptionEventForProcessing,
  claimSubscriptionEventForReprocessing,
  findSubscriptionEvent,
  getSaasBillingWebhookSecret,
  insertSubscriptionEventLedger,
  isStaleSubscriptionEventProcessing,
  processBillingWebhookEvent,
  SaasBillingWebhookVerificationError,
  STALE_SUBSCRIPTION_EVENT_PROCESSING_MS,
  stripeEventPayload,
  verifyBillingWebhookEvent,
  type ProcessBillingWebhookResult,
} from "@/lib/saas-billing";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

function buildSkippedDuplicateResponse() {
  return NextResponse.json({
    received: true,
    processed: false,
    duplicate: true,
    skipped: true,
  });
}

function buildClaimFailedResponse() {
  return NextResponse.json(
    { error: "Failed to claim webhook event for processing" },
    { status: 500 },
  );
}

function buildProcessResponse(processResult: ProcessBillingWebhookResult) {
  if ("retryable" in processResult && processResult.retryable) {
    return NextResponse.json(
      { received: true, processed: false, error: "Processing failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    received: true,
    processed: processResult.processed,
    ...(processResult.ignored ? { ignored: true } : {}),
  });
}

async function claimAndProcessBillingWebhookEvent(
  supabase: ReturnType<typeof createServiceRoleClient>,
  event: Parameters<typeof processBillingWebhookEvent>[1],
) {
  const processResult = await processBillingWebhookEvent(supabase, event);
  return buildProcessResponse(processResult);
}

/**
 * Altair SaaS subscription billing webhook.
 * Isolated from /api/webhooks/payments (Connect invoice payments).
 * Uses STRIPE_BILLING_WEBHOOK_SECRET — never STRIPE_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = getSaasBillingWebhookSecret();

  if (!webhookSecret) {
    console.error(
      "[saas-billing-webhook] STRIPE_BILLING_WEBHOOK_SECRET is not configured",
    );
    return NextResponse.json(
      { error: "Webhook verification is not configured" },
      { status: 400 },
    );
  }

  let event;
  try {
    event = verifyBillingWebhookEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[saas-billing-webhook] signature verification failed", {
      hasSignature: Boolean(signature),
    });
    if (error instanceof SaasBillingWebhookVerificationError) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 },
    );
  }

  console.info("[saas-billing-webhook] event verified", {
    eventId: event.id,
    eventType: event.type,
  });

  const supabase = createServiceRoleClient();
  const insertResult = await insertSubscriptionEventLedger(supabase, {
    provider_event_id: event.id,
    event_type: event.type,
    processing_status: "received",
    payload: stripeEventPayload(event),
    company_id: null,
  });

  if (!insertResult.ok) {
    console.error("[saas-billing-webhook] ledger insert failed", {
      eventId: event.id,
      eventType: event.type,
    });
    return NextResponse.json(
      { error: "Failed to record webhook event" },
      { status: 500 },
    );
  }

  if (insertResult.duplicate) {
    const existingEvent = await findSubscriptionEvent(supabase, event.id);

    if (!existingEvent) {
      return NextResponse.json(
        { error: "Failed to load duplicate webhook event" },
        { status: 500 },
      );
    }

    const { processingStatus, updatedAt } = existingEvent;

    if (processingStatus === "processed" || processingStatus === "ignored") {
      return buildSkippedDuplicateResponse();
    }

    if (processingStatus === "processing") {
      if (!isStaleSubscriptionEventProcessing(updatedAt)) {
        return buildSkippedDuplicateResponse();
      }

      const staleBeforeIso = new Date(
        Date.now() - STALE_SUBSCRIPTION_EVENT_PROCESSING_MS,
      ).toISOString();
      const claimResult = await claimStaleProcessingSubscriptionEvent(
        supabase,
        event.id,
        staleBeforeIso,
      );

      if (claimResult.error) {
        return buildClaimFailedResponse();
      }

      if (!claimResult.claimed) {
        return buildSkippedDuplicateResponse();
      }

      return claimAndProcessBillingWebhookEvent(supabase, event);
    }

    const claimResult = await claimSubscriptionEventForReprocessing(
      supabase,
      event.id,
    );

    if (claimResult.error) {
      return buildClaimFailedResponse();
    }

    if (!claimResult.claimed) {
      return buildSkippedDuplicateResponse();
    }

    return claimAndProcessBillingWebhookEvent(supabase, event);
  }

  const claimResult = await claimSubscriptionEventForProcessing(
    supabase,
    event.id,
  );

  if (claimResult.error) {
    return buildClaimFailedResponse();
  }

  if (!claimResult.claimed) {
    return NextResponse.json({
      received: true,
      processed: false,
      skipped: true,
    });
  }

  return claimAndProcessBillingWebhookEvent(supabase, event);
}
