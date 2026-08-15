/**
 * Regression test for the duplicate-publish guard.
 *
 * Altair OS has no test runner (AGENTS.md), so this follows the same
 * convention as `verify-agent-snapshot-contract.mjs`: a focused `.mjs` script
 * run with plain node, transpiling the one module under test with the
 * `typescript` devDependency already present. No new dependency, no build
 * step, no framework.
 *
 * ======================= THE DEFECT THIS GUARDS =======================
 * `loadFounderDraftForPublish` used to reject only `archived`. A post already
 * in `posted` therefore re-entered the Graph API publish path and created a
 * SECOND real Facebook/Instagram post. Reachable by double-clicking Publish,
 * by a browser retry on a slow response, or by a back-button resubmit.
 *
 * This asserts the pure status guard the action now delegates to. It performs
 * NO network call and NO publish — it cannot, by construction: it imports one
 * dependency-free types module and nothing else.
 *
 * Run: node scripts/verify-marketing-publish-guard.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const SOURCE = "shared/types/marketing-post.ts";

function loadModule() {
  const source = readFileSync(SOURCE, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const dir = mkdtempSync(join(tmpdir(), "marketing-post-"));
  const file = join(dir, "marketing-post.mjs");
  writeFileSync(file, outputText);
  return import(pathToFileURL(file).href);
}

let failures = 0;
let checks = 0;

function check(name, condition) {
  checks += 1;
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${name}`);
  }
}

const {
  isPublishableMarketingPostStatus: publishable,
  describeUnpublishableMarketingPostStatus: describe,
  MARKETING_POST_STATUS_OPTIONS,
  PUBLISHABLE_MARKETING_POST_STATUSES,
} = await loadModule();

console.log("\nDuplicate-publish guard");

// ---- the defect itself -------------------------------------------------
check("an already-posted post is NOT publishable", publishable("posted") === false);
check(
  "and says so in a way that names the duplicate risk",
  (describe("posted") ?? "").toLowerCase().includes("already been published"),
);

// ---- previously-correct behaviour is preserved -------------------------
check("archived is still rejected", publishable("archived") === false);
check(
  "archived keeps its original message",
  describe("archived") === "Archived posts cannot be published.",
);

// ---- legitimate drafts must still publish ------------------------------
check("draft is publishable", publishable("draft") === true);
check("ready is publishable", publishable("ready") === true);
check("scheduled is publishable", publishable("scheduled") === true);
check("failed is publishable (retry after a genuine failure)", publishable("failed") === true);
check("a publishable status yields no error message", describe("draft") === null);

// ---- fail-closed ------------------------------------------------------
// The guard is an allow-list. A status added to the union later must be
// unpublishable until someone deliberately lists it, rather than silently
// inheriting permission to hit the Graph API.
check(
  "an unknown future status is refused by default",
  publishable("some_future_status") === false && describe("some_future_status") !== null,
);

// ---- the allow-list matches the declared vocabulary --------------------
const declared = new Set(MARKETING_POST_STATUS_OPTIONS.map((option) => option.value));
const allowed = [...PUBLISHABLE_MARKETING_POST_STATUSES];
check(
  "every publishable status is a real declared status",
  allowed.every((status) => declared.has(status)),
);
check(
  "every declared status is classified one way or the other",
  [...declared].every(
    (status) => publishable(status) === true || typeof describe(status) === "string",
  ),
);
check(
  "posted and archived are the only declared statuses that are blocked",
  [...declared].filter((status) => !publishable(status)).sort().join(",") ===
    "archived,posted",
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} publish-guard checks passed.`,
);
if (failures > 0) process.exit(1);
