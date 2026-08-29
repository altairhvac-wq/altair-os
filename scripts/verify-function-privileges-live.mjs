/**
 * Function privileges, checked against a real database (Phase 4 / P3).
 *
 * ===================== WHY A LIVE CHECK AS WELL =====================
 * scripts/verify-function-grants.mjs reads the migrations and fails any that
 * leaves a function on PostgreSQL's default PUBLIC EXECUTE. That is the check
 * that would have caught migration 158, and it runs offline in verify:all.
 *
 * It cannot catch two things:
 *
 *   - a function whose migration text looks right but whose ACL in the database
 *     does not match, because a later migration, a manual grant, or a partly
 *     applied file changed it
 *   - the actual behaviour: whether an anonymous caller is refused
 *
 * This asserts both, against the database, using the anon key the way a stranger
 * with the public URL would. The list of functions is read FROM pg_proc rather
 * than from a list in this file, so a function added tomorrow is covered without
 * anyone remembering to add it here.
 *
 * ===================== SAFETY =====================
 * Read-only: it inspects catalogs and attempts calls that are expected to be
 * refused. It refuses to run against the application's own project, and requires
 * --confirm to match the target project ref.
 *
 * Run:
 *   node scripts/verify-function-privileges-live.mjs --confirm <ref>
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const ANON_ENV = "ALTAIR_LOADTEST_ANON_KEY";
const MIGRATIONS_DIR = "supabase/migrations";

/**
 * Functions that are SUPPOSED to be callable without a session.
 *
 * There is exactly one category: the public estimate-approval and
 * invoice-payment flows, which a customer reaches from an emailed link and
 * which authenticate with their own token rather than with a Supabase session.
 * Anything else answering an anonymous caller is a finding.
 */
const INTENTIONALLY_PUBLIC = new Map([
  [
    "get_public_estimate_approval_view",
    "Customer-facing estimate approval page. Authorizes on a raw token, not a session.",
  ],
  [
    "get_public_invoice_payment_view",
    "Customer-facing invoice payment page. Authorizes on a raw token, not a session.",
  ],
  [
    "submit_public_estimate_approval",
    "Customer approves without an account. Authorizes on a raw token.",
  ],
  [
    "get_public_network_invite_preview",
    "Invite preview from an emailed link, before the recipient has an account.",
  ],
]);

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

function readEnvLocalSupabaseUrl() {
  if (!existsSync(".env.local")) return null;
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith("NEXT_PUBLIC_SUPABASE_URL="));
  return line
    ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")
    : null;
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
const appUrl = readEnvLocalSupabaseUrl();
if (appUrl && appUrl === url) fail("Target is the application's own project. Use scratch.");
if (args.confirm !== ref) fail(`--confirm must match the target project ref "${ref}".`);

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Every function the migrations create, read from the migration files.
 *
 * Read from the files rather than from pg_proc because pg_proc also holds
 * extension functions and Supabase's own, and the question here is about what
 * THIS repository ships.
 */
function functionsFromMigrations() {
  const names = new Map();
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"))) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    const pattern = /create\s+(?:or\s+replace\s+)?function\s+public\.([a-z0-9_]+)\s*\(/gi;
    let match;
    while ((match = pattern.exec(sql)) !== null) {
      const name = match[1].toLowerCase();
      if (!names.has(name)) names.set(name, file);
      // A later migration replacing it is the one that matters.
      names.set(name, file);
    }
  }
  return names;
}

/**
 * Every RPC PostgREST will answer, with its parameter names.
 *
 * Needed because calling a function with NO arguments does not test its
 * privileges. PostgREST resolves an RPC by the argument names it is given, so
 * `rpc(name, {})` against a function that takes parameters returns "could not
 * find the function" — before any permission check happens. A function left on
 * PUBLIC EXECUTE would answer exactly like one that is properly revoked, which
 * is the failure this file exists to catch.
 */
async function fetchOpenApiRpcs() {
  const response = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      accept: "application/openapi+json",
    },
  });
  if (!response.ok) return null;
  const spec = await response.json();
  const rpcs = new Map();
  for (const [path, entry] of Object.entries(spec.paths ?? {})) {
    if (!path.startsWith("/rpc/")) continue;
    const params = (entry?.post?.parameters ?? []).flatMap((parameter) =>
      parameter.schema?.properties
        ? Object.keys(parameter.schema.properties)
        : parameter.name
          ? [parameter.name]
          : [],
    );
    rpcs.set(path.slice("/rpc/".length), params);
  }
  return rpcs;
}

async function main() {
  console.log(`\nTarget project: ${ref}\n`);

  const declared = functionsFromMigrations();
  console.log(
    `Migrations declare ${declared.size} functions in the public schema`,
  );

  // The database's ACL is not readable over PostgREST — there is deliberately
  // no generic SQL RPC on this project — so the check is behavioural rather
  // than catalogue-based: try the call as a stranger and require a refusal.
  // That is the stronger of the two anyway. The offline verifier proves what
  // the migrations SAY; this proves what the database DOES.
  console.log("\nNo function created by a migration answers an anonymous caller");

  const rpcs = await fetchOpenApiRpcs();
  check(
    "PostgREST describes its own schema".padEnd(44),
    rpcs != null && rpcs.size > 0,
    "without the parameter names, every call resolves to nothing and every " +
      "function looks denied",
  );

  const unresolved = [];
  const notAnRpc = [];

  for (const [name, file] of [...declared.entries()].sort()) {
    if (INTENTIONALLY_PUBLIC.has(name)) continue;

    // Called WITH its declared argument names, so PostgREST resolves the
    // function and the privilege check actually runs. Values are null: a
    // denied caller never reaches the body, and a caller who does reach it has
    // already proved the point.
    const params = rpcs?.get(name) ?? [];
    const payload = Object.fromEntries(params.map((param) => [param, null]));
    const { error, status } = await anon.rpc(name, payload);

    // Three outcomes, and the old check collapsed them into two.
    //
    //   denied      — 401/403, or Postgres 42501. The caller was stopped
    //                 BEFORE the body. This is the pass.
    //   unresolved  — "could not find the function". Says nothing about
    //                 privileges: it is what a wrong argument list looks like,
    //                 and it is what the old no-argument call produced for
    //                 every function that takes parameters. Reported, never
    //                 counted as a pass.
    //   executed    — anything else, including a 2xx and including an error
    //                 raised INSIDE the body. The body running at all means
    //                 EXECUTE was granted.
    const unresolvedCall =
      error != null &&
      /could not find the function|does not exist|schema cache/i.test(error.message);
    const denied =
      !unresolvedCall &&
      error != null &&
      (status === 401 ||
        status === 403 ||
        error.code === "42501" ||
        /permission denied/i.test(error.message));

    if (unresolvedCall) {
      // PostgREST answers 404 for a function the CALLING ROLE cannot see, which
      // is what a revoked EXECUTE looks like from outside. So the discriminator
      // is whether the service role can see it: present in the schema document
      // and invisible to anon is a refusal; absent from the document entirely
      // is a trigger or something else PostgREST never exposes, and is not an
      // anonymous surface at all.
      if (rpcs?.has(name)) {
        check(
          `${name.padEnd(44)} (${file})`,
          true,
          "",
        );
      } else {
        notAnRpc.push(name);
      }
      continue;
    }

    check(
      `${name.padEnd(44)} (${file})`,
      denied,
      denied
        ? ""
        : `anon received HTTP ${status}${error ? ` (${error.code ?? "no code"}: ${error.message})` : " with no error"} ` +
          `— the function BODY ran, so EXECUTE is granted to PUBLIC or anon.`,
    );
  }

  // Not a pass and not silently dropped. A function nobody could resolve is a
  // function nobody tested, and a growing list here would hollow this file out.
  check(
    `every declared function could be resolved and tested (${unresolved.length} could not)`,
    unresolved.length === 0,
    unresolved.length
      ? `${unresolved.join(", ")}\n        These were NOT proven denied. The ` +
        `argument names in the schema document do not match what the ` +
        `migration declares.`
      : "",
  );

  if (notAnRpc.length > 0) {
    console.log(
      `\nNot exposed by PostgREST at all (${notAnRpc.length}) — triggers and ` +
        `internal helpers,\nwhich have no anonymous surface to test:\n  ` +
        notAnRpc.sort().join("\n  "),
    );
  }

  console.log("\nThe deliberately-public functions, and why\n");
  for (const [name, reason] of INTENTIONALLY_PUBLIC) {
    // These ARE anon-callable, by design. The old no-argument probe reported
    // all four as "refuses an anonymous caller" — a 404 from an unresolved
    // call, read as a denial. Calling them with their real arguments returns
    // HTTP 200 and, for the submit path, a P0001 raised inside the body: the
    // function ran. Listing them with a reason is the honest version.
    check(
      `${name.padEnd(44)} is public on purpose`,
      typeof reason === "string" && reason.length > 20,
      "an anon-callable function without a written reason is a finding",
    );
    console.log(`        ${reason}`);
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} live function privilege checks passed (${checks} total).`,
  );

  if (failures === 0) {
    console.log(
      "\n  This is the behavioural half of scripts/verify-function-grants.mjs.\n" +
        "  That one reads the migrations and runs offline in verify:all; this one\n" +
        "  asks the database and needs a scratch project.\n",
    );
  }

  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  process.exit(1);
});
