/**
 * Proves Marketing → Today can tell three renders of the same Reel apart.
 *
 * The three ids below are real: they are the drafts sitting in Today right now,
 * two of which are superseded. If this script cannot pick the newest one out of
 * them, neither can the operator.
 *
 * Run: node scripts/verify-marketing-reel-identity.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "shared/types/marketing-reel.ts");
const js = ts.transpileModule(readFileSync(SOURCE, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { parseRenderJobId, markReelVersions } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);

let checks = 0;
const check = (label, fn) => { fn(); checks += 1; console.log(`  ok  ${label}`); };

/** The real drafts, newest last. */
const GOOD = "reel-altair-overview-hookB-20260823T202125Z-6f5a9bc4";
const OLD_A = "reel-altair-overview-hookB-20260823T164304Z-27d2b656";
const OLD_B = "reel-altair-overview-hookB-20260823T195033Z-e7b4d1e5";
const ALL = [OLD_A, OLD_B, GOOD];

console.log("\nparseRenderJobId");
check("reads the variation name back out, hyphens and all", () => {
  assert.equal(parseRenderJobId(GOOD).reelName, "altair-overview-hookB");
});
check("reads the render time back out as ISO", () => {
  assert.equal(parseRenderJobId(GOOD).renderedAt, "2026-08-23T20:21:25Z");
  assert.equal(parseRenderJobId(OLD_A).renderedAt, "2026-08-23T16:43:04Z");
  assert.equal(parseRenderJobId(OLD_B).renderedAt, "2026-08-23T19:50:33Z");
});
check("keeps the attempt suffix, which is what separates two same-second renders", () => {
  assert.equal(parseRenderJobId(GOOD).suffix, "6f5a9bc4");
});
check("a base reel with no variation still parses", () => {
  const id = parseRenderJobId("reel-altair-overview-20260823T034334Z-44c80193");
  assert.equal(id.reelName, "altair-overview");
});
check("the OLDER id schemes return null rather than a guessed name", () => {
  // These predate the reel- scheme and must not be grouped with anything.
  assert.equal(parseRenderJobId("render-art_29d08d78-9dbc-4db2-a9a7-78b15615e1d8-a8ba589eda5b"), null);
  assert.equal(parseRenderJobId("render-content-assets-3a4bb18adbe5e691-116e29fe3156"), null);
});
check("an impossible date is refused, not displayed", () => {
  assert.equal(parseRenderJobId("reel-x-20261340T202125Z-abcd1234"), null);
});
check("junk in, null out", () => {
  for (const bad of ["", "reel-", "reel-x-y", "not-a-job-id", null, undefined]) {
    assert.equal(parseRenderJobId(bad), null, JSON.stringify(bad));
  }
});

console.log("\nmarkReelVersions");
check("THE POINT — the newest of the three real drafts is the fixed one", () => {
  const marks = markReelVersions(ALL);
  assert.equal(marks.get(GOOD).isNewest, true, "the 20:21 render is newest");
  assert.equal(marks.get(OLD_A).isNewest, false);
  assert.equal(marks.get(OLD_B).isNewest, false);
});
check("each of them knows how many drafts it is competing with", () => {
  const marks = markReelVersions(ALL);
  for (const id of ALL) assert.equal(marks.get(id).siblingCount, 3);
});
check("input order does not decide the answer", () => {
  const forwards = markReelVersions(ALL);
  const backwards = markReelVersions([...ALL].reverse());
  for (const id of ALL) assert.equal(forwards.get(id).isNewest, backwards.get(id).isNewest);
});
check("a lone draft is newest but is not marked as competing", () => {
  const marks = markReelVersions([GOOD]);
  assert.equal(marks.get(GOOD).isNewest, true);
  assert.equal(marks.get(GOOD).siblingCount, 1);
});
check("a DIFFERENT reel is a different race — each has its own newest", () => {
  const other = "reel-altair-overview-20260823T034334Z-44c80193";
  const marks = markReelVersions([...ALL, other]);
  assert.equal(marks.get(other).isNewest, true, "it is the only altair-overview");
  assert.equal(marks.get(other).siblingCount, 1);
  assert.equal(marks.get(GOOD).isNewest, true, "and hookB still has its own winner");
});
check("the same id listed twice is one draft, not two versions", () => {
  const marks = markReelVersions([GOOD, GOOD, OLD_A]);
  assert.equal(marks.get(GOOD).siblingCount, 2);
});
check("same second, different attempt: the answer is stable, not arbitrary", () => {
  const a = "reel-x-20260823T202125Z-aaaaaaaa";
  const b = "reel-x-20260823T202125Z-bbbbbbbb";
  assert.equal(markReelVersions([a, b]).get(b).isNewest, true);
  assert.equal(markReelVersions([b, a]).get(b).isNewest, true);
});
check("an unparseable id gets NO mark rather than a fabricated one", () => {
  const marks = markReelVersions([GOOD, "render-art_29d08d78-x-y"]);
  assert.equal(marks.has("render-art_29d08d78-x-y"), false);
});
check("NOTHING IS HIDDEN — every parseable draft gets an entry", () => {
  // Marking must never be a filter: an old draft still renders, still shows,
  // and is still the operator's to keep or discard.
  const marks = markReelVersions(ALL);
  assert.equal(marks.size, 3);
});

console.log(`\n${checks} checks passed\n`);
