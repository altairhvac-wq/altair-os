/**
 * A webhook delivered twice is recorded once.
 *
 * ===================== WHY THIS EXISTS =====================
 * Stripe retries. It retries on a timeout, on a 500, on a deploy that dropped a
 * connection mid-response, and it retries an event it has already delivered
 * successfully if the acknowledgement was lost. So every handler has to be
 * written as if the same event arrives more than once — and here they are:
 * both webhook routes claim an event by inserting a row keyed on Stripe's
 * event id, and treat a 23505 as "someone already has this one".
 *
 * That was implemented and never verified. No script in this repository
 * mentioned provider_event_id. The behaviour rests on a UNIQUE constraint
 * existing in the database with exactly the right columns, and on the error
 * code the client reports for it — neither of which is visible in the handler.
 * A constraint dropped, renamed, or created on the wrong column pair would
 * leave both handlers silently recording every retry as a fresh event: for
 * payments, that is a duplicate payment against an invoice.
 *
 * It needs no Stripe credentials. Stripe's role in a duplicate delivery is to
 * send the same event id twice, which a test can do directly. What it drives is
 * the SHIPPED helpers — insertPaymentProviderEvent and
 * insertSubscriptionEventLedger — not a reimplementation of them, so the thing
 * asserted is the thing that runs in production.
 *
 * ===================== WHAT IT DOES NOT COVER =====================
 * Not the signature check, not a real checkout, not the processing that follows
 * a successful claim. Those need a Stripe test account with keys; this covers
 * the half that does not, which is the half where a silent regression is
 * possible.
 *
 * ===================== SAFETY =====================
 * Scratch only, refuses the application's own project, and every row it writes
 * carries a `wh-idem-drill-` event id removed in a finally block.
 *
 * Run:
 *   node --experimental-strip-types --import ./scripts/lib/ts-alias-loader-register.mjs \
 *     scripts/verify-webhook-idempotency-live.mjs --confirm <ref>
 */

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { insertPaymentProviderEvent } from "@/lib/payments/insert-provider-event";
import { insertSubscriptionEventLedger } from "@/lib/saas-billing/webhook";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const DRILL_PREFIX = "wh-idem-drill-";

let failures = 0;
let checks = 0;

function check(name, condition, detail = "") {
  checks += 1;
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    if (!t.startsWith("--")) continue;
    const key = t.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else args[key] = true;
  }
  return args;
}

function fail(message) {
  console.error(`\nREFUSED: ${message}\n`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
const url = process.env[URL_ENV]?.trim();
const key = process.env[KEY_ENV]?.trim();
if (!url || !key) fail(`${URL_ENV} and ${KEY_ENV} must be set.`);

let ref;
try {
  ref = new URL(url).host.split(".")[0];
} catch {
  fail(`${URL_ENV} is not a valid URL.`);
}
if (existsSync(".env.local")) {
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith("NEXT_PUBLIC_SUPABASE_URL="));
  const appUrl = line
    ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")
    : null;
  if (appUrl === url) fail("Target is the application's own project. Use scratch.");
}
if (args.confirm !== ref) {
  fail(`--confirm must match the target project ref "${ref}".`);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log(`\nTarget project: ${ref}\n`);

  const suffix = randomUUID().slice(0, 8);
  const paymentEventId = `evt_${DRILL_PREFIX}pay_${suffix}`;
  const billingEventId = `evt_${DRILL_PREFIX}bill_${suffix}`;

  try {
    console.log("The constraint the handlers depend on\n");

    // Both helpers return `duplicate: true` on a 23505 and nothing else. If the
    // constraint is on the wrong columns the insert succeeds, no 23505 is
    // raised, and every retry becomes a new event — so the shape of the
    // constraint is part of the behaviour, not an implementation detail.
    for (const [table, expected] of [
      ["payment_provider_events", "UNIQUE (provider, provider_event_id)"],
      ["subscription_event_ledger", "UNIQUE (provider, provider_event_id)"],
    ]) {
      const { error } = await admin.from(table).select("provider_event_id").limit(0);
      check(`${table.padEnd(26)} exists and exposes provider_event_id`, error == null,
        error?.message ?? "");
      // Recorded rather than probed from the catalog: PostgREST cannot read
      // pg_constraint, and the behavioural assertions below prove the effect.
      console.log(`        expects ${expected}`);
    }

    console.log("\nA payment webhook delivered twice\n");

    const payload = { id: paymentEventId, type: "checkout.session.completed" };

    const first = await insertPaymentProviderEvent(admin, {
      company_id: null,
      provider: "stripe",
      provider_event_id: paymentEventId,
      event_type: "checkout.session.completed",
      processing_status: "received",
      payload,
    });
    check(
      "the first delivery is claimed",
      first.ok === true && first.duplicate === false,
      JSON.stringify(first),
    );

    const second = await insertPaymentProviderEvent(admin, {
      company_id: null,
      provider: "stripe",
      provider_event_id: paymentEventId,
      event_type: "checkout.session.completed",
      processing_status: "received",
      payload,
    });
    check(
      "the second is reported as a duplicate, not an error",
      second.ok === true && second.duplicate === true,
      `got ${JSON.stringify(second)} — ok:false would make the route answer 500 ` +
        `and Stripe would retry forever; duplicate:false would record the ` +
        `retry as a fresh event and pay the invoice twice`,
    );

    const { count } = await admin
      .from("payment_provider_events")
      .select("id", { count: "exact", head: true })
      .eq("provider_event_id", paymentEventId);
    check(
      "exactly one row exists for that event id",
      count === 1,
      `found ${count}`,
    );

    // A different event id must still be claimable: a constraint on the wrong
    // column could make EVERY insert look like a duplicate, which reads as
    // working idempotency and silently drops real events.
    const otherId = `evt_${DRILL_PREFIX}pay_${suffix}_other`;
    const other = await insertPaymentProviderEvent(admin, {
      company_id: null,
      provider: "stripe",
      provider_event_id: otherId,
      event_type: "checkout.session.completed",
      processing_status: "received",
      payload: { id: otherId, type: "checkout.session.completed" },
    });
    check(
      "a different event id is still claimed, not swallowed",
      other.ok === true && other.duplicate === false,
      "an over-broad constraint would drop real events while looking idempotent",
    );

    console.log("\nA billing webhook delivered twice\n");

    const billingPayload = { id: billingEventId, type: "customer.subscription.updated" };

    const firstBilling = await insertSubscriptionEventLedger(admin, {
      provider_event_id: billingEventId,
      event_type: "customer.subscription.updated",
      payload: billingPayload,
    });
    check(
      "the first delivery is claimed",
      firstBilling.ok === true && firstBilling.duplicate === false,
      JSON.stringify(firstBilling),
    );

    const secondBilling = await insertSubscriptionEventLedger(admin, {
      provider_event_id: billingEventId,
      event_type: "customer.subscription.updated",
      payload: billingPayload,
    });
    check(
      "the second is reported as a duplicate",
      secondBilling.ok === true && secondBilling.duplicate === true,
      `got ${JSON.stringify(secondBilling)} — a re-delivered subscription event ` +
        `recorded twice can move a company's access state backwards`,
    );

    const { count: billingCount } = await admin
      .from("subscription_event_ledger")
      .select("id", { count: "exact", head: true })
      .eq("provider_event_id", billingEventId);
    check(
      "exactly one row exists for that event id",
      billingCount === 1,
      `found ${billingCount}`,
    );

    console.log("\nThe two ledgers are independent\n");

    // Same event id in both tables must be fine: they are separate Stripe
    // accounts' event streams as far as this application is concerned, and a
    // shared constraint would make a billing event suppress a payment one.
    const shared = `evt_${DRILL_PREFIX}shared_${suffix}`;
    const inPayments = await insertPaymentProviderEvent(admin, {
      company_id: null,
      provider: "stripe",
      provider_event_id: shared,
      event_type: "checkout.session.completed",
      processing_status: "received",
      payload: { id: shared },
    });
    const inBilling = await insertSubscriptionEventLedger(admin, {
      provider_event_id: shared,
      event_type: "customer.subscription.updated",
      payload: { id: shared },
    });
    check(
      "one event id can be claimed in each ledger",
      inPayments.duplicate === false && inBilling.duplicate === false,
      "the ledgers must not share an idempotency namespace",
    );
  } finally {
    await admin
      .from("payment_provider_events")
      .delete()
      .like("provider_event_id", `%${DRILL_PREFIX}%`);
    await admin
      .from("subscription_event_ledger")
      .delete()
      .like("provider_event_id", `%${DRILL_PREFIX}%`);
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} webhook idempotency checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}\n`);
  process.exit(1);
});
