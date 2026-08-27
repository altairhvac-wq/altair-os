/**
 * Mint a benchmark auth cookie for a scratch instance.
 *
 * ===================== WHY =====================
 * scripts/loadtest-benchmark.mjs measures authenticated pages, so it needs a
 * session cookie. The documented way to get one was "copy it out of a signed-in
 * browser" — which means a human, a browser, and a value pasted onto a command
 * line where it lands in shell history.
 *
 * This mints one instead: it signs a scratch user in through the ordinary
 * password grant and writes the cookie in the exact format @supabase/ssr
 * expects, using that package's OWN encoder and chunker rather than a
 * re-implementation, so it cannot drift out of step with the server client.
 *
 * ===================== THE VALUE IS NEVER PRINTED =====================
 * A session cookie is a bearer credential. This writes it to a gitignored file
 * and prints only the path. Pass that path to the benchmark with --cookie-file.
 *
 * ===================== SAFETY =====================
 *   1. Reads ALTAIR_LOADTEST_SUPABASE_URL / ALTAIR_LOADTEST_ANON_KEY only.
 *   2. Refuses if the target matches NEXT_PUBLIC_SUPABASE_URL in .env.local —
 *      minting a session against production and writing it to disk is exactly
 *      what this must never do.
 *   3. --confirm <project-ref> must match the target.
 *
 * Run:
 *   node scripts/loadtest-auth-cookie.mjs --confirm <ref> --email <e> --password <p>
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createChunks, stringToBase64URL } from "@supabase/ssr/dist/main/utils/index.js";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const ANON_ENV = "ALTAIR_LOADTEST_ANON_KEY";
const DEFAULT_OUT = ".tmp/loadtest-cookie.txt";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
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
  if (!line) return null;
  return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
}

const args = parseArgs(process.argv.slice(2));

const url = process.env[URL_ENV]?.trim();
const anonKey = process.env[ANON_ENV]?.trim();
if (!url || !anonKey) fail(`${URL_ENV} and ${ANON_ENV} must both be set.`);

let ref;
try {
  ref = new URL(url).host.split(".")[0];
} catch {
  fail(`${URL_ENV} is not a valid URL.`);
}

const appUrl = readEnvLocalSupabaseUrl();
if (appUrl && appUrl === url) {
  fail(
    `${URL_ENV} is the same project as NEXT_PUBLIC_SUPABASE_URL in .env.local.\n` +
      `This writes a live session cookie to disk. Use a scratch project.`,
  );
}

const confirm = typeof args.confirm === "string" ? args.confirm.trim() : "";
if (confirm !== ref) {
  fail(`--confirm must match the target project ref "${ref}".`);
}

const email = typeof args.email === "string" ? args.email : "";
const password = typeof args.password === "string" ? args.password : "";
if (!email || !password) fail("--email and --password are required.");

const outPath = typeof args.out === "string" ? args.out : DEFAULT_OUT;

const client = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await client.auth.signInWithPassword({ email, password });
if (error || !data.session) {
  fail(`sign-in failed: ${error?.message ?? "no session returned"}`);
}

// createServerClient stores the whole session object under this key. Build the
// value with the package's own encoder so the format tracks the dependency.
const cookieName = `sb-${ref}-auth-token`;
const session = data.session;
const payload = JSON.stringify({
  access_token: session.access_token,
  token_type: session.token_type,
  expires_in: session.expires_in,
  expires_at: session.expires_at,
  refresh_token: session.refresh_token,
  user: session.user,
});

const encoded = `base64-${stringToBase64URL(payload)}`;
const chunks = createChunks(cookieName, encoded);
const header = chunks.map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join("; ");

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, header, { encoding: "utf8" });

console.log(`\nSigned in as ${email} against ${ref}.`);
console.log(`  cookie chunks: ${chunks.length}`);
console.log(`  written to:    ${outPath}  (gitignored; value not printed)`);
console.log(`\nUse it with:`);
console.log(`  node scripts/loadtest-benchmark.mjs --cookie-file ${outPath} ...\n`);
