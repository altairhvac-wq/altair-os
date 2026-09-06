/**
 * Executable tests for the daily credential-maintenance pass — the scheduled
 * half of token durability.
 *
 * ===================== WHAT IS BEING PROVEN =====================
 * 1. SELECTION: only connections that can be maintained are touched, and a
 *    connection with no stored refresh token never generates a seam call.
 * 2. CLASSIFICATION: every seam failure lands in the right outcome bucket —
 *    a terminal rejection is not "transient", a deployment fault is not a
 *    Google fault.
 * 3. NO TOKEN ESCAPES: the summary a cron route will serialize into its JSON
 *    response never carries an access token, on any path.
 * 4. WIRING: the insights cron actually runs the pass, before its own work,
 *    and vercel.json still schedules that route daily.
 *
 * Follows the transpile-with-stubs harness of
 * `verify-integration-credentials.mjs`: the real module runs against fakes,
 * and an unscripted call fails loudly.
 *
 * Run: node scripts/verify-credential-maintenance.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

let failures = 0;
let checks = 0;
function check(name, condition, detail) {
  checks += 1;
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}`, detail === undefined ? "" : detail);
  }
}

const ACCESS_PLAINTEXT = "ACCESS-TOKEN-MUST-NEVER-ESCAPE";

const REWRITES = [
  ['"server-only"', '"./server-only.mjs"'],
  [
    '"@/lib/database/queries/marketing-connected-accounts-admin"',
    '"./admin-stub.mjs"',
  ],
  [
    '"@/lib/database/queries/marketing-connected-account-secrets"',
    '"./secrets-stub.mjs"',
  ],
  [
    '"@/shared/types/marketing-channel-connection"',
    '"./channel-connection.mjs"',
  ],
  ['"./integration-capability"', '"./integration-capability.mjs"'],
  ['"./integration-provider"', '"./integration-provider.mjs"'],
  ['"./credentials"', '"./lifecycle-stub.mjs"'],
  ['"./credential-lifecycle"', '"./lifecycle-stub.mjs"'],
];

function transpile(sourcePath) {
  return ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

const dir = mkdtempSync(join(tmpdir(), "cred-maintenance-"));

function emit(sourcePath, outName) {
  let code = transpile(sourcePath);
  for (const [from, to] of REWRITES) code = code.split(from).join(to);
  writeFileSync(join(dir, outName), code);
}

writeFileSync(join(dir, "server-only.mjs"), "export {};\n");

writeFileSync(
  join(dir, "admin-stub.mjs"),
  `
export let accounts = [];
export const metadataWrites = [];
export function __setAccounts(next) { accounts = next; metadataWrites.length = 0; }
export async function listRefreshableConnectedAccounts() { return accounts; }
export async function setConnectionMetadata(input) { metadataWrites.push(input); return {}; }
`,
);

/**
 * The secrets stub — presence only, per account id, mirroring the real
 * helper's shape. The maintenance pass asks it only for accounts whose
 * metadata DENIES a refresh token, so scripting is keyed rather than queued.
 */
writeFileSync(
  join(dir, "secrets-stub.mjs"),
  `
export const presenceCalls = [];
export let presenceById = {};
export function __setPresence(next) { presenceById = next; presenceCalls.length = 0; }
export async function readSecretRefreshTokenPresence(id) {
  presenceCalls.push(id);
  return { present: presenceById[id] === true };
}
`,
);

/**
 * The lifecycle stub. Scripted results; every call recorded. The success
 * result deliberately carries the plaintext access token, exactly as the
 * real seam's does — proving the maintenance module DROPS it is the point.
 */
writeFileSync(
  join(dir, "lifecycle-stub.mjs"),
  `
export const calls = [];
export let scripted = [];
export function __load(next) { scripted = next.slice(); calls.length = 0; }
export async function getUsableAccessToken(input) {
  calls.push(input);
  if (scripted.length === 0) {
    throw new Error("UNSCRIPTED LIFECYCLE CALL — selection is broken.");
  }
  return scripted.shift();
}
`,
);

emit("shared/types/integration-provider.ts", "integration-provider.mjs");
emit("shared/types/integration-capability.ts", "integration-capability.mjs");
emit("shared/types/marketing-channel-connection.ts", "channel-connection.mjs");
emit("lib/integrations/credential-maintenance.ts", "maintenance.mjs");

const adminStub = await import(pathToFileURL(join(dir, "admin-stub.mjs")).href);
const secretsStub = await import(pathToFileURL(join(dir, "secrets-stub.mjs")).href);
const lifecycle = await import(pathToFileURL(join(dir, "lifecycle-stub.mjs")).href);
const maintenance = await import(pathToFileURL(join(dir, "maintenance.mjs")).href);

const NOW = "2026-09-06T05:00:00.000Z";

const account = (id, over = {}) => ({
  id,
  companyId: "co-1",
  provider: "youtube",
  integrationKind: "publisher",
  status: "connected",
  publishCapability: "direct",
  tokenExpiresAt: "2026-09-05T00:00:00.000Z",
  metadata: { hasRefreshToken: true },
  ...over,
});

const okFresh = () => ({ ok: true, accessToken: ACCESS_PLAINTEXT, refreshed: false, tokenExpiresAt: "2026-12-01T00:00:00.000Z" });
const okRefreshed = () => ({ ok: true, accessToken: ACCESS_PLAINTEXT, refreshed: true, tokenExpiresAt: "2026-12-01T00:00:00.000Z" });
const fail = (reason) => ({ ok: false, reason, detail: `stub detail for ${reason}` });

console.log("\nSelection: what the pass touches and what it must not");

{
  adminStub.__setAccounts([
    account("acct-rt"),
    account("acct-no-rt", { metadata: {} }),
    account("acct-rt-false", { metadata: { hasRefreshToken: false } }),
  ]);
  secretsStub.__setPresence({}); // neither denied account actually holds one
  lifecycle.__load([okRefreshed()]);

  const summary = await maintenance.maintainIntegrationCredentials({ nowIso: NOW });

  check(
    "only the connection with a stored refresh token reaches the seam",
    lifecycle.calls.length === 1 &&
      lifecycle.calls[0]?.account.connectedAccountId === "acct-rt",
    lifecycle.calls.map((c) => c.account.connectedAccountId),
  );
  check(
    "the clock is the caller's, passed through",
    lifecycle.calls[0]?.nowIso === NOW,
  );
  check(
    "connections without a refresh token are reported, not skipped silently",
    summary.counts.no_refresh_token === 2 && summary.counts.refreshed === 1,
    summary.counts,
  );
  check(
    "the summary covers every account exactly once",
    summary.attempted === 3 && summary.attempts.length === 3,
  );
  check(
    "a denied claim is verified against presence before it is believed",
    secretsStub.presenceCalls.length === 2 &&
      secretsStub.presenceCalls.includes("acct-no-rt") &&
      secretsStub.presenceCalls.includes("acct-rt-false"),
    secretsStub.presenceCalls,
  );
  check(
    "an accurate denial writes no metadata",
    adminStub.metadataWrites.length === 0,
    adminStub.metadataWrites,
  );
}

console.log("\nThe metadata heal: a wrong denial is corrected from presence");

{
  adminStub.__setAccounts([
    account("acct-lied", { metadata: { hasRefreshToken: false, other: "kept" } }),
  ]);
  secretsStub.__setPresence({ "acct-lied": true });
  lifecycle.__load([okRefreshed()]);

  const summary = await maintenance.maintainIntegrationCredentials({ nowIso: NOW });

  check(
    "a secret that exists overrules metadata that denies it — the seam is called",
    lifecycle.calls.length === 1 && summary.counts.refreshed === 1,
    summary.counts,
  );
  check(
    "and the claim is healed in place, preserving the rest of the metadata",
    adminStub.metadataWrites.length === 1 &&
      adminStub.metadataWrites[0]?.metadata?.hasRefreshToken === true &&
      adminStub.metadataWrites[0]?.metadata?.other === "kept",
    adminStub.metadataWrites,
  );
}

console.log("\nThe time budget: the pass defers, never overruns");

{
  adminStub.__setAccounts([account("a-1"), account("a-2"), account("a-3")]);
  secretsStub.__setPresence({});
  lifecycle.__load([]);

  const summary = await maintenance.maintainIntegrationCredentials({
    nowIso: NOW,
    budgetMs: 0, // already out of time before the first account
  });

  check(
    "an exhausted budget defers every remaining account without a provider call",
    summary.counts.deferred === 3 &&
      lifecycle.calls.length === 0 &&
      summary.attempts.every((a) => a.outcome === "deferred"),
    summary.counts,
  );
}

console.log("\nClassification: each failure lands in its own bucket");

{
  adminStub.__setAccounts([
    account("a-fresh"),
    account("a-refreshed"),
    account("a-terminal"),
    account("a-transient"),
    account("a-misconfig"),
    account("a-lost-secret"),
  ]);
  lifecycle.__load([
    okFresh(),
    okRefreshed(),
    fail("REAUTH_REQUIRED"),
    fail("REFRESH_FAILED"),
    fail("DECRYPT_FAILED"),
    fail("NO_SECRET_STORED"),
  ]);

  const summary = await maintenance.maintainIntegrationCredentials({ nowIso: NOW });
  const byId = Object.fromEntries(
    summary.attempts.map((a) => [a.connectedAccountId, a.outcome]),
  );

  check("a valid token is 'fresh'", byId["a-fresh"] === "fresh", byId);
  check("a completed refresh cycle is 'refreshed'", byId["a-refreshed"] === "refreshed");
  check(
    "A TERMINAL PROVIDER REJECTION IS 'reauth_required', NEVER TRANSIENT",
    byId["a-terminal"] === "reauth_required",
  );
  check("a provider hiccup is 'transient'", byId["a-transient"] === "transient");
  check(
    "an unusable cipher is 'misconfigured' — a deploy fault, not a Google one",
    byId["a-misconfig"] === "misconfigured",
  );
  check(
    "a vanished secret needs the human — 'no_refresh_token'",
    byId["a-lost-secret"] === "no_refresh_token",
  );
  check(
    "the tally agrees with the attempts",
    Object.values(summary.counts).reduce((a, b) => a + b, 0) === 6,
    summary.counts,
  );

  check(
    "NO ACCESS TOKEN SURVIVES INTO THE SUMMARY — the cron will serialize it",
    !JSON.stringify(summary).includes(ACCESS_PLAINTEXT),
  );
  check(
    "failure details carried through are the seam's own prose",
    summary.attempts.find((a) => a.connectedAccountId === "a-terminal")?.detail ===
      "stub detail for REAUTH_REQUIRED",
  );
}

console.log("\nAn empty platform is a clean no-op");

{
  adminStub.__setAccounts([]);
  lifecycle.__load([]);
  const summary = await maintenance.maintainIntegrationCredentials({ nowIso: NOW });
  check(
    "zero accounts, zero calls, zero counts",
    summary.attempted === 0 &&
      lifecycle.calls.length === 0 &&
      Object.values(summary.counts).every((n) => n === 0),
    summary,
  );
}

console.log("\nWiring: the daily cron actually runs the pass");

{
  const route = readFileSync("app/api/cron/marketing-insights/route.ts", "utf8");
  const stripped = route
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  check(
    "the insights cron imports the maintenance module",
    stripped.includes(
      'from "@/lib/integrations/credential-maintenance"',
    ),
  );
  check(
    "and runs it BEFORE collecting insights",
    stripped.indexOf("maintainIntegrationCredentials(") <
      stripped.indexOf("collectReelInsightsForCompany("),
  );
  check(
    "the response reports the maintenance outcome",
    stripped.includes("credentialMaintenance"),
  );
  check(
    "a misconfigured credential path reddens the run",
    stripped.includes("maintenanceFaults"),
  );

  const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
  check(
    "vercel.json still schedules the insights route daily",
    (vercel.crons ?? []).some(
      (cron) => cron.path === "/api/cron/marketing-insights" && typeof cron.schedule === "string",
    ),
    vercel.crons,
  );

  const maintenanceSource = readFileSync(
    "lib/integrations/credential-maintenance.ts",
    "utf8",
  );
  check(
    "the maintenance module is server-only",
    maintenanceSource.startsWith('import "server-only"'),
  );
  check(
    "and is not a scheduler itself: no cron, timer, or interval",
    !/setInterval|setTimeout|cron/i.test(
      maintenanceSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""),
    ),
  );
}

console.log(
  failures === 0
    ? `\n${checks}/${checks} credential-maintenance checks passed.`
    : `\n${failures} of ${checks} credential-maintenance checks FAILED.`,
);
process.exit(failures === 0 ? 0 : 1);
