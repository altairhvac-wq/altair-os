import { NextResponse } from "next/server";
import { getStripeWebhookSecret } from "@/lib/payments/env";
import {
  insertPaymentProviderEvent,
  stripeEventPayload,
} from "@/lib/payments/insert-provider-event";
import { processStripeWebhookEvent } from "@/lib/payments/process-stripe-webhook-event";
import type { ProcessStripeWebhookEventResult } from "@/lib/payments/process-stripe-webhook-event";
import {
  StripeWebhookVerificationError,
  verifyStripeWebhookEvent,
} from "@/lib/payments/stripe-webhook";
import {
  claimPaymentProviderEventForProcessing,
  claimPaymentProviderEventForReprocessing,
  claimStaleProcessingPaymentProviderEvent,
  findPaymentProviderEvent,
  isStalePaymentProviderEventProcessing,
  STALE_PAYMENT_PROVIDER_EVENT_PROCESSING_MS,
} from "@/lib/database/services/payment-provider-events";
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

/**
 * Payment integrity invariant: a transient failure while claiming a provider event for
 * processing means we do not know whether this event's payment has been (or will be)
 * committed. Unlike a legitimate lost claim race (another request already holds or
 * finalized the event), this is an unresolved DB/network failure — it must surface as
 * HTTP 500 so Stripe retries the delivery, never a silent 200.
 */
function buildClaimFailedResponse() {
  return NextResponse.json(
    { error: "Failed to claim webhook event for processing" },
    { status: 500 },
  );
}

function buildProcessResponse(processResult: ProcessStripeWebhookEventResult) {
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

async function claimAndProcessStripeWebhookEvent(
  supabase: ReturnType<typeof createServiceRoleClient>,
  event: Parameters<typeof processStripeWebhookEvent>[1],
) {
  const processResult = await processStripeWebhookEvent(supabase, event);
  return buildProcessResponse(processResult);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = getStripeWebhookSecret();

  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook verification is not configured" },
      { status: 400 },
    );
  }

  let event;
  try {
    event = verifyStripeWebhookEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe-webhook] signature verification failed", {
      hasSignature: Boolean(signature),
    });
    if (error instanceof StripeWebhookVerificationError) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  console.info("[stripe-webhook] event verified", {
    eventId: event.id,
    eventType: event.type,
    hasEventAccount: typeof event.account === "string" && event.account.length > 0,
  });

  const supabase = createServiceRoleClient();
  const insertResult = await insertPaymentProviderEvent(supabase, {
    provider: "stripe",
    provider_event_id: event.id,
    event_type: event.type,
    processing_status: "received",
    payload: stripeEventPayload(event),
    company_id: null,
  });

  if (!insertResult.ok) {
    console.error("[payment-provider-event] ledger insert failed", {
      eventId: event.id,
      eventType: event.type,
    });
    return NextResponse.json(
      { error: "Failed to record webhook event" },
      { status: 500 },
    );
  }

  if (insertResult.duplicate) {
    const existingEvent = await findPaymentProviderEvent(
      supabase,
      "stripe",
      event.id,
    );

    if (!existingEvent) {
      return NextResponse.json(
        { error: "Failed to load duplicate webhook event" },
        { status: 500 },
      );
    }

    const { processingStatus, updatedAt } = existingEvent;

    if (
      processingStatus === "processed" ||
      processingStatus === "ignored" ||
      processingStatus === "reconciliation_required"
    ) {
      return buildSkippedDuplicateResponse();
    }

    if (processingStatus === "processing") {
      if (!isStalePaymentProviderEventProcessing(updatedAt)) {
        return buildSkippedDuplicateResponse();
      }

      const staleBeforeIso = new Date(
        Date.now() - STALE_PAYMENT_PROVIDER_EVENT_PROCESSING_MS,
      ).toISOString();
      const claimResult = await claimStaleProcessingPaymentProviderEvent(
        supabase,
        "stripe",
        event.id,
        staleBeforeIso,
      );

      if (claimResult.error) {
        return buildClaimFailedResponse();
      }

      if (!claimResult.claimed) {
        return buildSkippedDuplicateResponse();
      }

      return claimAndProcessStripeWebhookEvent(supabase, event);
    }

    const claimResult = await claimPaymentProviderEventForReprocessing(
      supabase,
      "stripe",
      event.id,
    );

    if (claimResult.error) {
      return buildClaimFailedResponse();
    }

    if (!claimResult.claimed) {
      return buildSkippedDuplicateResponse();
    }

    return claimAndProcessStripeWebhookEvent(supabase, event);
  }

  const claimResult = await claimPaymentProviderEventForProcessing(
    supabase,
    "stripe",
    event.id,
  );

  if (claimResult.error) {
    return buildClaimFailedResponse();
  }

  if (!claimResult.claimed) {
    // Another concurrent delivery already claimed this freshly-inserted event and is
    // actively processing it — not a failure, just a lost race.
    return NextResponse.json({
      received: true,
      processed: false,
      skipped: true,
    });
  }

  return claimAndProcessStripeWebhookEvent(supabase, event);
}
