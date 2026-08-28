/**
 * The security audit trail records the right things and stores nothing it shouldn't.
 *
 * ===================== WHAT HAD NO RECORD =====================
 * membership_activities already covers company-scoped membership and role
 * changes. Nothing at all covered what happens before a company context exists:
 * a sign-in succeeding or failing, a sign-up, a password reset being requested,
 * a password actually being changed, a request refused by the rate limiter, or
 * a public approval or checkout token being used.
 *
 * So there was no way to answer "was this account signed into from somewhere
 * unusual", or "how long had the brute force been running".
 *
 * ===================== WHAT THIS PROVES =====================
 *   - a recorded event is readable back with its outcome and reason
 *   - the address and the account are stored as HASHES: the raw values are
 *     searched for across the whole table and must not appear
 *   - the hash matches the rate limiter's, so the two records can be correlated
 *   - only the three declared outcomes are accepted
 *   - anon and authenticated cannot read the table, write an event, or sweep it
 *   - the retention sweep removes what it should and leaves the rest
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-security-audit-live.mjs --confirm <ref>
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const ANON_ENV = "ALTAIR_LOADTEST_ANON_KEY";

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
const anonKey = process.env[ANON_ENV]?.trim();
if (!url || !key || !anonKey) {
  fail(`${URL_ENV}, ${KEY_ENV} and ${ANON_ENV} must all be set.`);
}

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
const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const suffix = Math.random().toString(36).slice(2, 10);
const EMAIL = `audit-${suffix}@example.invalid`;
const ADDRESS = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
const TOKEN = `tok_audit_${suffix}`;

async function main() {
  console.log(`\nTarget project: ${ref}\n`);

  const { recordSecurityAuditEvent } = await import("@/lib/security/audit");
  const { hashAuditSubject } = await import(
    "@/lib/security/public-rate-limit"
  );

  const subjectHash = hashAuditSubject("subject", EMAIL);
  const addressHash = hashAuditSubject("address", ADDRESS);

  try {
    console.log("Events are recorded\n");

    await recordSecurityAuditEvent({
      event: "login.failed",
      outcome: "failed",
      subject: EMAIL,
      address: ADDRESS,
      reason: "invalid_credentials",
    });
    await recordSecurityAuditEvent({
      event: "login.rate_limited",
      outcome: "refused",
      subject: EMAIL,
      address: ADDRESS,
      reason: "rate_limited",
    });
    await recordSecurityAuditEvent({
      event: "public_estimate_approval.submitted",
      outcome: "succeeded",
      subject: TOKEN,
      address: ADDRESS,
    });

    const { data: mine, error: mineError } = await admin
      .from("security_audit_events")
      .select("event_type, outcome, reason, subject_hash, address_hash")
      .eq("address_hash", addressHash)
      .order("created_at", { ascending: true });
    if (mineError) throw new Error(mineError.message);

    check(
      "all three events were written",
      (mine ?? []).length === 3,
      `${(mine ?? []).length} rows`,
    );
    check(
      "the failure records its outcome and a bounded reason code",
      (mine ?? []).some(
        (row) =>
          row.event_type === "login.failed" &&
          row.outcome === "failed" &&
          row.reason === "invalid_credentials",
      ),
    );
    check(
      "the refusal is recorded as refused, not as a failure",
      (mine ?? []).some(
        (row) =>
          row.event_type === "login.rate_limited" && row.outcome === "refused",
      ),
      "a refused request and a wrong password are different facts",
    );

    console.log("\nNothing identifying is stored\n");

    const { data: all, error: allError } = await admin
      .from("security_audit_events")
      .select("*")
      .eq("address_hash", addressHash);
    if (allError) throw new Error(allError.message);
    const serialized = JSON.stringify(all ?? []);

    for (const [label, raw] of [
      ["the email address", EMAIL],
      ["the local part of the email", EMAIL.split("@")[0]],
      ["the address", ADDRESS],
      ["the token", TOKEN],
    ]) {
      check(
        `${label} does not appear anywhere in the row`,
        !serialized.includes(raw),
      );
    }

    check(
      "the account is stored as the expected hash",
      (all ?? []).some((row) => row.subject_hash === subjectHash),
    );
    check(
      "the audit hash matches the rate limiter's, so the two can be correlated",
      hashAuditSubject("address", ADDRESS) === addressHash &&
        /^[0-9a-f]{64}$/.test(addressHash),
      "if the two subsystems hashed differently, 'refused eleven times then " +
        "signed in' would not be a sentence anyone could write",
    );

    console.log("\nConstraints\n");

    const { error: badOutcome } = await admin.rpc(
      "record_security_audit_event",
      {
        p_event_type: "login.failed",
        p_outcome: "whatever",
        p_user_id: null,
        p_company_id: null,
        p_subject_hash: null,
        p_address_hash: null,
        p_reason: null,
        p_metadata: {},
      },
    );
    check(
      "an unknown outcome is rejected",
      badOutcome != null,
      "the three outcomes are the vocabulary; free text would make the trail " +
        "unqueryable",
    );

    console.log("\nPrivileges\n");

    const { data: anonRows } = await anon
      .from("security_audit_events")
      .select("event_type")
      .limit(1);
    check(
      "anon reads no rows",
      (anonRows ?? []).length === 0,
      "these rows are a list of who tried to get in and when",
    );

    const { error: anonWrite } = await anon.rpc("record_security_audit_event", {
      p_event_type: "login.succeeded",
      p_outcome: "succeeded",
      p_user_id: null,
      p_company_id: null,
      p_subject_hash: null,
      p_address_hash: null,
      p_reason: null,
      p_metadata: {},
    });
    check(
      "anon cannot write an event",
      anonWrite != null,
      "an attacker who can write events can bury their own",
    );

    const { error: anonSweep } = await anon.rpc("sweep_security_audit_events", {
      p_retain_days: 1,
    });
    check(
      "anon cannot sweep the trail",
      anonSweep != null,
      "sweeping is how an attacker would erase their own trail",
    );

    console.log("\nRetention\n");

    const { data: sweptRecent, error: sweepError } = await admin.rpc(
      "sweep_security_audit_events",
      { p_retain_days: 365 },
    );
    check(
      "a long retention removes nothing recent",
      sweepError == null && Number(sweptRecent) === 0,
      sweepError ? sweepError.message : `deleted ${sweptRecent}`,
    );

    const { error: zeroError } = await admin.rpc(
      "sweep_security_audit_events",
      { p_retain_days: 0 },
    );
    check(
      "a zero retention is rejected rather than deleting everything",
      zeroError != null,
    );
  } finally {
    await admin
      .from("security_audit_events")
      .delete()
      .eq("address_hash", addressHash);
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} security audit checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}\n`);
  process.exit(1);
});
