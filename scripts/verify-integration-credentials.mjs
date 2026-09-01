/**
 * Executable tests for the credential seam — the module that decides who may
 * decrypt an integration token, when a provider is contacted, and what an
 * operator is allowed to be shown afterwards.
 *
 * ===================== WHY THIS IS NOT A PURE TEST =====================
 * Every rule in `lib/integrations/credentials.ts` is about a SEQUENCE, not a
 * value: read the secrets table or don't, ask the provider or don't, write
 * one column or five. A pure test can prove none of that, and a regex test
 * can only prove a line still exists. So this drives the real module against
 * a fake Supabase client and fake crypto, and asserts what it RETURNED and
 * what it SENT — including the queries it did not make.
 *
 * The real `upsertMarketingConnectedAccountSecret` is loaded too, rather
 * than stubbed, because the check that earns this file's keep is that the
 * `encryption_key_version` reaching that upsert's payload is the version the
 * ciphertext actually carries and not the helper's default of 1.
 *
 * NO DATABASE, NO NETWORK, NO CREDENTIALS. `@/lib/supabase/service` and
 * `lib/integrations/crypto` are replaced by stubs, the registry is replaced
 * by a stub that hands over a fake adapter, and an unscripted query throws
 * rather than reaching anything.
 *
 * ==================== THE HOSTILE STUBS ARE THE POINT ====================
 * The fake cipher's failure message embeds fake key material, and the fake
 * adapter's failure detail echoes back both plaintexts it was handed. That
 * is what real provider libraries and misconfigured key loaders do. The last
 * section sweeps every returned string, every recorded query and every
 * captured log line for those values.
 *
 * Run: node scripts/verify-integration-credentials.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

let failures = 0;
let checks = 0;
const realError = console.error;
function check(name, condition, detail) {
  checks += 1;
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    realError(`  FAIL  ${name}`, detail === undefined ? "" : detail);
  }
}

/* ------------------------------------------------------------- the values */

// The plaintexts. Nothing this suite produces may contain any of them.
const ACCESS_LIVE = "ACCESS-TOKEN-PLAINTEXT-LIVE";
const ACCESS_NEW = "ACCESS-TOKEN-PLAINTEXT-ROTATED";
const REFRESH_OLD = "REFRESH-TOKEN-PLAINTEXT-STORED";
const REFRESH_NEW = "REFRESH-TOKEN-PLAINTEXT-ISSUED";
const FAKE_KEY = "FAKE-ENCRYPTION-KEY-MATERIAL";
const SECRETS = [ACCESS_LIVE, ACCESS_NEW, REFRESH_OLD, REFRESH_NEW, FAKE_KEY];

const KEY_VERSION = 7; // Deliberately not 1 — see the upsert assertions.

const NOW = "2026-09-01T12:00:00.000Z";
const FUTURE = "2026-12-01T00:00:00.000Z";
const PAST = "2026-08-01T00:00:00.000Z";
const SOON = "2026-09-01T12:01:00.000Z"; // Inside the two-minute horizon.

const cipher = (plain, version = KEY_VERSION) =>
  `v${version}:iv:${Buffer.from(plain, "utf8").toString("base64")}:tag`;
const plainOf = (payload) =>
  Buffer.from(String(payload).split(":")[2] ?? "", "base64").toString("utf8");

/* ------------------------------------------------------------- transpile */

const REWRITES = [
  ['"server-only"', '"./server-only.mjs"'],
  [
    '"@/lib/database/queries/marketing-connected-account-secrets"',
    '"./secrets-store.mjs"',
  ],
  ['"@/lib/database/errors"', '"./db-errors.mjs"'],
  ['"@/lib/supabase/service"', '"./supabase-service.mjs"'],
  ['"@/lib/integrations/crypto"', '"./crypto-stub.mjs"'],
  [
    '"@/shared/types/marketing-channel-connection"',
    '"./marketing-channel-connection.mjs"',
  ],
  ['"@/shared/types/integration-capability"', '"./integration-capability.mjs"'],
  ['"@/shared/types/integration-provider"', '"./integration-provider.mjs"'],
  ['"./integration-capability"', '"./integration-capability.mjs"'],
  ['"./integration-provider"', '"./integration-provider.mjs"'],
  ['"./crypto"', '"./crypto-stub.mjs"'],
  ['"./registry"', '"./registry-stub.mjs"'],
  ['"./port"', '"./port.mjs"'],
];

function transpile(sourcePath) {
  return ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

const dir = mkdtempSync(join(tmpdir(), "int-credentials-"));

function emit(sourcePath, outName) {
  let code = transpile(sourcePath);
  for (const [from, to] of REWRITES) code = code.split(from).join(to);
  writeFileSync(join(dir, outName), code);
  return code;
}

writeFileSync(join(dir, "server-only.mjs"), "export {};\n");
writeFileSync(
  join(dir, "db-errors.mjs"),
  'export function mapDatabaseError(e) { return `DB: ${e?.message ?? "unknown"}`; }\n',
);

/**
 * The fake cipher.
 *
 * Format mirrors the real payload — `v<version>:<iv>:<ct>:<tag>` — so
 * `readIntegrationSecretKeyVersion` in the module under test parses it the
 * same way, and the version stamped on a write is observable.
 *
 * The failure message embeds key material ON PURPOSE. A credential module
 * that forwards a cipher error verbatim fails the leak sweep at the end.
 */
writeFileSync(
  join(dir, "crypto-stub.mjs"),
  `
export const FAKE_KEY = ${JSON.stringify(FAKE_KEY)};
let broken = false;
export function __setBroken(value) { broken = value; }

export function encryptIntegrationSecret(plainText) {
  if (!plainText) throw new Error("Cannot encrypt an empty secret.");
  if (broken) {
    throw new Error("INTEGRATIONS_ENCRYPTION_KEY must decode to 32 bytes (got " + FAKE_KEY + ")");
  }
  return "v${KEY_VERSION}:iv:" + Buffer.from(plainText, "utf8").toString("base64") + ":tag";
}

export function decryptIntegrationSecret(payload) {
  const parts = String(payload).split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid integration secret payload for key " + FAKE_KEY);
  }
  return Buffer.from(parts[2], "base64").toString("utf8");
}

export function readIntegrationSecretKeyVersion(payload) {
  const token = String(payload).split(":")[0];
  if (!token.startsWith("v")) return null;
  const parsed = Number.parseInt(token.slice(1), 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
}
`,
);

/**
 * The fake Supabase client. Every builder method records itself; the
 * terminal reads — and an awaited builder, which is how the upsert helper
 * calls it — take the next scripted response.
 *
 * Recording the payload is half the point: a refresh-failure write that
 * carried a ciphertext column would look perfectly healthy from its return
 * value and would have destroyed a credential.
 */
writeFileSync(
  join(dir, "supabase-service.mjs"),
  `
export let scripted = [];
export let ops = [];
export const allOps = [];
export function __load(nextScripted) { scripted = nextScripted.slice(); ops = []; }
export function __ops() { return ops; }

function builder() {
  const op = { table: null, verb: null, payload: null, filters: [], selected: null };
  ops.push(op);
  allOps.push(op);
  const api = {
    from(table) { op.table = table; return api; },
    insert(payload) { op.verb = "insert"; op.payload = payload; return api; },
    update(payload) { op.verb = "update"; op.payload = payload; return api; },
    upsert(payload) { op.verb = "upsert"; op.payload = payload; return api; },
    delete() { op.verb = "delete"; return api; },
    select(columns) { op.selected = columns; if (!op.verb) op.verb = "select"; return api; },
    eq(column, value) { op.filters.push(["eq", column, value]); return api; },
    is(column, value) { op.filters.push(["is", column, value]); return api; },
    async maybeSingle() { return next(); },
    async single() { return next(); },
    then(resolve, reject) {
      try { resolve(next()); } catch (error) { reject(error); }
    },
  };
  return api;
}

function next() {
  if (scripted.length === 0) {
    throw new Error("UNSCRIPTED QUERY — the test would have hit the database.");
  }
  return scripted.shift();
}

export function createServiceRoleClient() {
  return { from(table) { return builder().from(table); } };
}
`,
);

/**
 * The registry stub. Records every resolution attempt, so "the provider was
 * never contacted" can be asserted one step earlier than the adapter: on the
 * paths that must not reach a provider, the registry is never even asked.
 */
writeFileSync(
  join(dir, "registry-stub.mjs"),
  `
export const resolveCalls = [];
let resolution = { ok: false, reason: "NOT_REGISTERED", detail: "stub: nothing registered." };
export function __setResolution(next) { resolution = next; }
export async function resolveIntegrationAdapter(provider) {
  resolveCalls.push(provider);
  return resolution;
}
`,
);

writeFileSync(join(dir, "port.mjs"), "export {};\n");

emit("shared/types/integration-provider.ts", "integration-provider.mjs");
emit("shared/types/integration-capability.ts", "integration-capability.mjs");
emit(
  "shared/types/marketing-channel-connection.ts",
  "marketing-channel-connection.mjs",
);
emit(
  "lib/database/queries/marketing-connected-account-secrets.ts",
  "secrets-store.mjs",
);
emit("lib/integrations/registry.ts", "registry-real.mjs");
emit("lib/integrations/credentials.ts", "credentials.mjs");

/**
 * Structural checks read the CODE, not the prose around it.
 *
 * These files explain their own rules at length — "no `import "server-only"`",
 * "no `?? facebookAdapter`" — and a grep over the raw text finds those
 * sentences and reports the rule as broken by the comment that states it.
 * Stripping comments first is what makes the assertion about the module
 * rather than about how it is documented.
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const portEmitted = transpile("lib/integrations/port.ts");
const portSource = stripComments(readFileSync("lib/integrations/port.ts", "utf8"));
const portRaw = readFileSync("lib/integrations/port.ts", "utf8");
const credentialsSource = stripComments(
  readFileSync("lib/integrations/credentials.ts", "utf8"),
);
const registrySource = stripComments(
  readFileSync("lib/integrations/registry.ts", "utf8"),
);

const db = await import(pathToFileURL(join(dir, "supabase-service.mjs")).href);
const cryptoStub = await import(pathToFileURL(join(dir, "crypto-stub.mjs")).href);
const registryStub = await import(
  pathToFileURL(join(dir, "registry-stub.mjs")).href
);
const registry = await import(pathToFileURL(join(dir, "registry-real.mjs")).href);
const credentials = await import(pathToFileURL(join(dir, "credentials.mjs")).href);

/* ------------------------------------------------------------- fixtures */

const account = (over = {}) => ({
  connectedAccountId: "acct-1",
  companyId: "co-1",
  provider: "youtube",
  integrationKind: "publisher",
  tokenExpiresAt: FUTURE,
  ...over,
});

const secretRow = (over = {}) => ({
  access_token_encrypted: cipher(ACCESS_LIVE),
  refresh_token_encrypted: null,
  encryption_key_version: 1,
  refresh_expires_at: null,
  refresh_failure_count: 0,
  last_refreshed_at: null,
  ...over,
});

const okRow = (data) => ({ data, error: null });
const noRow = () => ({ data: null, error: null });
const dbError = (message) => ({ data: null, error: { code: "08006", message } });
const writeOk = () => ({ data: null, error: null });

/**
 * Every result this suite produces, swept for plaintext at the end.
 *
 * A throw is recorded as a result rather than allowed to abort the run. The
 * module under test is not supposed to throw at all — it returns a union —
 * so a rejection is itself a finding, and turning it into one failed check
 * beats losing every check after it to a stack trace. Its message goes into
 * the sweep too: a throw is one of the ways a token escapes.
 */
const results = [];
async function run(promise) {
  let result;
  try {
    result = await promise;
  } catch (error) {
    result = { ok: false, reason: "THREW", detail: String(error?.message ?? error) };
  }
  results.push(result);
  return result;
}

/** A refresh adapter whose calls are counted. */
function adapterWith(refresh) {
  const calls = [];
  const adapter = {
    provider: "youtube",
    kind: "publisher",
    async publish() {
      throw new Error("publish is not part of this suite.");
    },
  };
  if (refresh) {
    adapter.refreshCredential = async (input) => {
      calls.push(input);
      return refresh(input);
    };
  }
  registryStub.__setResolution({ ok: true, adapter });
  return calls;
}

function unregistered() {
  registryStub.__setResolution({
    ok: false,
    reason: "NOT_REGISTERED",
    detail: "stub: nothing registered.",
  });
}

// Captured so the leak sweep can read them. `check` still uses the real
// console.error, so failures remain visible.
const logs = [];
console.error = (...args) => {
  logs.push(
    args
      .map((value) => {
        try {
          return typeof value === "string" ? value : JSON.stringify(value);
        } catch {
          return String(value);
        }
      })
      .join(" "),
  );
};

let crashed = null;
try {
  /* ================================================================= port */

  console.log("\nThe port is a vocabulary, not a module");

  check(
    "port.ts compiles to nothing — no runtime weight, importable anywhere",
    portEmitted.replace(/export\s*\{\s*\}\s*;?/g, "").trim() === "",
    portEmitted.slice(0, 120),
  );
  check(
    "it declares no runtime value at all",
    !/\b(?:const|let|var|function|class)\b/.test(portEmitted),
  );
  check(
    "every import is type-only, so nothing is pulled in at runtime",
    (portSource.match(/^import\s/gm) ?? []).length ===
      (portSource.match(/^import type\s/gm) ?? []).length,
  );
  check(
    "publish() is declared exactly once — on the publisher variant",
    (portSource.match(/publish\(input: PublishInput\)/g) ?? []).length === 1,
  );
  check(
    "ASSET SOURCES AND FIRST-PARTY SURFACES CANNOT HAVE ONE: publish?: never",
    (portSource.match(/^\s*publish\?: never;$/gm) ?? []).length === 2,
    portSource.match(/^\s*publish\?: never;$/gm),
  );
  check(
    "the port never becomes server-only",
    !/^\s*import "server-only"/m.test(portSource),
  );
  check(
    "and the raw file documents that choice rather than leaving it implicit",
    portRaw.includes("server-only"),
  );

  /* ============================================================= registry */

  console.log("\nThe registry fails closed");

  check(
    "nothing is registered yet, so nothing resolves",
    registry.registeredAdapterProviders().length === 0,
    registry.registeredAdapterProviders(),
  );
  check(
    "a known provider with no adapter is refused by name",
    (await registry.resolveIntegrationAdapter("youtube")).reason ===
      "NOT_REGISTERED",
  );
  check(
    "a string that is not a provider at all is refused",
    (await registry.resolveIntegrationAdapter("myspace")).reason ===
      "UNKNOWN_PROVIDER",
  );
  check(
    "NO RESOLUTION EVER RETURNS AN ADAPTER BY DEFAULT",
    (await registry.resolveIntegrationAdapter("linkedin")).ok === false &&
      (await registry.resolveIntegrationAdapter("myspace")).adapter ===
        undefined,
  );
  check(
    "the source contains no fallback adapter",
    !/\?\?\s*\w*[Aa]dapter/.test(registrySource) &&
      !/default\s*:\s*\w*[Aa]dapter/.test(registrySource),
  );
  check(
    "a matching adapter validates",
    registry.validateAdapterIdentity("facebook", {
      provider: "facebook",
      kind: "publisher",
    }) === null,
  );
  check(
    "an adapter that names another provider is refused",
    registry.validateAdapterIdentity("facebook", {
      provider: "instagram",
      kind: "publisher",
    }) === "PROVIDER_MISMATCH",
  );
  check(
    "AN ASSET SOURCE CLAIMING TO BE A PUBLISHER IS REFUSED — the matrix wins",
    registry.validateAdapterIdentity("higgsfield", {
      provider: "higgsfield",
      kind: "publisher",
    }) === "KIND_MISMATCH",
  );
  check(
    "registry and credentials are both server-only",
    registrySource.startsWith('import "server-only"') &&
      credentialsSource.startsWith('import "server-only"'),
  );

  /* ======================================================== first party */

  console.log("\nA first-party surface never reads the secrets table");

  {
    db.__load([]);
    registryStub.resolveCalls.length = 0;
    const result = await run(
      credentials.refreshIfNeeded({
        account: account({ provider: "altair_site", integrationKind: "first_party" }),
        nowIso: NOW,
      }),
    );
    check(
      "refreshIfNeeded refuses without a credential",
      result.ok === false && result.reason === "FIRST_PARTY_NO_CREDENTIAL",
      result,
    );
    check(
      "AND MAKES NO QUERY AT ALL — not a read of the most sensitive table",
      db.__ops().length === 0,
      db.__ops(),
    );
    check(
      "and never asks the registry for an adapter",
      registryStub.resolveCalls.length === 0,
    );

    db.__load([]);
    const direct = await run(
      credentials.getAccessTokenForAccount(
        account({ provider: "altair_site", integrationKind: "first_party" }),
      ),
    );
    check(
      "getAccessTokenForAccount refuses the same way",
      direct.ok === false && direct.reason === "FIRST_PARTY_NO_CREDENTIAL",
    );
    check("and it too queries nothing", db.__ops().length === 0);
  }

  /* ====================================================== the live token */

  console.log("\nA live token is used as it is");

  {
    db.__load([okRow(secretRow())]);
    registryStub.resolveCalls.length = 0;
    const result = await run(
      credentials.refreshIfNeeded({ account: account(), nowIso: NOW }),
    );
    check(
      "the stored token is returned",
      result.ok === true && result.accessToken === ACCESS_LIVE,
      result.ok ? "" : result,
    );
    check("and is reported as not refreshed", result.refreshed === false);
    check("exactly one query was made", db.__ops().length === 1);

    const op = db.__ops()[0];
    check(
      "against the secrets table",
      op.table === "marketing_connected_account_secrets",
    );
    check(
      "keyed by the connected account",
      op.filters.some(
        ([k, c, v]) => k === "eq" && c === "connected_account_id" && v === "acct-1",
      ),
      op.filters,
    );
    check(
      "the refresh lifecycle columns are read in the same pass",
      String(op.selected).includes("refresh_token_encrypted") &&
        String(op.selected).includes("refresh_failure_count"),
      op.selected,
    );
    check(
      "NO PROVIDER IS CONTACTED FOR A LIVE TOKEN",
      registryStub.resolveCalls.length === 0,
    );

    db.__load([okRow(secretRow())]);
    const read = await run(credentials.getAccessTokenForAccount(account()));
    check(
      "getAccessTokenForAccount decrypts through the one cipher module",
      read.ok === true && read.accessToken === ACCESS_LIVE,
    );
  }

  /* =================================================== nothing to ask with */

  console.log("\nAn expired token with nothing to refresh never reaches out");

  {
    db.__load([okRow(secretRow())]);
    registryStub.resolveCalls.length = 0;
    const result = await run(
      credentials.refreshIfNeeded({
        account: account({ tokenExpiresAt: PAST }),
        nowIso: NOW,
      }),
    );
    check(
      "with no refresh token stored it reports REAUTH_REQUIRED",
      result.ok === false && result.reason === "REAUTH_REQUIRED",
      result,
    );
    check(
      "THE PROVIDER IS NEVER CONTACTED — the registry is not even asked",
      registryStub.resolveCalls.length === 0,
    );
    check("and only the one read happened", db.__ops().length === 1);
    check(
      "the reason literal matches the channel state the UI already renders",
      result.reason === "REAUTH_REQUIRED",
    );

    // TikTok's refresh token has its own expiry — migration 181's column.
    db.__load([
      okRow(
        secretRow({
          refresh_token_encrypted: cipher(REFRESH_OLD),
          refresh_expires_at: PAST,
        }),
      ),
    ]);
    registryStub.resolveCalls.length = 0;
    const stale = await run(
      credentials.refreshIfNeeded({
        account: account({ tokenExpiresAt: PAST }),
        nowIso: NOW,
      }),
    );
    check(
      "an expired REFRESH token also stops before the provider",
      stale.ok === false && stale.reason === "REAUTH_REQUIRED",
      stale,
    );
    check(
      "and nothing was asked to refresh it",
      registryStub.resolveCalls.length === 0,
    );

    // The horizon: valid now, dead inside the publish window.
    db.__load([okRow(secretRow())]);
    const soon = await run(
      credentials.refreshIfNeeded({
        account: account({ tokenExpiresAt: SOON }),
        nowIso: NOW,
      }),
    );
    check(
      "a token expiring inside the refresh horizon is treated as spent",
      soon.ok === false && soon.reason === "REAUTH_REQUIRED",
      soon,
    );
  }

  /* ================================================ cannot store, do not ask */

  console.log("\nIf the result cannot be stored, the provider is not asked");

  {
    cryptoStub.__setBroken(true);
    db.__load([okRow(secretRow({ refresh_token_encrypted: cipher(REFRESH_OLD) }))]);
    registryStub.resolveCalls.length = 0;
    const result = await run(
      credentials.refreshIfNeeded({
        account: account({ tokenExpiresAt: PAST }),
        nowIso: NOW,
      }),
    );
    cryptoStub.__setBroken(false);

    check(
      "an unusable cipher aborts with ENCRYPTION_UNAVAILABLE",
      result.ok === false && result.reason === "ENCRYPTION_UNAVAILABLE",
      result,
    );
    check(
      "AND THE PROVIDER WAS NEVER ASKED TO ROTATE A TOKEN WE COULD NOT SAVE",
      registryStub.resolveCalls.length === 0,
    );
    check("no write was attempted either", db.__ops().length === 1);
  }

  console.log("\nA provider with no refresh hop is refused without a call");

  {
    unregistered();
    db.__load([okRow(secretRow({ refresh_token_encrypted: cipher(REFRESH_OLD) }))]);
    const result = await run(
      credentials.refreshIfNeeded({
        account: account({ tokenExpiresAt: PAST }),
        nowIso: NOW,
      }),
    );
    check(
      "an unregistered adapter reports REFRESH_UNAVAILABLE, not REAUTH",
      result.ok === false && result.reason === "REFRESH_UNAVAILABLE",
      result,
    );

    const calls = adapterWith(null); // registered, but no refresh hop
    db.__load([okRow(secretRow({ refresh_token_encrypted: cipher(REFRESH_OLD) }))]);
    const noHop = await run(
      credentials.refreshIfNeeded({
        account: account({ tokenExpiresAt: PAST }),
        nowIso: NOW,
      }),
    );
    check(
      "an adapter without refreshCredential is refused",
      noHop.ok === false && noHop.reason === "REFRESH_UNAVAILABLE",
      noHop,
    );
    check("and was not invoked", calls.length === 0);
  }

  /* ==================================================== the happy refresh */

  console.log("\nThe refresh happens exactly once, and is stored correctly");

  {
    const calls = adapterWith(async () => ({
      ok: true,
      accessTokenPlaintext: ACCESS_NEW,
      // No new refresh token — the ordinary Google shape.
      tokenExpiresAt: FUTURE,
    }));

    db.__load([
      okRow(
        secretRow({
          refresh_token_encrypted: cipher(REFRESH_OLD),
          refresh_failure_count: 3,
        }),
      ),
      writeOk(), // the upsert
      okRow({ connected_account_id: "acct-1" }), // the lifecycle update
    ]);

    const result = await run(
      credentials.refreshIfNeeded({
        account: account({ tokenExpiresAt: PAST }),
        nowIso: NOW,
      }),
    );

    check(
      "the refreshed token comes back",
      result.ok === true && result.accessToken === ACCESS_NEW,
      result.ok ? "" : result,
    );
    check("flagged as refreshed", result.refreshed === true);
    check(
      "carrying the new expiry for the caller to persist on the account row",
      result.tokenExpiresAt === FUTURE,
    );
    check("THE ADAPTER WAS CALLED EXACTLY ONCE", calls.length === 1, calls.length);
    check(
      "and was handed the decrypted refresh token, not the ciphertext",
      calls[0]?.refreshTokenPlaintext === REFRESH_OLD,
    );

    const upsert = db.__ops()[1];
    check("the ciphertext write is an upsert", upsert.verb === "upsert");
    check(
      "the new access token is stored encrypted",
      plainOf(upsert.payload.access_token_encrypted) === ACCESS_NEW,
    );
    check(
      "THE EXISTING REFRESH TOKEN IS PRESERVED, NOT NULLED",
      plainOf(upsert.payload.refresh_token_encrypted) === REFRESH_OLD,
      upsert.payload.refresh_token_encrypted,
    );
    check(
      "THE KEY VERSION MATCHES THE CIPHERTEXT, NOT THE HELPER'S DEFAULT OF 1",
      upsert.payload.encryption_key_version === KEY_VERSION,
      upsert.payload.encryption_key_version,
    );

    const lifecycle = db.__ops()[2];
    check(
      "the failure counter is cleared on success",
      lifecycle.payload.refresh_failure_count === 0,
      lifecycle.payload,
    );
    check("and the refresh is timestamped", lifecycle.payload.last_refreshed_at === NOW);
    check(
      "an unreported refresh expiry is left exactly as it was",
      lifecycle.payload.refresh_expires_at === null,
      lifecycle.payload.refresh_expires_at,
    );
    check("three queries in total, no more", db.__ops().length === 3);
  }

  {
    const calls = adapterWith(async () => ({
      ok: true,
      accessTokenPlaintext: ACCESS_NEW,
      refreshTokenPlaintext: REFRESH_NEW,
      tokenExpiresAt: FUTURE,
      refreshExpiresAt: FUTURE,
    }));

    db.__load([
      okRow(secretRow({ refresh_token_encrypted: cipher(REFRESH_OLD) })),
      writeOk(),
      okRow({ connected_account_id: "acct-1" }),
    ]);

    await run(
      credentials.refreshIfNeeded({
        account: account({ tokenExpiresAt: PAST }),
        nowIso: NOW,
      }),
    );

    check("a rotating provider is called once as well", calls.length === 1);
    check(
      "a ROTATED refresh token replaces the stored one",
      plainOf(db.__ops()[1].payload.refresh_token_encrypted) === REFRESH_NEW,
    );
    check(
      "a reported refresh expiry is recorded (TikTok's case)",
      db.__ops()[2].payload.refresh_expires_at === FUTURE,
    );
  }

  /* =================================================== the refresh failure */

  console.log("\nA refused refresh is counted, and clobbers nothing");

  {
    const calls = adapterWith(async () => ({
      ok: false,
      reason: "TRANSIENT",
      detail: "503 from the token endpoint",
    }));

    db.__load([
      okRow(
        secretRow({
          refresh_token_encrypted: cipher(REFRESH_OLD),
          refresh_failure_count: 3,
        }),
      ),
      okRow({ connected_account_id: "acct-1" }),
    ]);

    const result = await run(
      credentials.refreshIfNeeded({
        account: account({ tokenExpiresAt: PAST }),
        nowIso: NOW,
      }),
    );

    check(
      "the failure is reported as REFRESH_FAILED",
      result.ok === false && result.reason === "REFRESH_FAILED",
      result,
    );
    check("the adapter was still called only once", calls.length === 1);

    const update = db.__ops()[1];
    check("the counter is incremented", update.payload.refresh_failure_count === 4);
    check(
      "THE UPDATE TOUCHES THAT COLUMN AND NOTHING ELSE",
      Object.keys(update.payload).join(",") === "refresh_failure_count",
      Object.keys(update.payload),
    );
    check(
      "so no ciphertext column appears in any write of this scenario",
      db
        .__ops()
        .every(
          (op) =>
            !op.payload ||
            (!("access_token_encrypted" in op.payload) &&
              !("refresh_token_encrypted" in op.payload)),
        ),
    );
    check(
      "and it is scoped to the one connected account",
      update.filters.some(
        ([, c, v]) => c === "connected_account_id" && v === "acct-1",
      ),
    );

    // The CHECK constraint bounds the column at 1000.
    adapterWith(async () => ({
      ok: false,
      reason: "TRANSIENT",
      detail: "still 503",
    }));
    db.__load([
      okRow(
        secretRow({
          refresh_token_encrypted: cipher(REFRESH_OLD),
          refresh_failure_count: 1000,
        }),
      ),
      okRow({ connected_account_id: "acct-1" }),
    ]);
    await run(
      credentials.refreshIfNeeded({
        account: account({ tokenExpiresAt: PAST }),
        nowIso: NOW,
      }),
    );
    check(
      "the counter is clamped at the column's CHECK ceiling, not left to fail it",
      db.__ops()[1].payload.refresh_failure_count === 1000,
      db.__ops()[1].payload,
    );

    // A revoked grant is a different answer to the operator.
    adapterWith(async () => ({
      ok: false,
      reason: "REAUTH_REQUIRED",
      detail: "invalid_grant",
    }));
    db.__load([
      okRow(
        secretRow({
          refresh_token_encrypted: cipher(REFRESH_OLD),
          refresh_failure_count: 0,
        }),
      ),
      okRow({ connected_account_id: "acct-1" }),
    ]);
    const revoked = await run(
      credentials.refreshIfNeeded({
        account: account({ tokenExpiresAt: PAST }),
        nowIso: NOW,
      }),
    );
    check(
      "a revoked grant escalates to REAUTH_REQUIRED",
      revoked.ok === false && revoked.reason === "REAUTH_REQUIRED",
      revoked,
    );
    check(
      "and is still counted",
      db.__ops()[1].payload.refresh_failure_count === 1,
    );
  }

  console.log("\nA refresh we could not save is reported, not swallowed");

  {
    adapterWith(async () => ({
      ok: true,
      accessTokenPlaintext: ACCESS_NEW,
      tokenExpiresAt: FUTURE,
    }));
    db.__load([
      okRow(secretRow({ refresh_token_encrypted: cipher(REFRESH_OLD) })),
      dbError("write timeout"),
    ]);

    const result = await run(
      credentials.refreshIfNeeded({
        account: account({ tokenExpiresAt: PAST }),
        nowIso: NOW,
      }),
    );

    check(
      "a failed store does not report success",
      result.ok === false,
      result,
    );
    check(
      "and tells the operator the stored credential may now be dead",
      /reconnect/i.test(result.detail ?? ""),
      result.detail,
    );
    check(
      "the raw database message is not forwarded to the operator",
      !(result.detail ?? "").includes("write timeout"),
      result.detail,
    );
  }

  /* ================================================= unreadable and missing */

  console.log("\nUnreadable and missing credentials fail honestly");

  {
    db.__load([okRow(secretRow({ access_token_encrypted: "garbage" }))]);
    const result = await run(credentials.getAccessTokenForAccount(account()));
    check(
      "an undecryptable payload reports DECRYPT_FAILED",
      result.ok === false && result.reason === "DECRYPT_FAILED",
      result,
    );
    check(
      "naming the env var to check, by NAME",
      (result.detail ?? "").includes("INTEGRATIONS_ENCRYPTION_KEY"),
      result.detail,
    );

    db.__load([noRow()]);
    const missing = await run(credentials.getAccessTokenForAccount(account()));
    check(
      "a missing secret row reports NO_SECRET_STORED",
      missing.ok === false && missing.reason === "NO_SECRET_STORED",
      missing,
    );

    db.__load([dbError("connection reset")]);
    const broken = await run(credentials.getAccessTokenForAccount(account()));
    check(
      "a database failure reports LOOKUP_FAILED",
      broken.ok === false && broken.reason === "LOOKUP_FAILED",
      broken,
    );
    check(
      "without forwarding the database's own words",
      !(broken.detail ?? "").includes("connection reset"),
      broken.detail,
    );
  }

  /* =========================================================== the sweep */

  console.log("\nNothing leaks: the sweep");

  {
    // A hostile adapter: its failure detail quotes both plaintexts back.
    adapterWith(async (input) => ({
      ok: false,
      reason: "PROVIDER_ERROR",
      detail: `refresh rejected for token ${input.refreshTokenPlaintext} (previous access ${ACCESS_LIVE})`,
    }));
    db.__load([
      okRow(secretRow({ refresh_token_encrypted: cipher(REFRESH_OLD) })),
      okRow({ connected_account_id: "acct-1" }),
    ]);
    const echoed = await run(
      credentials.refreshIfNeeded({
        account: account({ tokenExpiresAt: PAST }),
        nowIso: NOW,
      }),
    );
    // ============ WHY THIS ASSERTS ABSENCE, NOT REDACTION ============
    // These three checks previously asserted that the provider's prose was
    // FORWARDED with the known plaintexts scrubbed out of it, and that the
    // redaction marker was visible. That is a denylist, and this very
    // scenario is what disproved it: the hostile adapter echoes ACCESS_LIVE,
    // an access token this row does not store, so there was nothing to
    // subtract and the credential survived into the returned detail.
    //
    // A denylist can only remove what it already knows. The contract is now
    // the stronger one — the provider's message is never forwarded at all,
    // matching how this module already refuses to forward a database's own
    // words and how crypto.ts refuses to say more than a key version. So
    // these assert ABSENCE of the prose rather than a successful scrub of it.
    check(
      "AN ADAPTER THAT ECHOES THE REFRESH TOKEN CANNOT LEAK IT",
      !(echoed.detail ?? "").includes(REFRESH_OLD),
      echoed.detail,
    );
    check(
      "AN ADAPTER ECHOING A TOKEN WE DO NOT HOLD CANNOT LEAK IT EITHER",
      !(echoed.detail ?? "").includes(ACCESS_LIVE),
      echoed.detail,
    );
    check(
      "the provider's prose is not forwarded at all",
      !/refresh rejected/.test(echoed.detail ?? ""),
      echoed.detail,
    );
    check(
      "the operator is still told which provider failed and what to do",
      /youtube/i.test(echoed.detail ?? "") &&
        /reconnect|re-check/i.test(echoed.detail ?? ""),
      echoed.detail,
    );

    // An adapter that throws with the token in the message.
    adapterWith(async (input) => {
      throw new Error(`token ${input.refreshTokenPlaintext} rejected`);
    });
    db.__load([
      okRow(secretRow({ refresh_token_encrypted: cipher(REFRESH_OLD) })),
      okRow({ connected_account_id: "acct-1" }),
    ]);
    const thrown = await run(
      credentials.refreshIfNeeded({
        account: account({ tokenExpiresAt: PAST }),
        nowIso: NOW,
      }),
    );
    check(
      "an adapter that THROWS does not become an unhandled rejection",
      thrown.ok === false,
      thrown,
    );
    check(
      "and its message — the likeliest token echo — is discarded entirely",
      !(thrown.detail ?? "").includes(REFRESH_OLD),
      thrown.detail,
    );

    const returned = JSON.stringify(results);
    for (const secret of SECRETS) {
      if (secret === ACCESS_LIVE || secret === ACCESS_NEW) continue;
      check(
        `no returned result carries ${secret.slice(0, 12)}…`,
        !returned.includes(secret),
      );
    }
    check(
      "NO RETURNED ERROR STRING CONTAINS ANY PLAINTEXT OR KEY MATERIAL",
      results.every(
        (result) =>
          result.ok === true ||
          SECRETS.every((secret) => !String(result.detail).includes(secret)),
      ),
      results.filter((r) => r.ok !== true).map((r) => r.detail),
    );
    check(
      "no key material reaches a returned string on any path",
      !returned.includes(FAKE_KEY),
    );

    const recorded = JSON.stringify(db.allOps);
    check(
      "NO RECORDED QUERY CARRIES A PLAINTEXT TOKEN",
      SECRETS.every((secret) => !recorded.includes(secret)),
      SECRETS.filter((secret) => recorded.includes(secret)),
    );
    check(
      "no query carries key material either",
      !recorded.includes(FAKE_KEY),
    );

    const logged = logs.join("\n");
    check(
      "NO LOG LINE CARRIES A PLAINTEXT TOKEN",
      SECRETS.every((secret) => !logged.includes(secret)),
      SECRETS.filter((secret) => logged.includes(secret)),
    );
    check(
      "no log line carries key material, even from a cipher that shouted it",
      !logged.includes(FAKE_KEY),
    );
    check(
      "logs were actually produced, so the sweep is not vacuous",
      logs.length > 0,
      logs.length,
    );
    check(
      "the credential module reads no environment variable itself",
      !credentialsSource.includes("process.env"),
    );
    check(
      "and implements no second cipher",
      !/createCipheriv|createDecipheriv|aes-256-gcm/.test(credentialsSource),
    );
  }

  console.log("\nThe harness itself");
  {
    db.__load([]);
    let threw = false;
    try {
      await credentials.getAccessTokenForAccount(account());
    } catch (error) {
      threw = /UNSCRIPTED QUERY/.test(error.message);
    }
    check("an unscripted query fails loudly rather than reaching a database", threw);
  }
} catch (error) {
  crashed = error;
}

console.error = realError;

if (crashed) {
  check(
    "the suite ran to completion without the module going off-script",
    false,
    crashed.stack ?? crashed.message,
  );
}

console.log(
  `\n${checks - failures}/${checks} integration credential checks passed.`,
);
if (failures > 0) process.exit(1);
