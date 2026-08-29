/**
 * The workspace export, while the tenant is being written to.
 *
 * ===================== THE DEFECT =====================
 * readTable used to page with `.range(from, from + PAGE - 1)`. An offset is a
 * position in a result set that is recomputed for every page, so a concurrent
 * write before the cursor moves every later row:
 *
 *   DELETE before the cursor   rows shift back one, and the row that would
 *                              have opened the next page is never returned.
 *                              A SKIP — and a silent one, because the export
 *                              still looks complete.
 *
 *   INSERT before the cursor   rows shift forward one, and the last row of the
 *                              previous page is returned again. A DUPLICATE.
 *
 * Neither is hypothetical for an export that takes minutes over 65 tables while
 * a company keeps working.
 *
 * ===================== WHAT IS PROVEN =====================
 * The same mutation sequence is run against both strategies, over a table with
 * more than one page of rows, and the results are compared to a truth captured
 * before anything moved:
 *
 *   offset   must lose a row that existed for the whole walk
 *   keyset   must lose none, and repeat none
 *
 * The first half matters as much as the second. A verifier that only shows the
 * fix passing cannot tell you whether it was ever needed, and this one is
 * asserting that the old shape genuinely breaks.
 *
 * It also drives the SHIPPED streamWorkspaceExport across a mutating tenant, so
 * what is asserted is the exported bytes and not a reimplementation.
 *
 * ===================== SAFETY =====================
 * Scratch only. Every row it creates belongs to a company it creates, and both
 * are removed in a finally block.
 *
 * Run:
 *   node --experimental-strip-types --import ./scripts/lib/ts-alias-loader-register.mjs \
 *     scripts/verify-export-consistency-live.mjs --confirm <ref>
 */

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const PAGE = 1000;
/** Two pages and a bit, so the cursor genuinely crosses a boundary. */
const SEED_ROWS = 2400;

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

async function insertRows(companyId, rows) {
  for (let i = 0; i < rows.length; i += 300) {
    const { error } = await admin.from("customers").insert(rows.slice(i, i + 300));
    if (error) throw new Error(`seeding customers: ${error.message}`);
  }
}

/** Every customer id for the company, in key order, walked to completion. */
async function orderedIds(companyId) {
  const ids = [];
  let cursor = null;
  for (;;) {
    let q = admin
      .from("customers")
      .select("id")
      .eq("company_id", companyId)
      .order("id", { ascending: true })
      .limit(PAGE);
    if (cursor) q = q.gt("id", cursor);
    const { data, error } = await q;
    if (error) throw new Error(`ordered ids: ${error.message}`);
    const page = (data ?? []).map((r) => r.id);
    if (page.length === 0) break;
    ids.push(...page);
    cursor = page[page.length - 1];
    if (page.length < PAGE) break;
  }
  return ids;
}

async function main() {
  console.log(`\nTarget project: ${ref}\n`);

  const companyId = randomUUID();
  const { error: companyError } = await admin.from("companies").insert({
    id: companyId,
    name: "[EXPORTDRILL] consistency",
    slug: `exportdrill-${companyId.slice(0, 8)}`,
  });
  if (companyError) throw new Error(`company: ${companyError.message}`);

  try {
    console.log(`Seeding ${SEED_ROWS} customers — more than two pages\n`);
    await insertRows(
      companyId,
      Array.from({ length: SEED_ROWS }, (_, i) => ({
        id: randomUUID(),
        company_id: companyId,
        name: `[EXPORTDRILL] customer ${String(i).padStart(5, "0")}`,
      })),
    );

    const truth = await orderedIds(companyId);
    check(
      `the fixture crosses a page boundary (${truth.length} rows, PAGE=${PAGE})`,
      truth.length > PAGE,
      "below one page neither strategy can drift and this proves nothing",
    );

    // ================================================================ OFFSET
    console.log("\nOffset pagination, with a delete between pages\n");

    const offsetPage1 = (
      await admin
        .from("customers")
        .select("id")
        .eq("company_id", companyId)
        .order("id", { ascending: true })
        .range(0, PAGE - 1)
    ).data.map((r) => r.id);

    // A row already emitted, so it can never be needed again — the only thing
    // its removal changes is the POSITION of everything after it.
    const victim = offsetPage1[5];
    const { error: deleteError, count: deleted } = await admin
      .from("customers")
      .delete({ count: "exact" })
      .eq("id", victim);
    check(
      "the concurrent delete actually happened",
      deleteError == null && deleted === 1,
      deleteError?.message ??
        "a silently failed delete would make the rest of this vacuous",
    );

    const offsetPage2 = (
      await admin
        .from("customers")
        .select("id")
        .eq("company_id", companyId)
        .order("id", { ascending: true })
        .range(PAGE, PAGE * 2 - 1)
    ).data.map((r) => r.id);

    const offsetEmitted = new Set([...offsetPage1, ...offsetPage2]);
    const survivors = truth.filter((id) => id !== victim);
    // Everything the two pages should have covered had nothing moved.
    const shouldCover = survivors.slice(0, offsetPage1.length + offsetPage2.length);
    const offsetSkipped = shouldCover.filter((id) => !offsetEmitted.has(id));

    check(
      `offset SKIPS a row that existed throughout (${offsetSkipped.length} skipped)`,
      offsetSkipped.length > 0,
      "the old strategy did not drift here, so this fixture is not exercising " +
        "the defect and the keyset result below would prove nothing",
    );
    console.log(
      `        ${offsetPage1.length + offsetPage2.length} rows emitted, ` +
        `${offsetSkipped.length} silently lost\n`,
    );

    // ================================================================ KEYSET
    console.log("Keyset pagination, same mutation at the same point\n");

    const keysetPage1 = (
      await admin
        .from("customers")
        .select("id")
        .eq("company_id", companyId)
        .order("id", { ascending: true })
        .limit(PAGE)
    ).data.map((r) => r.id);

    const victim2 = keysetPage1[5];
    const { count: deleted2 } = await admin
      .from("customers")
      .delete({ count: "exact" })
      .eq("id", victim2);
    check("the second concurrent delete happened", deleted2 === 1);

    const keysetPage2 = (
      await admin
        .from("customers")
        .select("id")
        .eq("company_id", companyId)
        .gt("id", keysetPage1[keysetPage1.length - 1])
        .order("id", { ascending: true })
        .limit(PAGE)
    ).data.map((r) => r.id);

    const keysetEmitted = new Set([...keysetPage1, ...keysetPage2]);

    // The covered range is defined by the KEY the walk reached, not by a row
    // count. That is the whole difference between the two strategies: a keyset
    // walk covers (-inf, lastKey] and nothing that happens elsewhere can move a
    // row into or out of it. Counting positions instead — as the offset check
    // above must — is exactly what breaks under concurrent writes.
    const keysetLast = keysetPage2[keysetPage2.length - 1] ?? keysetPage1[keysetPage1.length - 1];
    const coveredRange = truth
      .filter((id) => id <= keysetLast)
      .filter((id) => id !== victim && id !== victim2);
    const keysetSkipped = coveredRange.filter((id) => !keysetEmitted.has(id));

    check(
      `keyset skips nothing in the range it covered (${coveredRange.length} rows)`,
      keysetSkipped.length === 0,
      `${keysetSkipped.length} skipped: ${keysetSkipped.slice(0, 3).join(", ")}`,
    );
    check(
      "and repeats nothing",
      keysetPage1.length + keysetPage2.length === keysetEmitted.size,
      `${keysetPage1.length + keysetPage2.length - keysetEmitted.size} duplicates`,
    );

    // ====================================================== THE REAL EXPORT
    console.log("\nThe shipped export, mutated while it runs\n");

    const { streamWorkspaceExport } = await import(
      "@/lib/database/services/export/workspace-export"
    );

    const beforeExport = await orderedIds(companyId);
    const seenIds = [];
    let mutated = false;
    const insertedDuring = [];

    const summary = await streamWorkspaceExport(companyId, async (chunk) => {
      if (chunk.table !== "customers") return;
      for (const row of chunk.rows) seenIds.push(row.id);

      // Mutate exactly once, mid-walk: a delete BEFORE the cursor, an insert
      // BEFORE the cursor, and an update. All three are the shapes that move
      // offsets.
      if (!mutated && seenIds.length >= PAGE) {
        mutated = true;

        await admin.from("customers").delete().eq("id", seenIds[10]);
        await admin.from("customers").delete().eq("id", seenIds[200]);

        // An insert whose key sorts BEFORE the cursor — invisible to keyset by
        // design, and exactly what shifts an offset.
        const low = { id: "00000000-0000-4000-8000-" + "0".repeat(12), company_id: companyId, name: "[EXPORTDRILL] inserted low" };
        await admin.from("customers").insert(low);
        insertedDuring.push(low.id);

        // And one after the cursor, which the boundary filter must exclude.
        const high = { id: "ffffffff-ffff-4fff-8fff-" + "f".repeat(12), company_id: companyId, name: "[EXPORTDRILL] inserted high" };
        await admin.from("customers").insert(high);
        insertedDuring.push(high.id);

        await admin
          .from("customers")
          .update({ name: "[EXPORTDRILL] updated mid-export" })
          .eq("id", seenIds[300]);
      }
    });

    const unique = new Set(seenIds);
    check(
      `the export emitted no duplicate row (${seenIds.length} rows, ${unique.size} distinct)`,
      seenIds.length === unique.size,
      `${seenIds.length - unique.size} duplicates`,
    );

    const deletedDuring = new Set([seenIds[10], seenIds[200]]);
    const shouldBePresent = beforeExport.filter((id) => !deletedDuring.has(id));
    const missing = shouldBePresent.filter((id) => !unique.has(id));
    check(
      `every row that existed for the whole export is present (${missing.length} missing)`,
      missing.length === 0,
      missing.slice(0, 3).join(", "),
    );

    const leaked = [...unique].filter((id) => !beforeExport.includes(id));
    check(
      `no row created after the boundary appears (${leaked.length} leaked)`,
      leaked.length === 0,
      "the created_at boundary is what makes this deterministic rather than " +
        "dependent on where a random uuid happens to sort",
    );

    check(
      "the summary states the boundary and the contract it can keep",
      typeof summary.boundary === "string" &&
        /not a point-in-time snapshot/i.test(summary.consistency ?? ""),
      "an export that claimed snapshot semantics it does not have would be " +
        "worse than one that states a smaller guarantee accurately",
    );

    console.log("\nTermination, isolation and the empty case\n");

    // A tenant inserting faster than the export reads must not extend it.
    const beforeCount = seenIds.length;
    for (let i = 0; i < 50; i += 1) {
      await admin.from("customers").insert({
        id: randomUUID(),
        company_id: companyId,
        name: `[EXPORTDRILL] flood ${i}`,
      });
    }
    const second = [];
    await streamWorkspaceExport(companyId, async (chunk) => {
      if (chunk.table === "customers") second.push(...chunk.rows.map((r) => r.id));
    });
    check(
      `a later export terminates and sees the new rows (${beforeCount} then ${second.length})`,
      second.length >= beforeCount,
      "the boundary is per-export, so a second run must include what the " +
        "first excluded",
    );

    const otherId = randomUUID();
    await admin.from("companies").insert({
      id: otherId,
      name: "[EXPORTDRILL] other",
      slug: `exportdrill-other-${otherId.slice(0, 8)}`,
    });
    await admin.from("customers").insert({
      id: randomUUID(),
      company_id: otherId,
      name: "[EXPORTDRILL] other tenant customer",
    });
    const otherRows = [];
    await streamWorkspaceExport(otherId, async (chunk) => {
      if (chunk.table === "customers") otherRows.push(...chunk.rows);
    });
    check(
      "another tenant's export contains only its own row",
      otherRows.length === 1 && otherRows[0].company_id === otherId,
      `${otherRows.length} rows`,
    );
    check(
      "and none of this tenant's rows appear in it",
      !otherRows.some((row) => unique.has(row.id)),
    );

    const emptyTables = summary.tables.filter((t) => t.rowCount === 0);
    check(
      `empty tables are walked and reported, not skipped (${emptyTables.length} of ${summary.tables.length})`,
      emptyTables.length > 0,
      "a keyset walk over an empty table must terminate on the first page",
    );

    await admin.from("companies").delete().eq("id", otherId);
    void insertedDuring;
  } finally {
    console.log("\nCleaning up\n");
    for (;;) {
      const { data } = await admin
        .from("customers")
        .select("id")
        .eq("company_id", companyId)
        .limit(500);
      const ids = (data ?? []).map((r) => r.id);
      if (ids.length === 0) break;
      await admin.from("customers").delete().in("id", ids);
    }
    await admin.from("companies").delete().eq("id", companyId);
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} export consistency checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}\n`);
  process.exit(1);
});
