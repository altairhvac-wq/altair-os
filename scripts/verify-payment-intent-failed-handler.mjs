/**
 * Verifies payment_intent.payment_failed persistence helpers and (when DB is
 * available + migration 127 applied) that payment_attempts accepts failure columns.
 *
 * Run: node scripts/verify-payment-intent-failed-handler.mjs
 *
 * Does not require a real declined card. Full webhook E2E still needs Stripe
 * Dashboard/CLI delivery of payment_intent.payment_failed to /api/webhooks/payments.
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const ROOT = path.resolve(import.meta.dirname, "..");
const envPath = path.join(ROOT, ".env.local");

function loadEnv() {
  if (!fs.existsSync(envPath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        let value = line.slice(index + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        return [key, value];
      }),
  );
}

// --- Pure noise-rule / metadata checks (mirrors lib/payments/payment-intent-failure.ts) ---

const CHECKOUT_METADATA_PURPOSE = "invoice_payment";
const CHECKOUT_METADATA_PROVIDER = "stripe";
const CARD_FAILURE_ATTENTION_MIN_COUNT = 2;

function readPaymentIntentMetadata(metadata) {
  const meta = metadata ?? {};
  return {
    companyId: meta.company_id?.trim() || null,
    invoiceId: meta.invoice_id?.trim() || null,
    purpose: meta.purpose?.trim() || null,
    provider: meta.provider?.trim() || null,
    paymentAttemptId: meta.payment_attempt_id?.trim() || null,
  };
}

function isAltairInvoicePaymentIntentMetadata(metadata) {
  return (
    metadata.purpose === CHECKOUT_METADATA_PURPOSE &&
    metadata.provider === CHECKOUT_METADATA_PROVIDER
  );
}

function shouldPersistCardFailureForAttempt(status) {
  return status !== "completed";
}

function isCardFailureAttentionEligible(attempt) {
  if (attempt.completed_at != null || attempt.status === "completed") {
    return false;
  }

  if (attempt.card_failure_count >= CARD_FAILURE_ATTENTION_MIN_COUNT) {
    return true;
  }

  if (
    attempt.card_failure_count >= 1 &&
    (attempt.status === "expired" ||
      attempt.status === "invalidated" ||
      attempt.status === "failed")
  ) {
    return true;
  }

  return false;
}

function sanitizeCardFailureMessage(message) {
  if (!message || typeof message !== "string") return null;
  const trimmed = message.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 280);
}

function resolveCardFailureCode(details) {
  const decline = details.declineCode?.trim() || null;
  if (decline) return decline.slice(0, 120);
  const code = details.code?.trim() || null;
  if (code) return code.slice(0, 120);
  return null;
}

let failed = 0;

function pass(name, detail = "") {
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  failed += 1;
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function assert(name, condition, detail = "") {
  if (condition) pass(name, detail);
  else fail(name, detail);
}

console.log("\n=== payment_intent.payment_failed handler verification ===\n");

// Handler source contains the new branch
const handlerPath = path.join(
  ROOT,
  "lib/payments/process-stripe-webhook-event.ts",
);
const handlerSrc = fs.readFileSync(handlerPath, "utf8");
assert(
  "Handler switches on payment_intent.payment_failed",
  handlerSrc.includes('event.type === "payment_intent.payment_failed"'),
);
assert(
  "Handler calls recordPaymentAttemptCardFailure",
  handlerSrc.includes("recordPaymentAttemptCardFailure"),
);

const checkoutPath = path.join(ROOT, "lib/payments/stripe-checkout.ts");
const checkoutSrc = fs.readFileSync(checkoutPath, "utf8");
assert(
  "Checkout copies metadata onto payment_intent_data",
  checkoutSrc.includes("payment_intent_data") &&
    checkoutSrc.includes("metadata: checkoutMetadata"),
);

const migrationPath = path.join(
  ROOT,
  "supabase/migrations/127_payment_attempt_card_failures.sql",
);
assert(
  "Migration 127 exists",
  fs.existsSync(migrationPath),
);

// Metadata recognition
const altairMeta = readPaymentIntentMetadata({
  company_id: "co_1",
  invoice_id: "inv_1",
  purpose: "invoice_payment",
  provider: "stripe",
  payment_attempt_id: "pa_1",
});
assert(
  "Recognizes Altair invoice PaymentIntent metadata",
  isAltairInvoicePaymentIntentMetadata(altairMeta),
);
assert(
  "Ignores unrelated PaymentIntent metadata",
  !isAltairInvoicePaymentIntentMetadata(
    readPaymentIntentMetadata({ purpose: "other", provider: "stripe" }),
  ),
);

// Persistence gate
assert(
  "Persists failure on active attempt",
  shouldPersistCardFailureForAttempt("active"),
);
assert(
  "Skips persistence on completed attempt",
  !shouldPersistCardFailureForAttempt("completed"),
);

// Noise / attention rules
assert(
  "Single decline on active attempt is noise",
  !isCardFailureAttentionEligible({
    status: "active",
    card_failure_count: 1,
    completed_at: null,
  }),
);
assert(
  "Second decline on active attempt is attention-eligible",
  isCardFailureAttentionEligible({
    status: "active",
    card_failure_count: 2,
    completed_at: null,
  }),
);
assert(
  "One decline then abandoned/expired is attention-eligible",
  isCardFailureAttentionEligible({
    status: "expired",
    card_failure_count: 1,
    completed_at: null,
  }),
);
assert(
  "Decline then success is not attention",
  !isCardFailureAttentionEligible({
    status: "completed",
    card_failure_count: 3,
    completed_at: new Date().toISOString(),
  }),
);

assert(
  "Sanitizes / truncates failure message",
  sanitizeCardFailureMessage(`  ${"x".repeat(400)}  `)?.length === 280,
);
assert(
  "Prefers decline_code over code",
  resolveCardFailureCode({
    code: "card_declined",
    declineCode: "insufficient_funds",
    message: "nope",
  }) === "insufficient_funds",
);

// Optional DB persistence check
const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.log(
    "\n(skipping DB persistence check — missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local)\n",
  );
} else {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Probe columns via a no-op select; if migration missing, PostgREST errors.
  const probe = await admin
    .from("payment_attempts")
    .select(
      "id, card_failure_count, last_card_failure_at, last_card_failure_code, last_card_failure_message, stripe_payment_intent_id, status",
    )
    .limit(1);

  if (probe.error) {
    fail(
      "payment_attempts card-failure columns readable",
      `${probe.error.code ?? ""} ${probe.error.message} — apply migration 127`,
    );
  } else {
    pass("payment_attempts card-failure columns readable");

    // If we have any active-looking row we can dry-run an update+revert on a
    // disposable synthetic path only when company/invoice fixtures exist.
    // Prefer inserting a disposable attempt when we can find a company+invoice.
    const invoiceProbe = await admin
      .from("invoices")
      .select("id, company_id, balance_due")
      .gt("balance_due", 0)
      .limit(1)
      .maybeSingle();

    if (invoiceProbe.error || !invoiceProbe.data) {
      console.log(
        "(skipping write persistence — no invoice fixture available for disposable attempt)\n",
      );
    } else {
      const paymentIntentId = `pi_verify_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const insert = await admin
        .from("payment_attempts")
        .insert({
          company_id: invoiceProbe.data.company_id,
          invoice_id: invoiceProbe.data.id,
          status: "expired",
          amount: Number(invoiceProbe.data.balance_due) || 1,
          currency: "usd",
          provider: "stripe",
          stripe_payment_intent_id: paymentIntentId,
          expires_at: expiresAt,
          card_failure_count: 0,
        })
        .select(
          "id, card_failure_count, last_card_failure_code, last_card_failure_message, stripe_payment_intent_id, status",
        )
        .single();

      if (insert.error) {
        fail(
          "Insert disposable payment_attempt for failure write",
          insert.error.message,
        );
      } else {
        const attemptId = insert.data.id;
        const update = await admin
          .from("payment_attempts")
          .update({
            card_failure_count: 1,
            last_card_failure_at: new Date().toISOString(),
            last_card_failure_code: "insufficient_funds",
            last_card_failure_message: "Your card has insufficient funds.",
          })
          .eq("id", attemptId)
          .select(
            "id, card_failure_count, last_card_failure_code, last_card_failure_message, status",
          )
          .single();

        if (update.error) {
          fail("Persist card failure fields", update.error.message);
        } else {
          assert(
            "Persisted card_failure_count",
            update.data.card_failure_count === 1,
          );
          assert(
            "Persisted last_card_failure_code",
            update.data.last_card_failure_code === "insufficient_funds",
          );
          assert(
            "Attention rule: 1 failure + expired is eligible",
            isCardFailureAttentionEligible({
              status: update.data.status,
              card_failure_count: update.data.card_failure_count,
              completed_at: null,
            }),
          );
        }

        const cleanup = await admin
          .from("payment_attempts")
          .delete()
          .eq("id", attemptId);
        if (cleanup.error) {
          fail("Cleanup disposable payment_attempt", cleanup.error.message);
        } else {
          pass("Cleanup disposable payment_attempt");
        }
      }
    }
  }
}

console.log("");
if (failed > 0) {
  console.error(`Verification failed: ${failed} check(s)\n`);
  process.exit(1);
}

console.log("All verification checks passed.\n");
console.log(
  "Next (manual, needs Stripe Dashboard): subscribe payment_intent.payment_failed on the Connected-accounts webhook, then decline a test card (e.g. 4000 0000 0000 9995) on a connected Checkout session and confirm payment_attempts.card_failure_count increments and payment_provider_events marks the event processed.\n",
);
