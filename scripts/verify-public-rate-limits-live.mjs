/**
 * Unauthenticated surfaces are rate limited, durably and atomically.
 *
 * ===================== WHAT WAS UNPROTECTED =====================
 * Login, signup, password reset, password update, public estimate approval and
 * public invoice checkout could all be called without limit. Two of those
 * WRITE on the strength of a token in a URL: approval records a signature and
 * converts an estimate into a job, and checkout creates a Stripe session.
 *
 * ===================== WHAT THIS PROVES =====================
 *   - the counter is in Postgres, not memory: a limit reached by one caller is
 *     already reached for the next, which is the property an in-memory limiter
 *     cannot have on a serverless runtime
 *   - it is atomic: fifty concurrent calls against one bucket produce exactly
 *     fifty increments, no lost updates
 *   - refused requests still count, so sustained abuse extends its own lockout
 *   - the window expires and the counter restarts
 *   - dimensions are independent, and a value used as two different kinds of
 *     subject does not collide into one bucket
 *   - NO RAW IDENTIFIER IS STORED. The table is searched for the actual email,
 *     address and token used, and must not contain any of them
 *   - anon and authenticated cannot reach the function or the table at all
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-public-rate-limits-live.mjs --confirm <ref>
 */

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
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
const SCOPE = `verify.${suffix}`;

// Real-shaped identifiers, so the "nothing raw is stored" check is meaningful.
const EMAIL = `rate-limit-${suffix}@example.invalid`;
const ADDRESS = `203.0.113.${(Math.floor(Math.random() * 200) + 1)}`;
const TOKEN = `tok_${suffix}_${Math.random().toString(36).slice(2)}`;

async function hit(dimension, subjectHash, windowSeconds, limit) {
  const { data, error } = await admin.rpc("check_public_request_rate_limit", {
    p_scope: SCOPE,
    p_dimension: dimension,
    p_subject_hash: subjectHash,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });
  if (error) throw new Error(`rpc: ${error.message}`);
  return data;
}

async function main() {
  console.log(`\nTarget project: ${ref}`);
  console.log(`Scope:          ${SCOPE}\n`);

  const { enforcePublicRateLimit, PUBLIC_RATE_LIMITS, FAIL_CLOSED_SCOPES, rateLimitMessage } =
    await import("@/lib/security/public-rate-limit");

  try {
    console.log("Every unauthenticated surface has a rule\n");
    for (const scope of [
      "auth.login",
      "auth.signup",
      "auth.password_reset_request",
      "auth.password_update",
      "auth.invite_accept",
      "public.estimate_approval",
      "public.invoice_checkout",
      "public.token_view",
    ]) {
      const rules = PUBLIC_RATE_LIMITS[scope] ?? [];
      check(
        `${scope} has at least one rule`,
        rules.length > 0 &&
          rules.every((rule) => rule.limit >= 1 && rule.windowSeconds >= 1),
        JSON.stringify(rules),
      );
    }
    check(
      "the surfaces that WRITE are limited on the token, not only the address",
      ["public.estimate_approval", "public.invoice_checkout"].every((scope) =>
        (PUBLIC_RATE_LIMITS[scope] ?? []).some(
          (rule) => rule.dimension === "token",
        ),
      ),
      "an address-only limit lets one client work through many tokens from " +
        "many addresses",
    );

    console.log("\nThe counter is durable and atomic\n");

    const bucket = `hash-${suffix}-atomic`;
    const CONCURRENT = 50;
    const results = await Promise.all(
      Array.from({ length: CONCURRENT }, () => hit("ip", bucket, 300, 10)),
    );
    const counts = results.map((r) => Number(r.count)).sort((a, b) => a - b);
    check(
      `${CONCURRENT} concurrent calls produce exactly ${CONCURRENT} distinct increments`,
      new Set(counts).size === CONCURRENT &&
        counts[0] === 1 &&
        counts[CONCURRENT - 1] === CONCURRENT,
      `first ${counts[0]}, last ${counts[CONCURRENT - 1]}, distinct ${new Set(counts).size}`,
    );
    check(
      "everything past the limit was refused",
      results.filter((r) => r.allowed === false).length === CONCURRENT - 10,
      `${results.filter((r) => r.allowed === false).length} refused of ${CONCURRENT}`,
    );
    check(
      "a refused request still advanced the counter, so abuse extends its own lockout",
      counts[CONCURRENT - 1] === CONCURRENT,
      `highest count was ${counts[CONCURRENT - 1]}`,
    );

    const next = await hit("ip", bucket, 300, 10);
    check(
      "the limit is already reached for the next caller — the counter is not in memory",
      next.allowed === false,
    );

    console.log("\nWindows and dimensions\n");

    const shortBucket = `hash-${suffix}-window`;
    await hit("ip", shortBucket, 1, 1);
    const immediately = await hit("ip", shortBucket, 1, 1);
    check("a second call inside the window is refused", immediately.allowed === false);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const afterWindow = await hit("ip", shortBucket, 1, 1);
    check(
      "the window expires and the counter restarts",
      afterWindow.allowed === true && Number(afterWindow.count) === 1,
      `allowed=${afterWindow.allowed} count=${afterWindow.count}`,
    );

    const shared = `hash-${suffix}-shared`;
    const asIp = await hit("ip", shared, 300, 100);
    const asEmail = await hit("email", shared, 300, 100);
    check(
      "the same subject in two dimensions does not share a bucket",
      Number(asIp.count) === 1 && Number(asEmail.count) === 1,
      `ip=${asIp.count} email=${asEmail.count}`,
    );

    console.log("\nWhen the guard itself is blind\n");

    // The degraded branch, driven for real: a child process imports the same
    // module with a service-role key that cannot authenticate, so the RPC
    // genuinely errors and checkOne takes the path it takes in an outage. This
    // is the condition the old behaviour was weakest in — an unauthenticated
    // token-authorized WRITE proceeding with no limiter at all, during exactly
    // the misconfigured deployment most likely to have caused it.
    const probe = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--import",
        "./scripts/lib/ts-alias-loader-register.mjs",
        "--input-type=module",
        "-e",
        `const m = await import("@/lib/security/public-rate-limit");
         const out = {};
         for (const scope of ["public.estimate_approval", "public.invoice_checkout", "auth.login", "public.token_view"]) {
           const d = await m.enforcePublicRateLimit(scope, { token: "t", email: "e@x.invalid", ip: "203.0.113.9" });
           out[scope] = { allowed: d.allowed, degraded: d.degraded, message: m.rateLimitMessage(d) };
         }
         console.log("RESULT" + JSON.stringify(out));`,
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          // Well-formed and wrong: the module builds its client at call time,
          // so this reaches PostgREST and comes back an error.
          SUPABASE_SERVICE_ROLE_KEY: "not-a-valid-service-role-key",
        },
      },
    );

    const line = (probe.stdout ?? "").split(/\r?\n/).find((l) => l.startsWith("RESULT"));
    const degradedResults = line ? JSON.parse(line.slice("RESULT".length)) : null;

    check(
      "the degraded path can be exercised at all",
      degradedResults != null,
      (probe.stderr || probe.stdout || "").slice(-300),
    );

    if (degradedResults) {
      for (const scope of ["public.estimate_approval", "public.invoice_checkout"]) {
        check(
          `${scope.padEnd(26)} REFUSES while the limiter is unavailable`,
          degradedResults[scope]?.degraded === true &&
            degradedResults[scope]?.allowed === false,
          `got ${JSON.stringify(degradedResults[scope])} — this scope authorizes ` +
            `on a token in a URL and WRITES: an open window here is a window for ` +
            `guessing tokens against operations that change customer records`,
        );
      }

      for (const scope of ["auth.login", "public.token_view"]) {
        check(
          `${scope.padEnd(26)} still proceeds — refusing it would be a self-inflicted outage`,
          degradedResults[scope]?.degraded === true &&
            degradedResults[scope]?.allowed === true,
          JSON.stringify(degradedResults[scope]),
        );
      }

      check(
        "a degraded refusal does not claim the caller tried too often",
        !/too many/i.test(degradedResults["public.estimate_approval"]?.message ?? ""),
        `said "${degradedResults["public.estimate_approval"]?.message}" to someone ` +
          `who made one attempt`,
      );
    }

    check(
      "the fail-closed set is exactly the token-authorized writes",
      FAIL_CLOSED_SCOPES.size === 2 &&
        FAIL_CLOSED_SCOPES.has("public.estimate_approval") &&
        FAIL_CLOSED_SCOPES.has("public.invoice_checkout"),
      `got ${[...FAIL_CLOSED_SCOPES].join(", ")} — adding an auth scope here ` +
        `turns a database hiccup into a total sign-in outage, which is a ` +
        `business decision and not this module's to make quietly`,
    );

    console.log("\nNothing identifying is stored\n");

    // Drive the real guard, with real-shaped values, through the real hashing.
    await enforcePublicRateLimit("auth.login", { email: EMAIL, ip: ADDRESS });
    await enforcePublicRateLimit("public.estimate_approval", {
      token: TOKEN,
      ip: ADDRESS,
    });

    const { data: rows, error: rowsError } = await admin
      .from("public_request_rate_limits")
      .select("scope, dimension, subject_hash")
      .in("scope", ["auth.login", "public.estimate_approval"]);
    if (rowsError) throw new Error(`read back: ${rowsError.message}`);

    check(
      "the guard actually wrote counters",
      (rows ?? []).length >= 3,
      `${(rows ?? []).length} rows for the two scopes`,
    );

    const serialized = JSON.stringify(rows ?? []);
    for (const [label, raw] of [
      ["the email address", EMAIL],
      ["the local part of the email", EMAIL.split("@")[0]],
      ["the address", ADDRESS],
      ["the token", TOKEN],
    ]) {
      check(
        `${label} does not appear anywhere in the table`,
        !serialized.includes(raw),
        "the subject must be hashed before it reaches the database",
      );
    }
    check(
      "stored subjects look like hashes",
      (rows ?? []).every((row) => /^[0-9a-f]{64}$/.test(row.subject_hash)),
      JSON.stringify((rows ?? []).map((r) => r.subject_hash.slice(0, 12))),
    );

    console.log("\nPrivileges\n");

    const { error: anonRpcError } = await anon.rpc(
      "check_public_request_rate_limit",
      {
        p_scope: SCOPE,
        p_dimension: "ip",
        p_subject_hash: `hash-${suffix}-anon`,
        p_window_seconds: 60,
        p_limit: 1,
      },
    );
    check(
      "anon cannot advance a counter",
      anonRpcError != null,
      "an attacker who can advance counters can lock out everyone else",
    );

    const { data: anonRows } = await anon
      .from("public_request_rate_limits")
      .select("subject_hash")
      .limit(1);
    check(
      "anon reads no rows from the counter table",
      (anonRows ?? []).length === 0,
    );

    const { error: sweepAnonError } = await anon.rpc(
      "sweep_public_request_rate_limits",
      { p_older_than_hours: 1 },
    );
    check(
      "anon cannot sweep the counters",
      sweepAnonError != null,
      "sweeping is how an attacker would clear their own lockout",
    );

    const { data: swept, error: sweepError } = await admin.rpc(
      "sweep_public_request_rate_limits",
      { p_older_than_hours: 24 },
    );
    check(
      "service_role can sweep, and leaves live counters alone",
      sweepError == null && Number(swept) === 0,
      sweepError ? sweepError.message : `deleted ${swept}`,
    );
  } finally {
    await admin.from("public_request_rate_limits").delete().eq("scope", SCOPE);
    await admin
      .from("public_request_rate_limits")
      .delete()
      .in("scope", ["auth.login", "public.estimate_approval"]);
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} public rate limit checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}\n`);
  process.exit(1);
});
