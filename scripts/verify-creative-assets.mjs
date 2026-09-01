/**
 * Focused tests for the creative asset-source foundation.
 *
 * ===================== WHAT THIS PROTECTS =====================
 * Three properties, each of which fails silently if nobody watches it:
 *
 *   1. Higgsfield is a SOURCE. Nothing in the creative module may treat it as
 *      somewhere content is delivered. The failure mode is a UI offering
 *      "Publish to Higgsfield" and a publish path that half-works.
 *
 *   2. `quality_score` is nullable with no default. A `not null default 0`
 *      would make every unreviewed candidate read as reviewed and worthless,
 *      and nothing downstream could ever tell the difference — a defaulted 0
 *      is indistinguishable from a human's judgement.
 *
 *   3. Promotion into the approved library requires an explicit human review.
 *      This is asserted by brute force over every combination of candidate
 *      facts rather than by a handful of examples, because the dangerous case
 *      is the combination nobody thought to write a test for.
 *
 * Purely static: it reads the TypeScript module and the SQL from disk. No
 * database, no credentials, no network, and it cannot generate or publish
 * anything.
 *
 * Run: node scripts/verify-creative-assets.mjs
 */
import { readFileSync } from "node:fs";
import { loadPureModule } from "./lib/load-pure-module.mjs";

const MODULE_PATH = "shared/types/creative-asset.ts";
const MIGRATION_PATH = "supabase/migrations/185_creative_asset_generation.sql";

let failures = 0;
let checks = 0;
function check(name, condition, detail) {
  checks += 1;
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}`, detail ?? "");
  }
}

const creative = await loadPureModule(MODULE_PATH, "creative");
const channels = await loadPureModule(
  "shared/types/marketing-channel-connection.ts",
  "creative-chan",
);

const source = readFileSync(MODULE_PATH, "utf8");

/** Comments stripped and lowercased, so prose can never satisfy a check. */
const sql = readFileSync(MIGRATION_PATH, "utf8")
  .replace(/--[^\n]*/g, "")
  .toLowerCase();

/**
 * The DDL alone. `comment on` bodies are prose that legitimately explains what
 * this table is NOT ("not a publishing ledger"), and prose must never be able
 * to satisfy — or fail — a structural check. Every `comment on` in this
 * migration sits after the last statement, so the split is exact.
 */
const ddl = sql.split(/\bcomment\s+on\b/)[0];

/* ============================================ a source, never a destination */

console.log("\nHiggsfield is an asset source, never a publish target");

check(
  "the asset-source list is derived and currently names exactly higgsfield",
  creative.CREATIVE_ASSET_SOURCE_PROVIDERS.join(",") === "higgsfield",
  creative.CREATIVE_ASSET_SOURCE_PROVIDERS,
);
check(
  "no asset source appears among the publish channels",
  creative.CREATIVE_ASSET_SOURCE_PROVIDERS.every(
    (provider) => !channels.MARKETING_PUBLISH_CHANNELS.includes(provider),
  ),
);
check(
  "a generation may be requested from higgsfield",
  creative.mayRequestGenerationFrom("higgsfield") === true,
);
check(
  "no publisher may be asked to generate",
  channels.MARKETING_PUBLISH_CHANNELS.every(
    (provider) => creative.mayRequestGenerationFrom(provider) === false,
  ),
);
check(
  "the first-party surface is not a generation source either",
  creative.mayRequestGenerationFrom("altair_site") === false,
);

// The absence IS the mechanism: there is no function in the module that hands
// an asset source content, so "publish to Higgsfield" is unwritten rather than
// merely disabled. An exported name containing "publish" would be the first
// sign that changed.
//
// ================== WHY THE GRAMMAR HERE IS THE WHOLE GRAMMAR ==================
// A pattern that knows only `export const|function|type|class|enum` reads
// straight past `export async function publishCandidateToHiggsfield`, past
// `export interface PublishToHiggsfieldRequest`, and past
// `export { x as publishGate }` — the last of which is the form THIS module
// already uses to re-export `clampCreativeDetail`. A scanner blind to the
// syntax the file is written in reports "no publish exports" for a module full
// of them, and the failure is silent in the direction that matters.

/** Every identifier the module publishes to the outside world. */
function exportedIdentifiers(text) {
  // Declaration forms. The modifier group repeats because `default`,
  // `declare`, `abstract` and `async` stack in front of the keyword.
  const declarations = [
    ...text.matchAll(
      /\bexport\s+(?:(?:default|declare|abstract|async)\s+)*(?:const|let|var|function|type|class|enum|interface|namespace)\b\s*\*?\s*(\w+)/g,
    ),
  ].map((m) => m[1]);

  // Clause forms: `export { a, b as c }` and `export type { d as e }`.
  // BOTH sides of `as` are collected. The alias is what an importer sees, and
  // the local name is what the thing actually is — re-exporting a publish
  // concept under an innocent alias is exactly the smuggling this forbids.
  const clauses = [...text.matchAll(/\bexport\s*(?:type\s+)?\{([^}]*)\}/g)]
    .flatMap((m) => m[1].split(","))
    .flatMap((entry) => entry.split(/\bas\b/))
    .map((part) => part.replace(/\btype\b/g, "").trim())
    .filter((part) => /^\w+$/.test(part));

  return [...declarations, ...clauses];
}

// The scanner is itself tested, because its failure mode is SILENCE: a pattern
// that matches nothing reports a clean module just as cheerfully as a clean
// module does. This fixture is not the module — it is every export form the
// module is allowed to grow into, so narrowing the pattern again breaks here
// rather than quietly going green.
const GRAMMAR_FIXTURE = `
export const alpha = 1;
export let bravo = 2;
export var charlie = 3;
export function delta() {}
export async function echo() {}
export function* foxtrot() {}
export type Golf = string;
export interface Hotel { a: string }
export class India {}
export abstract class Juliett {}
export enum Kilo { A }
export declare const Lima: string;
export default function mike() {}
export { november, oscar as papa };
export type { quebec as romeo };
`;
const fixtureNames = exportedIdentifiers(GRAMMAR_FIXTURE);
const missedForms = [
  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "Golf", "Hotel",
  "India", "Juliett", "Kilo", "Lima", "mike", "november", "oscar", "papa",
  "quebec", "romeo",
].filter((name) => !fixtureNames.includes(name));
check(
  "the export scanner reads every export form, not the convenient half",
  missedForms.length === 0,
  `missed: ${missedForms}`,
);

const exportedNames = exportedIdentifiers(source);
check(
  "the module exports something",
  exportedNames.length > 0,
  exportedNames.length,
);
// Proof against the real file that the clause scanner runs at all: this module
// re-exports the delivery clamp under an alias, and both sides must be seen.
check(
  "the scanner sees the aliased re-export the module itself is written with",
  exportedNames.includes("clampCreativeDetail") &&
    exportedNames.includes("clampFailureDetail"),
  exportedNames,
);
check(
  "no exported identifier names a publish concept",
  exportedNames.every((name) => !/publish/i.test(name)),
  exportedNames.filter((name) => /publish/i.test(name)),
);
// `export *` republishes names this file never wrote, and a default export is
// imported under whatever name the caller likes. Either one makes the list
// above a claim about a set that is not the real exported set, which would
// hollow out the check that rests on it.
check(
  "the export surface is enumerable — no star re-export, no default export",
  !/\bexport\s*\*/.test(source) && !/\bexport\s+default\b/.test(source),
);
check(
  "no column, constraint or policy in the migration names a publishing concept",
  !/provider_post_id|provider_permalink|delivery_state|publish/.test(ddl),
);

console.log("\nThe module is pure");
const specifiers = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
  (m) => m[1],
);
check(
  "every import is a relative sibling — no package, no @/ alias, no server-only",
  specifiers.length > 0 && specifiers.every((s) => s.startsWith("./")),
  specifiers,
);
check(
  "reuses the delivery ledger's clamp rather than growing a second one",
  typeof creative.clampCreativeDetail === "function" &&
    creative.CREATIVE_DETAIL_MAX === 1000,
);

/* ================================================= vocabularies match SQL */

console.log("\nState vocabularies mirror the SQL CHECKs exactly");

/** Pull the labels out of a named `check (<column> in (...))` constraint. */
function labelsFromCheck(constraintName, column) {
  const pattern = new RegExp(
    `${constraintName}\\s+check\\s*\\(\\s*${column}\\s+in\\s*\\(([^)]*)\\)`,
  );
  const body = sql.match(pattern)?.[1];
  return body ? [...body.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]) : null;
}

const sqlRequestStates = labelsFromCheck(
  "creative_generation_requests_state_check",
  "request_state",
);
check(
  "the request_state CHECK is present and parseable",
  Array.isArray(sqlRequestStates) && sqlRequestStates.length > 0,
);
check(
  "CREATIVE_REQUEST_STATES equals the request_state CHECK, label for label",
  (sqlRequestStates ?? []).join(",") ===
    creative.CREATIVE_REQUEST_STATES.join(","),
  `sql=${sqlRequestStates} ts=${creative.CREATIVE_REQUEST_STATES}`,
);

const sqlQualityStates = labelsFromCheck(
  "creative_generation_candidates_quality_state_check",
  "quality_state",
);
check(
  "the quality_state CHECK is present and parseable",
  Array.isArray(sqlQualityStates) && sqlQualityStates.length > 0,
);
check(
  "CREATIVE_QUALITY_STATES equals the quality_state CHECK, label for label",
  (sqlQualityStates ?? []).join(",") ===
    creative.CREATIVE_QUALITY_STATES.join(","),
  `sql=${sqlQualityStates} ts=${creative.CREATIVE_QUALITY_STATES}`,
);
check(
  "every terminal request state is a real request state",
  creative.CREATIVE_TERMINAL_REQUEST_STATES.every((state) =>
    creative.CREATIVE_REQUEST_STATES.includes(state),
  ),
);
check(
  "queued and generating are not terminal",
  !creative.isTerminalRequestState("queued") &&
    !creative.isTerminalRequestState("generating") &&
    creative.isTerminalRequestState("complete"),
);

// The source_kind shape check is mirrored the same way: a token, never prose.
check(
  "the source_kind shape CHECK is in the migration",
  /source_kind\s*~\s*'\^\[a-z\]\[a-z0-9_\]\*\$'/.test(sql),
);
check(
  "isCreativeSourceKind accepts a token and refuses prose, empties and overlong",
  creative.isCreativeSourceKind("director_brief") === true &&
    creative.isCreativeSourceKind("Director Brief") === false &&
    creative.isCreativeSourceKind("") === false &&
    creative.isCreativeSourceKind("a".repeat(65)) === false,
);

/* ================================================ the unscored-score column */

console.log("\nquality_score is nullable with no default");

/** The raw column declaration for `name`, as written in the create table. */
function columnDeclaration(name) {
  return sql.match(new RegExp(`^[ \\t]*${name}\\s+([^\\n]*)$`, "m"))?.[1] ?? "";
}

const scoreDecl = columnDeclaration("quality_score");
check("quality_score is declared", scoreDecl.includes("numeric"), scoreDecl);
check(
  "quality_score is NOT NULL-constrained nowhere — an unreviewed candidate has no score",
  !/not\s+null/.test(scoreDecl),
  scoreDecl,
);
check(
  "quality_score has NO DEFAULT — a defaulted 0 would read as reviewed and terrible",
  !/default/.test(scoreDecl),
  scoreDecl,
);
check(
  "the score is range-checked to [0,1] only when present",
  /quality_score\s+is\s+null\s+or\s*\(\s*quality_score\s*>=\s*0\s+and\s+quality_score\s*<=\s*1\s*\)/.test(
    sql,
  ),
);
check(
  "a pending_review candidate cannot carry a score at all",
  /quality_score\s+is\s+null\s+or\s+quality_state\s*<>\s*'pending_review'/.test(
    sql,
  ),
);
check(
  "the TypeScript range helper agrees with the CHECK",
  creative.isQualityScoreInRange(0) &&
    creative.isQualityScoreInRange(1) &&
    !creative.isQualityScoreInRange(-0.01) &&
    !creative.isQualityScoreInRange(1.01),
);

console.log("\nCost is recorded, never fabricated");
for (const column of ["cost_credits", "cost_usd"]) {
  const decl = columnDeclaration(column);
  check(`${column} is nullable`, decl.includes("numeric") && !/not\s+null/.test(decl), decl);
  check(`${column} has no default — unknown must not become zero`, !/default/.test(decl), decl);
}
check(
  "a cost the provider never reported is not zero",
  creative.hasReportedCost({ credits: null, usd: null }) === false &&
    creative.hasReportedCost({ credits: 0, usd: null }) === true,
);
const unreported = creative.describeGenerationCost({ credits: null, usd: null });
check(
  "unreported cost says so instead of showing a number",
  unreported.toLowerCase().includes("not reported") && !/\d/.test(unreported),
  unreported,
);
check(
  "a reported cost is shown as reported",
  creative.describeGenerationCost({ credits: 12, usd: null }).includes("12"),
);

/* ====================================================== the promotion gate */

console.log("\nPromotion requires an explicit human review");

const REVIEWED_AT = "2026-08-31T12:00:00.000Z";
const candidate = (over = {}) => ({
  qualityState: "approved",
  qualityScore: 0.9,
  mediaAssetId: "asset-1",
  reviewedBy: "profile-1",
  reviewedAt: REVIEWED_AT,
  rejectionReason: null,
  ...over,
});
const decide = (over = {}, requestState = "complete") =>
  creative.decideCandidatePromotion(candidate(over), requestState);

check("a fully reviewed, stored candidate promotes", decide() === "PROMOTE");
check(
  "an unreviewed candidate never promotes",
  decide({ qualityState: "pending_review", qualityScore: null }) ===
    "AWAITING_REVIEW",
);
check(
  "a rejected candidate never promotes",
  decide({ qualityState: "rejected", rejectionReason: "blurry" }) === "REJECTED",
);
check(
  "approved with no reviewer is an approval with no author",
  decide({ reviewedBy: null }) === "REVIEW_INCOMPLETE",
);
check(
  "approved with no review timestamp is equally incomplete",
  decide({ reviewedAt: null }) === "REVIEW_INCOMPLETE",
);
check(
  "approved with no score does not promote",
  decide({ qualityScore: null }) === "UNSCORED",
);
check(
  "an out-of-range score is treated as no score, not as a value",
  decide({ qualityScore: 7 }) === "UNSCORED",
);
check(
  "bytes that never landed cannot be promoted",
  decide({ mediaAssetId: null }) === "MEDIA_MISSING",
);

// The media check and the review states are not simply ordered — which one
// answers depends on the state, because "the file is missing" means "wait for
// the transfer" in two states and means nothing at all in the third.
check(
  "a rejection outranks a missing transfer — no transfer is coming for a rejected candidate",
  decide({
    qualityState: "rejected",
    mediaAssetId: null,
    rejectionReason: "blurry",
  }) === "REJECTED",
);
check(
  "and the rejection still hands the operator the reviewer's reason, not a transfer notice",
  creative
    .describeCandidatePromotion(
      decide({
        qualityState: "rejected",
        mediaAssetId: null,
        rejectionReason: "blurry",
      }),
      candidate({ qualityState: "rejected", mediaAssetId: null, rejectionReason: "blurry" }),
    )
    .includes("blurry"),
);
check(
  "an unreviewed candidate whose bytes are still coming is told about the transfer",
  decide({
    qualityState: "pending_review",
    qualityScore: null,
    mediaAssetId: null,
  }) === "MEDIA_MISSING",
);
check(
  "a candidate of an unfinished generation cannot be promoted",
  creative.CREATIVE_REQUEST_STATES.filter(
    (state) => decide({}, state) !== "PROMOTE",
  ).join(",") === "queued,generating,failed,cancelled",
);
// The reviewer's yes governs, not the number: a threshold here would be the
// learning system deciding, and the learning system does not exist yet.
check(
  "an explicitly approved candidate scored 0 still promotes — no threshold is applied",
  decide({ qualityScore: 0 }) === "PROMOTE",
);

/* ------------------------------------------ states the union does not contain */

// These facts come off a database row, and TypeScript cannot narrow a row. An
// older deployment reading a table a newer migration widened, a hand-edited
// row, a backfill — any of them puts a label here that this build has never
// heard of. Such a label matches no case in the gate's switch, and a switch
// with no terminal branch lets it fall THROUGH into the reviewer and score
// checks, all of which an otherwise-perfect row passes. The gate then returns
// PROMOTE for a state nobody defined. Fail-open, in the one function whose
// entire job is that nothing enters the library without a human.
console.log("\nAn unrecognised quality state fails closed");
const OFF_UNION_QUALITY_STATES = [
  "quarantined",
  "auto_approved",
  "APPROVED",
  "approved ",
  "",
  null,
  undefined,
  7,
];
const offUnionLeaks = OFF_UNION_QUALITY_STATES.filter(
  (state) => decide({ qualityState: state }) !== "UNRECOGNISED_STATE",
);
check(
  "every unrecognised quality state resolves to UNRECOGNISED_STATE, not to a review outcome",
  offUnionLeaks.length === 0,
  offUnionLeaks.map((s) => `${String(s)} -> ${decide({ qualityState: s })}`),
);
check(
  "and none of them may be promoted, on an otherwise fully approvable row",
  OFF_UNION_QUALITY_STATES.every(
    (state) => !creative.mayPromoteCandidate(decide({ qualityState: state })),
  ),
);
check(
  "the operator is told, rather than shown a blank card",
  OFF_UNION_QUALITY_STATES.every((state) => {
    const text = creative.describeCandidatePromotion(
      decide({ qualityState: state }),
      candidate({ qualityState: state }),
    );
    return typeof text === "string" && text.length > 0;
  }),
);
// The same hole on the copy side: a switch with no terminal branch returns
// `undefined` from a function declared to return `string`, and `undefined`
// renders as an empty card, which reads as "nothing is wrong here".
check(
  "an unrecognised DECISION also gets a sentence, not undefined",
  ["NOT_A_DECISION", "", null, undefined].every((decision) => {
    const text = creative.describeCandidatePromotion(decision, candidate());
    return typeof text === "string" && text.length > 0;
  }),
);

// Brute force. The dangerous case is the combination nobody wrote a test for.
console.log("\nNo combination promotes without a human");
let promoted = 0;
let leaked = 0;
// Deliberately wider than the declared union, for the reason above: the row is
// the real source of this value, and the row is not type-checked.
const BRUTE_QUALITY_STATES = [
  ...creative.CREATIVE_QUALITY_STATES,
  "quarantined",
  "APPROVED",
  "",
  null,
];
for (const qualityState of BRUTE_QUALITY_STATES) {
  for (const qualityScore of [null, 0, 0.5, 1, 1.5, -1]) {
    for (const mediaAssetId of [null, "asset-1"]) {
      for (const reviewedBy of [null, "profile-1"]) {
        for (const reviewedAt of [null, REVIEWED_AT]) {
          for (const requestState of creative.CREATIVE_REQUEST_STATES) {
            const facts = {
              qualityState,
              qualityScore,
              mediaAssetId,
              reviewedBy,
              reviewedAt,
              rejectionReason: null,
            };
            const decision = creative.decideCandidatePromotion(
              facts,
              requestState,
            );
            if (!creative.mayPromoteCandidate(decision)) continue;
            promoted += 1;
            const legitimate =
              requestState === "complete" &&
              qualityState === "approved" &&
              mediaAssetId !== null &&
              reviewedBy !== null &&
              reviewedAt !== null &&
              qualityScore !== null &&
              creative.isQualityScoreInRange(qualityScore);
            if (!legitimate) leaked += 1;
          }
        }
      }
    }
  }
}
check("some combination does promote (the gate is not simply closed)", promoted > 0);
check(
  "every promoted combination has a complete request, stored bytes, a named reviewer and a valid score",
  leaked === 0,
  `${leaked} illegitimate promotion(s)`,
);

console.log("\nDecision surface");
check(
  "only PROMOTE may enter the library",
  creative.CANDIDATE_PROMOTION_DECISIONS.filter((d) =>
    creative.mayPromoteCandidate(d),
  ).join(",") === "PROMOTE",
);
check(
  "every non-promoting decision has operator copy",
  creative.CANDIDATE_PROMOTION_DECISIONS.filter(
    (d) => d !== "PROMOTE",
  ).every((d) => {
    const text = creative.describeCandidatePromotion(d, candidate());
    return typeof text === "string" && text.length > 0;
  }),
);
check(
  "a rejection quotes the reviewer's own reason",
  creative
    .describeCandidatePromotion(
      "REJECTED",
      candidate({ qualityState: "rejected", rejectionReason: "hands are wrong" }),
    )
    .includes("hands are wrong"),
);

/* ====================================================== migration posture */

console.log("\nMigration 185: tenancy, RLS and grants");

for (const table of [
  "creative_generation_requests",
  "creative_generation_candidates",
]) {
  check(
    `${table}: company-scoped with a cascading FK`,
    new RegExp(
      `company_id\\s+uuid\\s+not\\s+null\\s+references\\s+public\\.companies\\s*\\(\\s*id\\s*\\)\\s+on\\s+delete\\s+cascade`,
    ).test(sql.split(`create table if not exists public.${table}`)[1] ?? ""),
  );
  check(
    `${table}: row level security is enabled`,
    new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`).test(sql),
  );
  check(
    `${table}: the dispatcher SELECT policy checks membership AND dispatch`,
    new RegExp(
      `on\\s+public\\.${table}\\s+for\\s+select[\\s\\S]*?is_active_company_member\\(company_id\\)[\\s\\S]*?can_dispatch_jobs\\(company_id\\)`,
    ).test(sql),
  );
  // RLS narrows an existing privilege; it does not create one. A SELECT policy
  // without the GRANT is silently inert — the trap 143 documents at 147-151.
  check(
    `${table}: grants select to authenticated (RLS narrows, it does not grant)`,
    new RegExp(`grant\\s+select\\s+on\\s+table\\s+public\\.${table}\\s+to\\s+authenticated`).test(sql),
  );
  check(
    `${table}: revokes writes from authenticated`,
    new RegExp(
      `revoke\\s+insert,\\s*update,\\s*delete\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+authenticated`,
    ).test(sql),
  );
  check(
    `${table}: revokes everything from anon`,
    new RegExp(`revoke\\s+all\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+anon`).test(sql),
  );
  check(
    `${table}: grants all to service_role`,
    new RegExp(`grant\\s+all\\s+on\\s+table\\s+public\\.${table}\\s+to\\s+service_role`).test(sql),
  );
  check(
    `${table}: the updated_at trigger is dropped before it is created`,
    new RegExp(
      `drop\\s+trigger\\s+if\\s+exists\\s+${table}_set_updated_at[\\s\\S]*?create\\s+trigger\\s+${table}_set_updated_at[\\s\\S]*?execute\\s+function\\s+public\\.set_updated_at\\(\\)`,
    ).test(sql),
  );
}

console.log("\nMigration 185: keys");
check(
  "a provider job registers exactly once per company",
  /create\s+unique\s+index\s+if\s+not\s+exists\s+creative_generation_requests_provider_job_key[\s\S]*?\(company_id,\s*provider,\s*provider_job_id\)[\s\S]*?where\s+provider_job_id\s+is\s+not\s+null/.test(
    sql,
  ),
);
check(
  "the request exposes (id, company_id) for the composite foreign key",
  /create\s+unique\s+index\s+if\s+not\s+exists\s+creative_generation_requests_id_company_key[\s\S]*?\(id,\s*company_id\)/.test(
    sql,
  ),
);
check(
  "a candidate belongs to a request IN THE SAME COMPANY, enforced by the database",
  /foreign\s+key\s+\(request_id,\s*company_id\)\s+references\s+public\.creative_generation_requests\s*\(id,\s*company_id\)/.test(
    sql,
  ),
);
check(
  "a candidate's media asset is same-company too",
  /foreign\s+key\s+\(media_asset_id,\s*company_id\)\s+references\s+public\.marketing_media_assets\s*\(id,\s*company_id\)/.test(
    sql,
  ),
);
check(
  "both composite foreign keys are guarded by pg_constraint so a re-run converges",
  (sql.match(/pg_constraint/g) ?? []).length >= 2,
);
check(
  "a stored asset is registered by exactly one candidate",
  /create\s+unique\s+index\s+if\s+not\s+exists\s+creative_generation_candidates_media_asset_key[\s\S]*?where\s+media_asset_id\s+is\s+not\s+null/.test(
    sql,
  ),
);
check(
  "approval must name a reviewer, structurally",
  /quality_state\s*<>\s*'approved'\s+or\s*\(\s*reviewed_by\s+is\s+not\s+null\s+and\s+reviewed_at\s+is\s+not\s+null\s*\)/.test(
    sql,
  ),
);
check(
  "a rejection must carry a reason",
  /quality_state\s*<>\s*'rejected'\s+or\s+rejection_reason\s+is\s+not\s+null/.test(
    sql,
  ),
);
check(
  "the migration introduces no new public function",
  !/create\s+(?:or\s+replace\s+)?function\s+public\./.test(sql),
);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
