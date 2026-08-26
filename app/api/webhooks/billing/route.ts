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
import {
  createRequestId,
  requestIdFromHeaders,
  runOperation,
} from "@/lib/operations";
import {
  captureMonitoredEvent,
  captureMonitoredException,
  flushMonitoring,
} from "@/lib/operations/monitoring";

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
async function handleWebhook(request: Request): Promise<Response> {
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

/**
 * ==================== WHY THE HANDLER IS WRAPPED ====================
 * This route is where money becomes a record. Before this wrapper the only
 * trace of a failure was `console.error` into a log stream nothing watched: a
 * webhook that started returning 500 would be retried by Stripe for days and
 * then abandoned, with no one told.
 *
 * `runOperation` gives it the same treatment the cron routes already had —
 * request correlation, structured start/finish logging, retry classification,
 * and the metrics hooks that lib/operations/monitoring.ts now bridges to the
 * error monitor.
 *
 * ==================== RESPONSE SEMANTICS ARE UNCHANGED ====================
 * Stripe's redelivery behaviour is driven entirely by the status code, so this
 * wrapper must never alter one. `throwOnFailure: false` keeps the operation
 * from rethrowing, the handler's own responses pass through untouched, and an
 * unexpected throw produces the same 500 Next would have produced on its own —
 * which is the correct answer, because an unhandled exception here means we do
 * not know whether the payment was recorded and Stripe must try again.
 *
 * A deliberate 5xx is reported too. It is not an exception, but it is the
 * signal that this endpoint is failing to keep up with reality.
 */
export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFromHeaders(request.headers) ?? createRequestId();

  const opResult = await runOperation<Response>({
    operationName: "webhook.stripe_billing.process",
    context: { requestId, route: "/api/webhooks/billing" },
    throwOnFailure: false,
    callback: async () => {
      const response = await handleWebhook(request);

      if (response.status >= 500) {
        // Reported through the same seam as a thrown error so one alert rule
        // covers both. Deliberate 5xx means "Stripe, try again" — repeated,
        // it means the money path is stuck.
        captureMonitoredEvent({
          event: "billing.webhook_server_error",
          level: "error",
          requestId,
          route: "/api/webhooks/billing",
          meta: { status: response.status },
        });
      }

      return response;
    },
  });

  if (opResult.success && opResult.value) {
    await flushMonitoring();
    return opResult.value;
  }

  captureMonitoredException(new Error(opResult.error?.message ?? "unknown"), {
    event: "billing.webhook_unhandled_exception",
    requestId,
    route: "/api/webhooks/billing",
    meta: { retryable: opResult.retryable },
  });
  await flushMonitoring();

  return NextResponse.json(
    { received: true, processed: false, error: "Webhook processing failed" },
    { status: 500 },
  );
}
