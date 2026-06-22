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
  claimPaymentProviderEventForReprocessing,
  findPaymentProviderEvent,
} from "@/lib/database/services/payment-provider-events";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

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

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = getStripeWebhookSecret();

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook verification is not configured" },
      { status: 400 },
    );
  }

  let event;
  try {
    event = verifyStripeWebhookEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    if (error instanceof StripeWebhookVerificationError) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

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

    const { processingStatus } = existingEvent;

    if (
      processingStatus === "processed" ||
      processingStatus === "ignored" ||
      processingStatus === "processing"
    ) {
      return NextResponse.json({
        received: true,
        processed: false,
        duplicate: true,
        skipped: true,
      });
    }

    const claimResult = await claimPaymentProviderEventForReprocessing(
      supabase,
      "stripe",
      event.id,
    );

    if (!claimResult.claimed) {
      return NextResponse.json({
        received: true,
        processed: false,
        duplicate: true,
        skipped: true,
      });
    }

    const processResult = await processStripeWebhookEvent(supabase, event);
    return buildProcessResponse(processResult);
  }

  const processResult = await processStripeWebhookEvent(supabase, event);
  return buildProcessResponse(processResult);
}
