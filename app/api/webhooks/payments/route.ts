import { NextResponse } from "next/server";
import { getStripeWebhookSecret } from "@/lib/payments/env";
import {
  insertPaymentProviderEvent,
  stripeEventPayload,
} from "@/lib/payments/insert-provider-event";
import { processStripeWebhookEvent } from "@/lib/payments/process-stripe-webhook-event";
import {
  StripeWebhookVerificationError,
  verifyStripeWebhookEvent,
} from "@/lib/payments/stripe-webhook";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

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
    return NextResponse.json({
      received: true,
      processed: false,
      duplicate: true,
    });
  }

  const processResult = await processStripeWebhookEvent(supabase, event);

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
