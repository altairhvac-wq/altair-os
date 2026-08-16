/**
 * Executable tests for the two delivery writes that decide whether a publish
 * is honestly recorded.
 *
 * ===================== WHY THIS EXISTS =====================
 * `settleDelivery` guards its UPDATE with `delivery_state = 'in_flight'` and
 * read the result with `maybeSingle()`, checking only `result.error`. A
 * zero-row match — the guard doing exactly its job — returned SUCCESS, and the
 * caller went on to mark the post `posted` on the strength of a write that
 * never happened. Two rounds of independent audit found that shape twice, in
 * two different functions, because it reads correctly.
 *
 * Pure tests cannot catch it: the decision is right, the plumbing was not.
 * Structural tests can only assert a regex. So this drives the real functions
 * against a fake Supabase client and asserts what they RETURN and what they
 * SENT — including the case where the row that comes back is null.
 *
 * NO DATABASE, NO NETWORK. `@/lib/supabase/service` is replaced by a stub, and
 * the fake client records every call rather than making one.
 *
 * ==================== THESE TESTS WERE MUTATION-CHECKED ====================
 * Reverting `settleDelivery` to its error-only check, and removing the
 * zero-row throw from `recordDeliveryProviderMedia`, each fail this suite.
 *
 * Run: node scripts/verify-marketing-delivery-store.mjs
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

/* ------------------------------------------------------------- harness */

const REWRITES = [
  ['"server-only"', '"./server-only.mjs"'],
  ['"@/shared/types/marketing-delivery"', '"./marketing-delivery.mjs"'],
  ['"@/lib/database/errors"', '"./db-errors.mjs"'],
  ['"@/lib/supabase/service"', '"./supabase-service.mjs"'],
];

function transpileInto(dir, sourcePath, outName) {
  const { outputText } = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  let code = outputText;
  for (const [from, to] of REWRITES) code = code.split(from).join(to);
  writeFileSync(join(dir, outName), code);
}

const dir = mkdtempSync(join(tmpdir(), "delivery-store-"));
writeFileSync(join(dir, "server-only.mjs"), "export {};\n");
writeFileSync(
  join(dir, "db-errors.mjs"),
  'export function mapDatabaseError(e) { return `DB: ${e?.message ?? "unknown"}`; }\n',
);

/**
 * The fake client. Every builder method records itself and returns `this`;
 * the terminal reads take the next scripted response.
 *
 * Recording the chain is half the point — a settle that forgot its
 * `delivery_state = 'in_flight'` guard would return a perfectly happy result
 * and quietly overwrite a settled row.
 */
let scripted = [];
let ops = [];

writeFileSync(
  join(dir, "supabase-service.mjs"),
  `
export let scripted = [];
export let ops = [];
export function __load(nextScripted) { scripted = nextScripted.slice(); ops = []; }
export function __ops() { return ops; }

function builder() {
  const op = { table: null, verb: null, payload: null, filters: [], selected: null };
  ops.push(op);
  const api = {
    from(table) { op.table = table; return api; },
    insert(payload) { op.verb = "insert"; op.payload = payload; return api; },
    update(payload) { op.verb = "update"; op.payload = payload; return api; },
    select(columns) { op.selected = columns; if (!op.verb) op.verb = "select"; return api; },
    eq(column, value) { op.filters.push(["eq", column, value]); return api; },
    lt(column, value) { op.filters.push(["lt", column, value]); return api; },
    order() { return api; },
    limit() { return api; },
    async maybeSingle() { return next(); },
    async single() { return next(); },
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

transpileInto(dir, "shared/types/marketing-delivery.ts", "marketing-delivery.mjs");
transpileInto(
  dir,
  "lib/database/queries/marketing-channel-deliveries.ts",
  "deliveries.mjs",
);

const stub = await import(pathToFileURL(join(dir, "supabase-service.mjs")).href);
const store = await import(pathToFileURL(join(dir, "deliveries.mjs")).href);

const NOW = "2026-08-16T12:00:00.000Z";

const rowData = (over = {}) => ({
  id: "del-1",
  company_id: "c1",
  marketing_post_id: "p1",
  provider: "facebook",
  delivery_state: "in_flight",
  provider_post_id: null,
  provider_media_id: null,
  provider_permalink: null,
  failure_detail: null,
  created_at: NOW,
  settled_at: null,
  ...over,
});

const okRow = (data) => ({ data, error: null });
const noRow = () => ({ data: null, error: null });
const dbError = (message) => ({ data: null, error: { message } });

const POSTED = {
  outcome: "posted",
  providerPostId: "fb_1",
  providerPermalink: "https://www.facebook.com/reel/fb_1",
};

// Quiet the module's deliberate console.error noise; the assertions are the
// signal here, not the log.
const realError = console.error;
console.error = () => {};

// Everything below runs inside one guard. A regression can leave the module
// consuming a different number of queries than a test scripted, and an
// unscripted query throws — which without this would abort the run with a
// stack trace instead of a readable failure list.
let crashed = null;
try {

  /* ============================ settleDelivery ============================ */

  console.log("\nsettleDelivery — the happy path still writes what it should");
  {
    stub.__load([okRow({ id: "del-1" })]);
    const result = await store.settleDelivery({
      deliveryId: "del-1",
      settlement: POSTED,
      nowIso: NOW,
    });
    check("a matched update reports success", result.error === undefined, result.error);

    const op = stub.__ops()[0];
    check("it updates the deliveries table", op.table === "marketing_channel_deliveries");
    check("it is an update", op.verb === "update");
    check("it writes the provider post id", op.payload.provider_post_id === "fb_1");
    check(
      "it writes the permalink",
      op.payload.provider_permalink === "https://www.facebook.com/reel/fb_1",
    );
    check("it clears any earlier failure text", op.payload.failure_detail === null);
    check("it stamps settled_at", op.payload.settled_at === NOW);
    check("it moves the row to posted", op.payload.delivery_state === "posted");
    check(
      "IT GUARDS ON in_flight — without this a settled row could be overwritten",
      op.filters.some(([k, c, v]) => k === "eq" && c === "delivery_state" && v === "in_flight"),
      op.filters,
    );
    check(
      "and it targets exactly one row by id",
      op.filters.some(([k, c, v]) => k === "eq" && c === "id" && v === "del-1"),
    );
  }

  console.log("\nsettleDelivery — THE DEFECT: an update that matched no row");
  {
    // Nothing there at all.
    stub.__load([noRow(), noRow()]);
    let result = await store.settleDelivery({
      deliveryId: "del-1",
      settlement: POSTED,
      nowIso: NOW,
    });
    check(
      "a zero-row update NO LONGER reports success",
      result.error !== undefined,
      result,
    );
    check("a vanished row is explained", /no longer\s+exists/i.test(result.error ?? ""), result.error);
    check("and names the provider id to reconcile", (result.error ?? "").includes("fb_1"));

    // Someone else settled it to a different outcome.
    stub.__load([noRow(), okRow(rowData({ delivery_state: "failed", failure_detail: "x" }))]);
    result = await store.settleDelivery({
      deliveryId: "del-1",
      settlement: POSTED,
      nowIso: NOW,
    });
    check("a row settled elsewhere is reported, not swallowed", result.error !== undefined);
    check(
      "and the operator is told not to publish again",
      /do not publish again/i.test(result.error ?? ""),
      result.error,
    );

    // Posted, but by a different attempt.
    stub.__load([
      noRow(),
      okRow(rowData({ delivery_state: "posted", provider_post_id: "fb_SOMETHING_ELSE" })),
    ]);
    result = await store.settleDelivery({
      deliveryId: "del-1",
      settlement: POSTED,
      nowIso: NOW,
    });
    check(
      "a row posted with a DIFFERENT provider id is reported",
      result.error !== undefined,
      result,
    );
  }

  console.log("\nsettleDelivery — the retry is not turned into a false alarm");
  {
    // The scenario the naive fix would break: attempt one committed and then
    // returned an error, so attempt two matches nothing BECAUSE it worked.
    stub.__load([noRow(), okRow(rowData({ delivery_state: "posted", provider_post_id: "fb_1" }))]);
    const result = await store.settleDelivery({
      deliveryId: "del-1",
      settlement: POSTED,
      nowIso: NOW,
    });
    check(
      "a settle whose own earlier attempt already landed reports SUCCESS",
      result.error === undefined,
      result.error,
    );
    check("it re-read the row to find that out", stub.__ops().length === 2);
    check(
      "and the re-read was a plain select by id",
      stub.__ops()[1].verb === "select" &&
        stub.__ops()[1].filters.some(([, c, v]) => c === "id" && v === "del-1"),
    );

    // The same protection for a repeated failure settle.
    stub.__load([noRow(), okRow(rowData({ delivery_state: "failed", failure_detail: "429" }))]);
    const failedAgain = await store.settleDelivery({
      deliveryId: "del-1",
      settlement: { outcome: "failed", failureDetail: "429" },
      nowIso: NOW,
    });
    check("a repeated failed settle also reports success", failedAgain.error === undefined);
  }

  console.log("\nsettleDelivery — real database errors still surface");
  {
    stub.__load([dbError("connection reset")]);
    const result = await store.settleDelivery({
      deliveryId: "del-1",
      settlement: POSTED,
      nowIso: NOW,
    });
    check("an update error is reported", /connection reset/.test(result.error ?? ""), result.error);
    check("and no re-read is attempted on a hard error", stub.__ops().length === 1);

    stub.__load([noRow(), dbError("re-read failed")]);
    const unreadable = await store.settleDelivery({
      deliveryId: "del-1",
      settlement: POSTED,
      nowIso: NOW,
    });
    check(
      "a miss whose row cannot be re-read fails rather than assuming",
      /re-read failed/.test(unreadable.error ?? ""),
      unreadable.error,
    );
  }

  console.log("\nsettleDelivery — failure detail is clamped under the column CHECK");
  {
    stub.__load([okRow({ id: "del-1" })]);
    await store.settleDelivery({
      deliveryId: "del-1",
      settlement: { outcome: "failed", failureDetail: "x".repeat(5000) },
      nowIso: NOW,
    });
    check(
      "an over-long provider error is truncated before it reaches the column",
      stub.__ops()[0].payload.failure_detail.length <= 1000,
      stub.__ops()[0].payload.failure_detail.length,
    );
  }

  /* ==================== recordDeliveryProviderMedia ==================== */

  console.log("\nrecordDeliveryProviderMedia — the breadcrumb before the risky window");
  {
    stub.__load([okRow({ id: "del-1" })]);
    let threw = null;
    try {
      await store.recordDeliveryProviderMedia({ deliveryId: "del-1", providerMediaId: "FBVID1" });
    } catch (error) {
      threw = error;
    }
    check("a successful write does not throw", threw === null, threw?.message);
    const op = stub.__ops()[0];
    check("it writes the provider media id", op.payload.provider_media_id === "FBVID1");
    check(
      "and it too guards on in_flight",
      op.filters.some(([, c, v]) => c === "delivery_state" && v === "in_flight"),
    );

    // Zero rows: the claim is gone or taken over.
    stub.__load([noRow(), noRow()]);
    threw = null;
    try {
      await store.recordDeliveryProviderMedia({ deliveryId: "del-1", providerMediaId: "FBVID1" });
    } catch (error) {
      threw = error;
    }
    check("a zero-row write THROWS, stopping the publish", threw !== null);
    check(
      "and says nothing was published",
      /nothing was published/i.test(threw?.message ?? ""),
      threw?.message,
    );
    check("after retrying once", stub.__ops().length === 2, stub.__ops().length);

    // Transient error then success: the retry earns its keep.
    stub.__load([dbError("blip"), okRow({ id: "del-1" })]);
    threw = null;
    try {
      await store.recordDeliveryProviderMedia({ deliveryId: "del-1", providerMediaId: "FBVID1" });
    } catch (error) {
      threw = error;
    }
    check("a transient failure is retried and succeeds", threw === null, threw?.message);

    // An empty id is refused before any query.
    stub.__load([]);
    threw = null;
    try {
      await store.recordDeliveryProviderMedia({ deliveryId: "del-1", providerMediaId: "   " });
    } catch (error) {
      threw = error;
    }
    check("an empty provider media id throws rather than writing nothing", threw !== null);
    check("and makes no query at all", stub.__ops().length === 0, stub.__ops().length);
  }

  console.log("\nThe harness itself");
  {
    stub.__load([]);
    let threw = false;
    try {
      await store.settleDelivery({ deliveryId: "x", settlement: POSTED, nowIso: NOW });
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
    crashed.message,
  );
}

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} delivery store checks passed.`,
);
if (failures > 0) process.exit(1);
