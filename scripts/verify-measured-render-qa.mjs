/**
 * Static verification of the MEASURED render-QA receiver (migration 198).
 *
 * ===================== WHAT THIS GUARDS =====================
 * One property, stated four ways: **an absent measurement is never shown as a
 * pass.**
 *
 * The agent platform measures every delivered master and records a
 * PASS / FAIL / UNEVALUATED verdict. Before this change that verdict had no
 * wire representation at all — the only QA word reaching a marketing card was
 * `quality_state`, a PROVENANCE classification whose top state
 * (`PRODUCTION_READY`) is structurally unreachable because the renderer emits
 * no `media.audible`. So the card either showed a constant or, in production,
 * showed nothing: `quality_state` is null on every live row.
 *
 * "Showed nothing" is the dangerous half. A founder looking at Today could not
 * tell "measured and clean" from "never measured", and the quiet version of
 * that confusion is what let a silent placeholder reach Instagram and a
 * -35.8 LUFS master reach a draft.
 *
 * ===================== WHY STATIC, NOT LIVE =====================
 * Same reason as `verify-marketing-migrations.mjs`: the only Supabase project
 * this checkout is linked to is hosted and may be production, so this asserts
 * properties of the SOURCE AND SQL themselves. No database, no network, no
 * credential; it runs anywhere and cannot touch anything.
 *
 * What it enforces:
 *   - the migration is additive, idempotent, non-destructive, bounded
 *   - UNEVALUATED survives as a VALUE, distinct from NULL
 *   - the route refuses to assemble a partial verdict
 *   - the row reader refuses to assemble a partial verdict
 *   - the card renders absence as words, not as blank space or a pass
 *
 * Run: node scripts/verify-measured-render-qa.mjs
 */
import { readFileSync } from "node:fs";

const MIGRATION = "supabase/migrations/198_marketing_post_measured_render_qa.sql";
const ROUTE = "app/api/agent/draft-posts/route.ts";
const QUERIES = "lib/database/queries/marketing-posts.ts";
const VIEW = "shared/components/marketing-hub/MarketingTodayView.tsx";
const TYPES = "shared/types/marketing-post.ts";

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

/** Comments are stripped so a check can never be satisfied by prose. */
function loadSql(path) {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .toLowerCase();
}

/**
 * Source is read WITH comments left in for the doc-block checks below, and
 * stripped for the behavioural ones — a rule about what the code does must
 * not be satisfiable by a sentence explaining that it does it.
 */
function loadSource(path) {
  return readFileSync(path, "utf8");
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
}

const sql = loadSql(MIGRATION);
const route = stripComments(loadSource(ROUTE));
const queries = stripComments(loadSource(QUERIES));
const view = stripComments(loadSource(VIEW));
const types = stripComments(loadSource(TYPES));

console.log("\nmigration 198 — shape");

check(
  "adds all four columns idempotently on marketing_posts",
  /alter\s+table\s+public\.marketing_posts\s+add\s+column\s+if\s+not\s+exists\s+render_qa_state\s+text/.test(
    sql,
  ) &&
    /add\s+column\s+if\s+not\s+exists\s+render_qa_policy\s+text/.test(sql) &&
    /add\s+column\s+if\s+not\s+exists\s+render_qa_summary\s+text/.test(sql) &&
    /add\s+column\s+if\s+not\s+exists\s+render_qa_advisories\s+jsonb/.test(sql),
);

check(
  "every column is nullable with no default — nothing is backfilled or guessed",
  !/render_qa_\w+[^,;]*\bnot\s+null\b/.test(sql) &&
    !/render_qa_\w+[^,;]*\bdefault\b/.test(sql),
);

check(
  "UNEVALUATED is an accepted VALUE, not collapsed into null",
  /render_qa_state\s+in\s*\(\s*'pass'\s*,\s*'fail'\s*,\s*'unevaluated'\s*\)/.test(
    sql,
  ),
);

check(
  "the state CHECK admits null (a post with no transported verdict is legal)",
  /render_qa_state\s+is\s+null\s*\n?\s*or\s+render_qa_state\s+in/.test(sql),
);

check(
  "constraints are drop-then-add, so re-running converges",
  (sql.match(/drop\s+constraint\s+if\s+exists\s+marketing_posts_render_qa/g) ?? [])
    .length >= 4,
);

check(
  "the advisory list is bounded — a malformed sender cannot park a blob on a row",
  /jsonb_typeof\s*\(\s*render_qa_advisories\s*\)\s*=\s*'array'/.test(sql) &&
    /jsonb_array_length\s*\(\s*render_qa_advisories\s*\)\s*<=\s*32/.test(sql),
);

check(
  "the text columns are length-bounded",
  /char_length\s*\(\s*render_qa_summary\s*\)\s*<=\s*1000/.test(sql) &&
    /char_length\s*\(\s*render_qa_policy\s*\)\s*<=\s*64/.test(sql),
);

check(
  "creates no table, no policy, and grants or revokes nothing — columns ride existing grants",
  !/create\s+table/.test(sql) &&
    !/create\s+policy/.test(sql) &&
    !/\bgrant\s+[\w,\s]+\s+on\s+/.test(sql) &&
    !/\brevoke\s+/.test(sql),
);

check(
  "contains no destructive statement (the constraint swaps are the only intended drops)",
  !/\b(drop\s+table|drop\s+schema|truncate|delete\s+from|drop\s+database|drop\s+column)\b/.test(
    sql,
  ),
);

check(
  "alters nothing about quality_state — the provenance verdict is a separate fact",
  // Mentions in a `comment on column` are fine and in fact wanted: the column
  // comment is where the two verdicts are told apart for whoever reads the
  // schema. What must not appear is DDL that touches 195's column.
  !/(add|drop|alter)\s+column[^;]*\bquality_state\b/.test(sql) &&
    !/constraint[^;]*\bquality_state\b[^;]*check/.test(
      sql.replace(/comment\s+on\s+column[^;]*;/g, ""),
    ),
);

console.log("\nroute — a malformed verdict is no verdict");

check(
  "accepts renderQa on the body",
  /renderQa\?:\s*unknown/.test(route) && /readRenderQa\(body\.renderQa\)/.test(route),
);

check(
  "mirrors the three states as a literal list",
  /RENDER_QA_STATES\s*=\s*\[\s*"PASS"\s*,\s*"FAIL"\s*,\s*"UNEVALUATED"\s*\]/.test(
    route,
  ),
);

check(
  "returns undefined for a non-object, rather than coercing one",
  /function\s+readRenderQa[\s\S]*?typeof\s+value\s*!==\s*"object"[\s\S]*?return\s+undefined;/.test(
    route,
  ),
);

check(
  "rejects an unrecognised state outright",
  /function\s+readRenderQa[\s\S]*?RENDER_QA_STATES\s+as\s+readonly\s+string\[\]\)\.includes\(raw\.state\)[\s\S]*?return\s+undefined;/.test(
    route,
  ),
);

check(
  "refuses a verdict missing its policy version — a state alone is not comparable",
  /function\s+readRenderQa[\s\S]*?!policyVersion[\s\S]*?return\s+undefined;/.test(
    route,
  ),
);

check(
  "refuses a verdict missing its summary",
  /function\s+readRenderQa[\s\S]*?!summary[\s\S]*?return\s+undefined;/.test(route),
);

check(
  "bounds the advisory list and each code it accepts",
  /advisories\.length\s*>=\s*MAX_RENDER_QA_ADVISORIES/.test(route) &&
    /MAX_RENDER_QA_ADVISORY_CODE_CHARS/.test(route),
);

check(
  "attaches the verdict only when it actually has one — never an explicit null",
  /\.\.\.\(renderQa\s*!==\s*undefined\s*\?\s*\{\s*renderQa\s*\}\s*:\s*\{\}\)/.test(
    route,
  ),
);

check(
  "keeps qualityState as its own separate field — the two verdicts do not merge",
  /readQualityState\(body\.qualityState\)/.test(route) &&
    /\.\.\.\(qualityState\s*!==\s*undefined/.test(route),
);

console.log("\nrow reader — all four, or none");

check(
  "reads the verdict as one object",
  /function\s+readRenderQaRow/.test(queries) &&
    /renderQa:\s*readRenderQaRow\(row\)/.test(queries),
);

check(
  "returns undefined unless the state is one of the three",
  /function\s+readRenderQaRow[\s\S]*?state\s*!==\s*"PASS"[\s\S]*?state\s*!==\s*"FAIL"[\s\S]*?state\s*!==\s*"UNEVALUATED"[\s\S]*?return\s+undefined;/.test(
    queries,
  ),
);

check(
  "returns undefined when policy or summary is missing — no partial PASS is assembled",
  /!row\.render_qa_policy\s*\|\|\s*!row\.render_qa_summary\)\s*return\s+undefined;/.test(
    queries,
  ),
);

check(
  "writes the four columns together or not at all",
  /\.\.\.\(input\.renderQa\s*!==\s*undefined[\s\S]{0,400}render_qa_state:[\s\S]{0,200}render_qa_policy:[\s\S]{0,200}render_qa_summary:[\s\S]{0,200}render_qa_advisories:/.test(
    queries,
  ),
);

check(
  "never UPDATEs the render_qa columns — insert-only, like migration 195's three",
  !/update\([\s\S]{0,600}render_qa_/i.test(queries),
);

console.log("\ntype — absence has a documented meaning");

check(
  "exports the three states and the verdict shape",
  /MEASURED_RENDER_QA_STATES\s*=\s*\[/.test(types) &&
    /export\s+type\s+MeasuredRenderQa\s*=/.test(types),
);

check(
  "renderQa is optional on MarketingPost",
  /renderQa\?:\s*MeasuredRenderQa;/.test(types),
);

console.log("\ncard — absence is words, not blank space");

check(
  "has a dedicated formatter for the measured verdict",
  /function\s+formatMeasuredRenderQa/.test(view),
);

check(
  'renders undefined as "Not measured", never as a pass',
  /function\s+formatMeasuredRenderQa[\s\S]*?if\s*\(!qa\)[\s\S]{0,200}label:\s*"Not measured"/.test(
    view,
  ),
);

check(
  "gives UNEVALUATED its own wording, distinct from FAIL",
  /qa\.state\s*===\s*"UNEVALUATED"[\s\S]{0,200}Could not be measured/.test(view) &&
    /qa\.state\s*===\s*"FAIL"[\s\S]{0,200}Failed/.test(view),
);

check(
  "surfaces advisories on a pass rather than swallowing them",
  /Passed with notes[\s\S]{0,80}qa\.advisories\.join/.test(view),
);

check(
  "the Render QA row is unconditional — it cannot be hidden by a missing value",
  /Render QA\s*<\/dt>\s*<dd\s+className=\{formatMeasuredRenderQa\(renderQa\)\.className\}/.test(
    view.replace(/\s+/g, " ").replace(/> </g, ">\n<").replace(/\n/g, "\n"),
  ) ||
    /Render QA[\s\S]{0,200}formatMeasuredRenderQa\(renderQa\)/.test(view),
);

check(
  "the provenance verdict was relabelled so it cannot borrow the measured one's authority",
  /Ingredients\s*<\/dt>/.test(view) &&
    /formatQualityState\(qualityState\)/.test(view),
);

check(
  "passes the verdict down from the post row",
  /renderQa=\{post\.renderQa\}/.test(view),
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} measured render-QA checks passed.`,
);
if (failures > 0) process.exit(1);
