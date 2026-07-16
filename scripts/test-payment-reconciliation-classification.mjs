/**
 * Stale Stripe capture reconciliation — webhook classification logic test
 * (CRITICAL #3, migration 113).
 *
 * This mirrors the pure decision logic in
 * lib/payments/process-stripe-webhook-event.ts and lib/payments/recording.ts so the
 * financial safety invariant can be checked without a live Supabase/Stripe environment:
 *
 *   Every conclusively paid Checkout Session must resolve to exactly one of:
 *     - a normal invoice payment,
 *     - a durable payment_reconciliations "requires_review" record, or
 *     - a thrown error (HTTP 500, Stripe retries).
 *   It must never again resolve to a silently "ignored" provider event.
 *
 * Run: node scripts/test-payment-reconciliation-classification.mjs
 */

const results = [];
let failed = 0;

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`\u2713 ${name}${detail ? ` \u2014 ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  failed += 1;
  console.error(`\u2717 ${name}${detail ? ` \u2014 ${detail}` : ""}`);
}

function assertEqual(name, actual, expected) {
  const detail = `got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`;
  if (actual === expected) pass(name, detail);
  else fail(name, detail);
}

// --- Mirrors isSupportedPaidCheckout in process-stripe-webhook-event.ts ---

function isSupportedPaidCheckout(session) {
  return (
    session.payment_status === "paid" &&
    typeof session.amount_total === "number" &&
    session.amount_total > 0 &&
    (session.currency ?? "").toLowerCase() === "usd"
  );
}

// --- Mirrors classifyRecordInvoicePaymentRpcReconciliationReason in recording.ts ---

const RECORD_INVOICE_PAYMENT_RPC_EXCEPTION_CODES = [
  "insufficient_permission",
  "invoice_not_found",
  "invoice_not_payable",
  "payment_amount_invalid",
  "payment_exceeds_balance",
  "invoice_concurrency_conflict",
  "duplicate_payment_idempotency_key",
];

const RECONCILIATION_ELIGIBLE_RPC_EXCEPTION_REASONS = {
  invoice_not_payable: "invoice_not_payable",
  payment_exceeds_balance: "balance_conflict",
};

function extractRecordInvoicePaymentRpcExceptionCode(message) {
  const trimmed = (message ?? "").trim();
  for (const code of RECORD_INVOICE_PAYMENT_RPC_EXCEPTION_CODES) {
    if (trimmed === code || trimmed.includes(code)) return code;
  }
  return null;
}

function classifyRecordInvoicePaymentRpcReconciliationReason(message) {
  const exceptionCode = extractRecordInvoicePaymentRpcExceptionCode(message);
  if (!exceptionCode) return null;
  return RECONCILIATION_ELIGIBLE_RPC_EXCEPTION_REASONS[exceptionCode] ?? null;
}

// --- Mirrors the end-to-end disposition decision in processCheckoutSessionCompletedEvent ---
//
// Returns one of: "ignore" | "reconcile:<reason>" | "record_normally" | "throw:<reason>"

function classifyCheckoutSessionDisposition({
  metadataOk,
  session,
  connectedAccountId,
  attempt,
  attemptMetadataMatches,
  existingPaymentFound,
  accountReady,
  invoice,
  invoiceBalanceConsistent,
  amountMatchesInvoiceBalance,
  rpcError,
}) {
  if (!metadataOk) return "ignore:metadata";

  if (!isSupportedPaidCheckout(session)) return "ignore:not_paid";

  if (!connectedAccountId) return "throw:missing_connected_account";

  if (!attempt) return "throw:missing_attempt";

  if (!attemptMetadataMatches) return "throw:attempt_metadata_mismatch";

  if (attempt.status !== "active" && attempt.status !== "completed") {
    return "reconcile:attempt_invalidated";
  }

  if (existingPaymentFound) return "record_normally:idempotent_existing";

  if (!accountReady) return "throw:account_not_ready";

  if (!invoice) return "throw:missing_invoice";

  if (!invoice.isPayable || invoice.balanceDue <= 0) {
    return "reconcile:invoice_not_payable";
  }

  if (!invoiceBalanceConsistent) return "throw:balance_inconsistent";

  if (!amountMatchesInvoiceBalance) return "reconcile:amount_mismatch";

  if (rpcError) {
    if (rpcError.duplicate) return "record_normally:idempotent_rpc_duplicate";

    const reason = classifyRecordInvoicePaymentRpcReconciliationReason(rpcError.message);
    if (reason) return `reconcile:${reason}`;

    return "throw:unclassified_rpc_error";
  }

  return "record_normally:new_payment";
}

const PAID_SESSION = { payment_status: "paid", amount_total: 10000, currency: "usd" };
const UNPAID_SESSION = { payment_status: "unpaid", amount_total: 10000, currency: "usd" };
const ZERO_AMOUNT_SESSION = { payment_status: "paid", amount_total: 0, currency: "usd" };
const NON_USD_SESSION = { payment_status: "paid", amount_total: 10000, currency: "eur" };

const ACTIVE_ATTEMPT = { id: "attempt-1", status: "active" };
const COMPLETED_ATTEMPT = { id: "attempt-1", status: "completed" };
const INVALIDATED_ATTEMPT = { id: "attempt-1", status: "invalidated" };
const EXPIRED_ATTEMPT = { id: "attempt-1", status: "expired" };
const FAILED_ATTEMPT = { id: "attempt-1", status: "failed" };

const PAYABLE_INVOICE = { isPayable: true, balanceDue: 100 };
const VOID_INVOICE = { isPayable: false, balanceDue: 0 };
const ZERO_BALANCE_INVOICE = { isPayable: true, balanceDue: 0 };

const BASE = {
  metadataOk: true,
  session: PAID_SESSION,
  connectedAccountId: "acct_123",
  attempt: ACTIVE_ATTEMPT,
  attemptMetadataMatches: true,
  existingPaymentFound: false,
  accountReady: true,
  invoice: PAYABLE_INVOICE,
  invoiceBalanceConsistent: true,
  amountMatchesInvoiceBalance: true,
  rpcError: null,
};

console.log("--- Scenario A: normal active attempt, matching amount ---");
assertEqual(
  "Scenario A resolves to a normal payment",
  classifyCheckoutSessionDisposition(BASE),
  "record_normally:new_payment",
);

console.log("\n--- Scenario B: manual partial payment invalidates the attempt before Stripe completes it ---");
assertEqual(
  "Invalidated attempt reconciles instead of being ignored",
  classifyCheckoutSessionDisposition({ ...BASE, attempt: INVALIDATED_ATTEMPT }),
  "reconcile:attempt_invalidated",
);

console.log("\n--- Scenario C: invoice voided after the Session opens (also invalidates the attempt) ---");
assertEqual(
  "Voided invoice + invalidated attempt reconciles",
  classifyCheckoutSessionDisposition({
    ...BASE,
    attempt: INVALIDATED_ATTEMPT,
    invoice: VOID_INVOICE,
  }),
  "reconcile:attempt_invalidated",
);

console.log("\n--- Expired/failed attempts reconcile the same way as invalidated ---");
assertEqual(
  "Expired attempt reconciles",
  classifyCheckoutSessionDisposition({ ...BASE, attempt: EXPIRED_ATTEMPT }),
  "reconcile:attempt_invalidated",
);
assertEqual(
  "Failed attempt reconciles",
  classifyCheckoutSessionDisposition({ ...BASE, attempt: FAILED_ATTEMPT }),
  "reconcile:attempt_invalidated",
);

console.log("\n--- A still-active attempt whose invoice is void/unpayable reconciles instead of recording ---");
assertEqual(
  "Active attempt + non-payable invoice reconciles",
  classifyCheckoutSessionDisposition({ ...BASE, invoice: VOID_INVOICE }),
  "reconcile:invoice_not_payable",
);
assertEqual(
  "Active attempt + zero balance invoice reconciles",
  classifyCheckoutSessionDisposition({ ...BASE, invoice: ZERO_BALANCE_INVOICE }),
  "reconcile:invoice_not_payable",
);

console.log("\n--- An edit that shrinks the invoice balance without invalidating causes an amount mismatch ---");
assertEqual(
  "Amount mismatch reconciles",
  classifyCheckoutSessionDisposition({ ...BASE, amountMatchesInvoiceBalance: false }),
  "reconcile:amount_mismatch",
);

console.log("\n--- Scenario G/I: RPC-level stale-state conflicts reconcile; everything else throws ---");
assertEqual(
  "RPC invoice_not_payable reconciles as balance_conflict-class invoice_not_payable",
  classifyCheckoutSessionDisposition({
    ...BASE,
    rpcError: { message: "invoice_not_payable", duplicate: false },
  }),
  "reconcile:invoice_not_payable",
);
assertEqual(
  "RPC payment_exceeds_balance reconciles as balance_conflict",
  classifyCheckoutSessionDisposition({
    ...BASE,
    rpcError: { message: "payment_exceeds_balance", duplicate: false },
  }),
  "reconcile:balance_conflict",
);
assertEqual(
  "RPC duplicate_payment_idempotency_key is treated as idempotent success, not reconciliation",
  classifyCheckoutSessionDisposition({
    ...BASE,
    rpcError: { message: "duplicate_payment_idempotency_key", duplicate: true },
  }),
  "record_normally:idempotent_rpc_duplicate",
);
for (const unknownReason of [
  "insufficient_permission",
  "invoice_not_found",
  "payment_amount_invalid",
  "invoice_concurrency_conflict",
  "some_unclassified_programming_error",
]) {
  assertEqual(
    `RPC "${unknownReason}" is NOT reconciliation-eligible (must throw for HTTP 500)`,
    classifyCheckoutSessionDisposition({
      ...BASE,
      rpcError: { message: unknownReason, duplicate: false },
    }),
    "throw:unclassified_rpc_error",
  );
}

console.log("\n--- Scenario H: duplicate webhook delivery for an already-recorded payment is idempotent, not reconciled ---");
assertEqual(
  "Existing payment short-circuits to idempotent success even if the invoice is now non-payable (e.g. now fully paid)",
  classifyCheckoutSessionDisposition({
    ...BASE,
    existingPaymentFound: true,
    invoice: ZERO_BALANCE_INVOICE,
  }),
  "record_normally:idempotent_existing",
);

console.log("\n--- Scenario I: missing authoritative records must throw, never silently ignore or reconcile ---");
assertEqual(
  "Missing connected account throws",
  classifyCheckoutSessionDisposition({ ...BASE, connectedAccountId: null }),
  "throw:missing_connected_account",
);
assertEqual(
  "Missing payment attempt for a paid session throws",
  classifyCheckoutSessionDisposition({ ...BASE, attempt: null }),
  "throw:missing_attempt",
);
assertEqual(
  "Attempt/metadata company or invoice mismatch throws",
  classifyCheckoutSessionDisposition({ ...BASE, attemptMetadataMatches: false }),
  "throw:attempt_metadata_mismatch",
);
assertEqual(
  "Stripe account not ready for a captured session throws",
  classifyCheckoutSessionDisposition({ ...BASE, accountReady: false }),
  "throw:account_not_ready",
);
assertEqual(
  "Missing invoice record throws",
  classifyCheckoutSessionDisposition({ ...BASE, invoice: null }),
  "throw:missing_invoice",
);
assertEqual(
  "Inconsistent invoice balance throws (data integrity bug, not a business conflict)",
  classifyCheckoutSessionDisposition({ ...BASE, invoiceBalanceConsistent: false }),
  "throw:balance_inconsistent",
);

console.log("\n--- Non-captures are still safely ignored (never reconciled, never throw) ---");
assertEqual(
  "Missing/invalid checkout metadata is ignored",
  classifyCheckoutSessionDisposition({ ...BASE, metadataOk: false }),
  "ignore:metadata",
);
assertEqual(
  "Unpaid session is ignored",
  classifyCheckoutSessionDisposition({ ...BASE, session: UNPAID_SESSION }),
  "ignore:not_paid",
);
assertEqual(
  "Zero/invalid amount session is ignored",
  classifyCheckoutSessionDisposition({ ...BASE, session: ZERO_AMOUNT_SESSION }),
  "ignore:not_paid",
);
assertEqual(
  "Non-USD session is ignored",
  classifyCheckoutSessionDisposition({ ...BASE, session: NON_USD_SESSION }),
  "ignore:not_paid",
);

console.log("\n--- A completed attempt (already recorded once) still proceeds to the idempotency check, not reconciliation ---");
assertEqual(
  "Completed attempt + existing payment resolves idempotently",
  classifyCheckoutSessionDisposition({
    ...BASE,
    attempt: COMPLETED_ATTEMPT,
    existingPaymentFound: true,
  }),
  "record_normally:idempotent_existing",
);

console.log(`\n${results.length - failed}/${results.length} checks passed.`);

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\nAll payment reconciliation classification checks passed.");
}
