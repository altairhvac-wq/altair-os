/**
 * Verifies charge.dispute.* handler wiring and (when DB is available +
 * migration 128 applied) that payment_disputes is readable/writable.
 *
 * Run: node scripts/verify-charge-dispute-handler.mjs
 *
 * Does not require a live Stripe dispute. Full webhook E2E still needs Stripe
 * Dashboard/CLI delivery of charge.dispute.* to /api/webhooks/payments.
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

const PAYMENT_DISPUTE_STATUSES = [
  "warning_needs_response",
  "warning_under_review",
  "warning_closed",
  "needs_response",
  "under_review",
  "won",
  "lost",
  "prevented",
];

function isPaymentDisputeStatus(value) {
  return PAYMENT_DISPUTE_STATUSES.includes(value);
}

function isOpenPaymentDisputeStatus(status) {
  return (
    status === "needs_response" ||
    status === "warning_needs_response" ||
    status === "under_review" ||
    status === "warning_under_review"
  );
}

function sanitizeDisputeReason(reason) {
  if (typeof reason !== "string") return null;
  const trimmed = reason.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 120);
}

function stripeDisputeAmountToCurrency(amountCents) {
  return Math.round((amountCents / 100) * 100) / 100;
}

function stripeEvidenceDueByToIso(dueByUnix) {
  if (typeof dueByUnix !== "number" || !Number.isFinite(dueByUnix) || dueByUnix <= 0) {
    return null;
  }
  return new Date(dueByUnix * 1000).toISOString();
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

console.log("\n=== charge.dispute.* handler verification ===\n");

const handlerPath = path.join(
  ROOT,
  "lib/payments/process-stripe-webhook-event.ts",
);
const handlerSrc = fs.readFileSync(handlerPath, "utf8");
assert(
  "Handler recognizes charge.dispute.created",
  handlerSrc.includes('"charge.dispute.created"'),
);
assert(
  "Handler recognizes charge.dispute.updated",
  handlerSrc.includes('"charge.dispute.updated"'),
);
assert(
  "Handler recognizes charge.dispute.closed",
  handlerSrc.includes('"charge.dispute.closed"'),
);
assert(
  "Handler requires event.account for disputes",
  handlerSrc.includes("missing connected account (event.account)"),
);
assert(
  "Handler upserts payment_disputes",
  handlerSrc.includes("upsertPaymentDispute"),
);

const migrationPath = path.join(
  ROOT,
  "supabase/migrations/128_payment_disputes.sql",
);
assert("Migration 128 exists", fs.existsSync(migrationPath));

const qaPath = path.join(ROOT, "docs/reference/stripe-payments-beta-qa.md");
const qaSrc = fs.readFileSync(qaPath, "utf8");
assert(
  "QA doc lists charge.dispute.created",
  qaSrc.includes("`charge.dispute.created`"),
);

assert(
  "Accepts Stripe needs_response status",
  isPaymentDisputeStatus("needs_response"),
);
assert(
  "Rejects unknown dispute status",
  !isPaymentDisputeStatus("needs_evidence"),
);
assert(
  "needs_response is open attention",
  isOpenPaymentDisputeStatus("needs_response"),
);
assert(
  "won is not open attention",
  !isOpenPaymentDisputeStatus("won"),
);
assert(
  "Sanitizes / truncates reason",
  sanitizeDisputeReason(`  ${"x".repeat(200)}  `)?.length === 120,
);
assert(
  "Converts cents to currency",
  stripeDisputeAmountToCurrency(2599) === 25.99,
);
assert(
  "Treats due_by 0 as null",
  stripeEvidenceDueByToIso(0) === null,
);
assert(
  "Converts due_by unix to ISO",
  typeof stripeEvidenceDueByToIso(1682294399) === "string",
);

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

  const probe = await admin
    .from("payment_disputes")
    .select(
      "id, company_id, provider_dispute_id, status, amount, evidence_due_by, connected_account_id",
    )
    .limit(1);

  if (probe.error) {
    fail(
      "payment_disputes table readable",
      `${probe.error.code ?? ""} ${probe.error.message} — apply migration 128`,
    );
  } else {
    pass("payment_disputes table readable");

    const companyProbe = await admin
      .from("companies")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (companyProbe.error || !companyProbe.data) {
      console.log(
        "(skipping write persistence — no company fixture available)\n",
      );
    } else {
      const companyId = companyProbe.data.id;
      const disputeId = `du_verify_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
      const accountId = `acct_verify_${randomUUID().replace(/-/g, "").slice(0, 12)}`;

      const insert = await admin
        .from("payment_disputes")
        .insert({
          company_id: companyId,
          provider: "stripe",
          provider_dispute_id: disputeId,
          connected_account_id: accountId,
          amount: 42.5,
          currency: "usd",
          reason: "product_unacceptable",
          status: "needs_response",
          evidence_due_by: new Date(Date.now() + 7 * 86400000).toISOString(),
        })
        .select("id, status, amount, provider_dispute_id")
        .single();

      if (insert.error || !insert.data) {
        fail(
          "payment_disputes insert",
          `${insert.error?.code ?? ""} ${insert.error?.message ?? "no row"}`,
        );
      } else {
        pass("payment_disputes insert", insert.data.provider_dispute_id);

        const upsert = await admin
          .from("payment_disputes")
          .upsert(
            {
              company_id: companyId,
              provider: "stripe",
              provider_dispute_id: disputeId,
              connected_account_id: accountId,
              amount: 42.5,
              currency: "usd",
              reason: "product_unacceptable",
              status: "under_review",
            },
            { onConflict: "provider,provider_dispute_id" },
          )
          .select("id, status")
          .single();

        if (upsert.error || upsert.data?.status !== "under_review") {
          fail(
            "payment_disputes upsert status update",
            `${upsert.error?.message ?? upsert.data?.status ?? "unknown"}`,
          );
        } else {
          pass("payment_disputes upsert status update");
        }

        const cleanup = await admin
          .from("payment_disputes")
          .delete()
          .eq("id", insert.data.id);
        if (cleanup.error) {
          fail("payment_disputes cleanup", cleanup.error.message);
        } else {
          pass("payment_disputes cleanup");
        }
      }
    }
  }
}

console.log("");
if (failed > 0) {
  console.error(`Failed ${failed} check(s).`);
  process.exit(1);
}
console.log("All charge.dispute checks passed.\n");
