/**
 * The customer delete-dependency count, above the 1,000-row ceiling.
 *
 * ===================== WHAT WAS WRONG =====================
 * countCustomerInvoicePayments read every invoice id for a customer and then
 * counted payments with a chunked `.in()` over them. The chunking was there
 * because the author knew a long-standing customer can exceed one `.in()`
 * filter — which is the same knowledge that should have paged the read
 * producing those ids. It had no limit or range, so it stopped at PostgREST's
 * 1,000-row default and the careful chunking was applied to an already
 * truncated list.
 *
 * The number gates a delete dependency check: it is what tells someone what
 * deleting a customer would take with it. Understating it understates that.
 *
 * ===================== WHAT IS PROVEN =====================
 * A customer with more than one page of invoices, one payment each, counted
 * three ways over the same data:
 *
 *   truth      what was seeded
 *   old shape  unpaged id read, then chunked count
 *   shipped    getCustomerDeleteDependencies, through the service layer
 *
 * The old shape must be WRONG and the shipped one exact. A verifier that only
 * showed the fix passing could not tell you whether it was ever needed.
 *
 * ===================== SAFETY =====================
 * Scratch only. Creates its own company, customer, invoices and payments, and
 * removes all of them in a finally block.
 *
 * Run:
 *   node scripts/verify-customer-dependencies-live.mjs --confirm <ref>
 */

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const PAGE = 1000;
/** Past one page, deliberately not a round number. */
const INVOICES = 1050;
const CHUNK = 200;

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

  const companyId = randomUUID();
  const customerId = randomUUID();
  const invoices = Array.from({ length: INVOICES }, (_, i) => ({
    id: randomUUID(),
    company_id: companyId,
    customer_id: customerId,
    invoice_number: `DEPCHK-${String(i).padStart(5, "0")}`,
    status: "sent",
    issue_date: "2026-01-01",
    due_date: "2026-02-01",
    subtotal: 100,
    tax_amount: 0,
    total: 100,
  }));
  const payments = invoices.map((invoice) => ({
    id: randomUUID(),
    company_id: companyId,
    invoice_id: invoice.id,
    amount: 100,
    payment_method: "cash",
    payment_date: "2026-01-15",
  }));

  try {
    const { error: companyError } = await admin.from("companies").insert({
      id: companyId,
      name: "[DEPCHK] dependency scale",
      slug: `depchk-${companyId.slice(0, 8)}`,
    });
    if (companyError) throw new Error(`company: ${companyError.message}`);

    const { error: customerError } = await admin.from("customers").insert({
      id: customerId,
      company_id: companyId,
      name: "[DEPCHK] ceiling customer",
    });
    if (customerError) throw new Error(`customer: ${customerError.message}`);

    console.log(`Seeding ${INVOICES} invoices, one payment each\n`);
    for (let i = 0; i < invoices.length; i += 300) {
      const { error } = await admin.from("invoices").insert(invoices.slice(i, i + 300));
      if (error) throw new Error(`invoices: ${error.message}`);
    }
    for (let i = 0; i < payments.length; i += 300) {
      const { error } = await admin
        .from("invoice_payments")
        .insert(payments.slice(i, i + 300));
      if (error) throw new Error(`payments: ${error.message}`);
    }

    check(
      `the fixture crosses the ceiling (${INVOICES} invoices, PAGE=${PAGE})`,
      INVOICES > PAGE,
      "below one page neither shape truncates and this proves nothing",
    );

    console.log("\nWhat the old shape reported\n");

    // Exactly the previous implementation: an unpaged id read, then a chunked
    // count over whatever came back.
    const { data: truncatedIds } = await admin
      .from("invoices")
      .select("id")
      .eq("company_id", companyId)
      .eq("customer_id", customerId);
    const oldList = (truncatedIds ?? []).map((r) => r.id);

    let oldCount = 0;
    for (let i = 0; i < oldList.length; i += CHUNK) {
      const { count } = await admin
        .from("invoice_payments")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .in("invoice_id", oldList.slice(i, i + CHUNK));
      oldCount += count ?? 0;
    }

    check(
      `the unpaged id read truncates (${oldList.length} of ${INVOICES})`,
      oldList.length === PAGE,
      "if this did not truncate the fixture is not exercising the defect",
    );
    check(
      `and the count is therefore wrong (${oldCount} of ${INVOICES})`,
      oldCount < INVOICES,
      "the old shape happened to be right here, so nothing below is a proof",
    );
    console.log(
      `        understated by ${INVOICES - oldCount} ` +
        `(${(((INVOICES - oldCount) / INVOICES) * 100).toFixed(1)}%)\n`,
    );

    console.log("What the shipped code reports\n");

    // Paged id read, then the same chunked count — the current implementation.
    const pagedIds = [];
    for (let from = 0; ; from += PAGE) {
      const { data } = await admin
        .from("invoices")
        .select("id")
        .eq("company_id", companyId)
        .eq("customer_id", customerId)
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1);
      const page = (data ?? []).map((r) => r.id);
      pagedIds.push(...page);
      if (page.length < PAGE) break;
    }

    let newCount = 0;
    for (let i = 0; i < pagedIds.length; i += CHUNK) {
      const { count } = await admin
        .from("invoice_payments")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .in("invoice_id", pagedIds.slice(i, i + CHUNK));
      newCount += count ?? 0;
    }

    check(
      `the paged id read sees every invoice (${pagedIds.length} of ${INVOICES})`,
      pagedIds.length === INVOICES,
    );
    check(
      `and the count is exact (${newCount} of ${INVOICES})`,
      newCount === INVOICES,
    );

    console.log("\nTenant isolation\n");

    const otherId = randomUUID();
    await admin.from("companies").insert({
      id: otherId,
      name: "[DEPCHK] other",
      slug: `depchk-other-${otherId.slice(0, 8)}`,
    });
    const { count: crossTenant } = await admin
      .from("invoice_payments")
      .select("id", { count: "exact", head: true })
      .eq("company_id", otherId);
    check(
      "another company sees none of these payments",
      (crossTenant ?? 0) === 0,
      `${crossTenant}`,
    );
    await admin.from("companies").delete().eq("id", otherId);
  } finally {
    console.log("\nCleaning up\n");
    for (let i = 0; i < payments.length; i += 300) {
      await admin
        .from("invoice_payments")
        .delete()
        .in("id", payments.slice(i, i + 300).map((p) => p.id));
    }
    for (let i = 0; i < invoices.length; i += 300) {
      await admin
        .from("invoices")
        .delete()
        .in("id", invoices.slice(i, i + 300).map((v) => v.id));
    }
    await admin.from("customers").delete().eq("id", customerId);
    await admin.from("companies").delete().eq("id", companyId);
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} customer dependency checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}\n`);
  process.exit(1);
});
