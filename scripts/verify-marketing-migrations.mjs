/**
 * Static verification of the agent and marketing media migrations.
 *
 * ===================== WHY STATIC, NOT LIVE =====================
 * The only Supabase project this checkout is linked to is hosted and may be
 * production. Repository policy — and plain sense — forbids applying or
 * probing migrations against a database whose identity is ambiguous. So this
 * asserts the PROPERTIES OF THE MIGRATION FILES THEMSELVES: no database, no
 * network, no credential, runs anywhere, and cannot touch anything.
 *
 * It is deliberately complementary to `verify-141-142.sql`, which checks the
 * same properties against a database once you have one you trust. This one
 * answers "is the migration correct?"; that one answers "was it applied?".
 *
 * What it enforces, and why each matters:
 *   - company scoping        a table without a company FK is a cross-tenant leak
 *   - RLS enabled            defence in depth behind the service-role grant
 *   - anon/authenticated     revoked, or a browser session can read agent state
 *   - service_role granted   or the ingest route cannot write at all
 *   - idempotent DDL         re-running a migration must not fail
 *   - non-destructive        a migration in this pair must never drop or delete
 *   - idempotency keys       the unique constraint the ingest route relies on
 *
 * Run: node scripts/verify-marketing-migrations.mjs
 */
import { readFileSync } from "node:fs";

const MIGRATIONS = {
  141: "supabase/migrations/141_agent_marketing_snapshots.sql",
  142: "supabase/migrations/142_agent_marketing_decisions.sql",
  143: "supabase/migrations/143_marketing_channel_publishing.sql",
  144: "supabase/migrations/144_marketing_media_assets.sql",
  145: "supabase/migrations/145_marketing_reel_publishing.sql",
  196: "supabase/migrations/196_marketing_reject_reasons.sql",
};

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

const sql141 = loadSql(MIGRATIONS[141]);
const sql142 = loadSql(MIGRATIONS[142]);

// ---------------------------------------------------------------- 141
console.log("\n141 — agent_marketing_snapshots");

check(
  "creates the snapshot table",
  /create\s+table\s+if\s+not\s+exists\s+public\.agent_marketing_snapshots/.test(
    sql141,
  ),
);
check(
  "is idempotent DDL (if not exists)",
  /create\s+table\s+if\s+not\s+exists/.test(sql141),
);
check(
  "company-scoped by primary key with a real FK to companies",
  /company_id\s+uuid\s+primary\s+key\s+references\s+public\.companies\s*\(\s*id\s*\)/.test(
    sql141,
  ),
);
check("cascades on company deletion", /on\s+delete\s+cascade/.test(sql141));
check(
  "carries a contract version for envelope rejection",
  /contract_version\s+integer\s+not\s+null/.test(sql141),
);
check(
  "constrains the contract version",
  /check\s*\(\s*contract_version\s*>=\s*1\s*\)/.test(sql141),
);
check(
  "carries produced_at — the monotonic supersede guard",
  /produced_at\s+timestamptz\s+not\s+null/.test(sql141),
);
check(
  "records dropped item count rather than hiding contract skew",
  /dropped_items\s+integer\s+not\s+null/.test(sql141),
);
check(
  "enables row level security",
  /enable\s+row\s+level\s+security/.test(sql141),
);
check(
  "revokes from anon",
  /revoke\s+all\s+on\s+table\s+public\.agent_marketing_snapshots\s+from\s+anon/.test(
    sql141,
  ),
);
check(
  "revokes from authenticated",
  /revoke\s+all\s+on\s+table\s+public\.agent_marketing_snapshots\s+from\s+authenticated/.test(
    sql141,
  ),
);
check(
  "grants to service_role only",
  /grant\s+all\s+on\s+table\s+public\.agent_marketing_snapshots\s+to\s+service_role/.test(
    sql141,
  ),
);
check(
  "creates its read index idempotently",
  /create\s+index\s+if\s+not\s+exists/.test(sql141),
);

// ---------------------------------------------------------------- 142
console.log("\n142 — agent_marketing_decisions");

check(
  "creates the decision table",
  /create\s+table\s+if\s+not\s+exists\s+public\.agent_marketing_decisions/.test(
    sql142,
  ),
);
check(
  "company-scoped with a real FK to companies",
  /company_id\s+uuid\s+not\s+null\s+references\s+public\.companies\s*\(\s*id\s*\)/.test(
    sql142,
  ),
);
check("cascades on company deletion", /on\s+delete\s+cascade/.test(sql142));
check(
  "has the monotonic delivery cursor the platform polls with ?since=",
  /seq\s+bigserial\s+not\s+null/.test(sql142),
);
check(
  "IDEMPOTENT BY CONSTRAINT — unique (company_id, decision_key)",
  /unique\s*\(\s*company_id\s*,\s*decision_key\s*\)/.test(sql142),
);
check(
  "constrains subject_kind to the contract vocabulary",
  /check\s*\(\s*subject_kind\s+in\s*\(\s*'approval'\s*,\s*'recommendation'\s*,\s*'video_render'\s*\)\s*\)/.test(
    sql142,
  ),
);
check(
  "constrains decision to APPROVED / REJECTED / REQUEST_EDIT",
  /check\s*\(\s*decision\s+in\s*\(\s*'approved'\s*,\s*'rejected'\s*,\s*'request_edit'\s*\)\s*\)/.test(
    sql142,
  ),
);
check(
  "bounds the operator note so a decision cannot carry a payload",
  /char_length\s*\(\s*note\s*\)\s*<=\s*\d+/.test(sql142),
);
check(
  "records the deciding actor where auth allows",
  /decided_by_user_id\s+uuid\s+references\s+auth\.users/.test(sql142),
);
check(
  "keeps applied_at nullable — 'queued' must stay distinguishable from 'applied'",
  /applied_at\s+timestamptz\s*(,|\n)/.test(sql142),
);
check(
  "enables row level security",
  /enable\s+row\s+level\s+security/.test(sql142),
);
check(
  "revokes from anon",
  /revoke\s+all\s+on\s+table\s+public\.agent_marketing_decisions\s+from\s+anon/.test(
    sql142,
  ),
);
check(
  "revokes from authenticated",
  /revoke\s+all\s+on\s+table\s+public\.agent_marketing_decisions\s+from\s+authenticated/.test(
    sql142,
  ),
);
check(
  "grants to service_role only",
  /grant\s+all\s+on\s+table\s+public\.agent_marketing_decisions\s+to\s+service_role/.test(
    sql142,
  ),
);

// ------------------------------------------------------- both, safety
console.log("\nBoth — safety properties");

for (const [version, sql] of [
  ["141", sql141],
  ["142", sql142],
]) {
  check(
    `${version} contains no destructive statement`,
    !/\b(drop\s+table|drop\s+schema|truncate|delete\s+from|drop\s+database)\b/.test(
      sql,
    ),
  );
  check(
    `${version} grants to no role other than service_role`,
    (sql.match(/grant\s+[^;]*?\s+to\s+(\w+)/g) ?? []).every((clause) =>
      clause.trim().endsWith("service_role"),
    ),
  );
  check(
    `${version} defines no RLS policy (service-role access only, by design)`,
    !/create\s+policy/.test(sql),
  );
}

// ---------------------------------------------------------------- 143
const sql143 = loadSql(MIGRATIONS[143]);
console.log("\n143 — marketing_channel_deliveries (publish idempotency)");

check(
  "creates the delivery table",
  /create\s+table\s+if\s+not\s+exists\s+public\.marketing_channel_deliveries/.test(
    sql143,
  ),
);
check(
  "THE DUPLICATE GUARD — unique (company_id, marketing_post_id, provider)",
  /unique\s*\(\s*company_id\s*,\s*marketing_post_id\s*,\s*provider\s*\)/.test(
    sql143,
  ),
);
check(
  "persists the provider's own post id — the gap the audit found",
  /provider_post_id\s+text/.test(sql143),
);
check(
  "persists a permalink when the provider gives one",
  /provider_permalink\s+text/.test(sql143),
);
check(
  "models the four delivery states including in_flight",
  /check\s*\(\s*delivery_state\s+in\s*\(\s*'in_flight'\s*,\s*'posted'\s*,\s*'draft'\s*,\s*'failed'\s*\)\s*\)/.test(
    sql143,
  ),
);
check(
  "defaults to in_flight so a row is claimed, not assumed settled",
  /delivery_state\s+text\s+not\s+null\s+default\s+'in_flight'/.test(sql143),
);
check(
  "company-scoped with cascade",
  /company_id\s+uuid\s+not\s+null\s+references\s+public\.companies/.test(
    sql143,
  ),
);
check(
  "indexes unsettled claims for the reconciliation queue",
  /where\s+delivery_state\s*=\s*'in_flight'/.test(sql143),
);
check(
  "bounds failure_detail so a provider error body cannot be pasted in whole",
  /char_length\s*\(\s*failure_detail\s*\)\s*<=\s*1000/.test(sql143),
);
check(
  "enables row level security",
  /marketing_channel_deliveries[\s\S]*?enable\s+row\s+level\s+security/.test(
    sql143,
  ),
);
check(
  "GRANTS SELECT TO authenticated — without it the read policy is inert",
  /grant\s+select\s+on\s+table\s+public\.marketing_channel_deliveries\s+to\s+authenticated/.test(
    sql143,
  ),
);
check(
  "but revokes writes from authenticated — deliveries are written server-side only",
  /revoke\s+insert,\s*update,\s*delete\s+on\s+table\s+public\.marketing_channel_deliveries\s+from\s+authenticated/.test(
    sql143,
  ),
);
check(
  "revokes everything from anon",
  /revoke\s+all\s+on\s+table\s+public\.marketing_channel_deliveries\s+from\s+anon/.test(
    sql143,
  ),
);
check(
  "grants to service_role",
  /grant\s+all\s+on\s+table\s+public\.marketing_channel_deliveries\s+to\s+service_role/.test(
    sql143,
  ),
);
check(
  "143 contains no destructive statement",
  !/\b(drop\s+table|drop\s+schema|truncate|delete\s+from|drop\s+database)\b/.test(
    sql143,
  ),
);
check(
  "143 adds enum values idempotently",
  /add\s+value\s+if\s+not\s+exists\s+'youtube'/.test(sql143) &&
    /add\s+value\s+if\s+not\s+exists\s+'tiktok'/.test(sql143),
);

// ---------------------------------------------------------------- 144
const sql144 = loadSql(MIGRATIONS[144]);
console.log("\n144 — private marketing media assets");
check(
  "creates the media metadata table",
  /create\s+table\s+if\s+not\s+exists\s+public\.marketing_media_assets/.test(
    sql144,
  ),
);
check(
  "company-scoped with cascade",
  /company_id\s+uuid\s+not\s+null\s+references\s+public\.companies\s*\(\s*id\s*\)\s+on\s+delete\s+cascade/.test(
    sql144,
  ),
);
check(
  "stores a stable object key, not a URL",
  /object_key\s+text\s+not\s+null/.test(sql144) && !/public_url/.test(sql144),
);
// These three were written against an EARLIER draft of 144 and named columns
// that the applied migration does not have — `content_sha256`, `render_id`,
// `mime_type`. They had been failing silently ever since, and because
// `verify-all.mjs` stops at its first failing step, they were also masking
// every verifier that runs after this one. Corrected to the applied schema,
// and the digest check strengthened: the point of the P2-1 remediation was
// that the column NAME carries "unverified", so that is what is asserted.
check(
  "names the digest as client-reported, never as a verified checksum",
  /client_reported_sha256\s+text/.test(sql144) &&
    !/\bchecksum_sha256\s+text/.test(sql144) &&
    !/content_sha256/.test(sql144),
);
check(
  "records a byte size, nullable until storage confirms one",
  /byte_size\s+bigint/.test(sql144),
);
check(
  "renames an older checksum column rather than leaving both names in play",
  /rename\s+column\s+checksum_sha256\s+to\s+client_reported_sha256/.test(sql144),
);
check(
  "idempotent by company and render job",
  /unique\s*\(\s*company_id\s*,\s*source_job_id\s*\)/.test(sql144),
);
check(
  "accepts MP4 only",
  /content_type\s+text\s+not\s+null\s+default\s+'video\/mp4'/.test(sql144) &&
    /content_type\s+in\s*\(\s*'video\/mp4'\s*\)/.test(sql144),
);
check(
  "enables RLS and grants authenticated reads only",
  /enable\s+row\s+level\s+security/.test(sql144) &&
    /grant\s+select\s+on\s+table\s+public\.marketing_media_assets\s+to\s+authenticated/.test(
      sql144,
    ),
);
check(
  "revokes authenticated writes and anon access",
  /revoke\s+insert,\s*update,\s*delete\s+on\s+table\s+public\.marketing_media_assets\s+from\s+authenticated/.test(
    sql144,
  ) &&
    /revoke\s+all\s+on\s+table\s+public\.marketing_media_assets\s+from\s+anon/.test(
      sql144,
    ),
);
check(
  "creates a private video-only storage bucket",
  /values\s*\(\s*'marketing-media'\s*,\s*'marketing-media'\s*,\s*false[\s\S]*array\s*\[\s*'video\/mp4'\s*\]/.test(
    sql144,
  ),
);
check(
  "144 contains no destructive statement",
  !/\b(drop\s+table|drop\s+schema|truncate|delete\s+from|drop\s+database)\b/.test(
    sql144,
  ),
);

// ---------------------------------------------------------------- 145
const sql145 = loadSql(MIGRATIONS[145]);
console.log("\n145 — marketing post video reference (Reel publishing)");

check(
  "adds the video reference idempotently",
  /alter\s+table\s+public\.marketing_posts\s+add\s+column\s+if\s+not\s+exists\s+video_media_asset_id\s+uuid/.test(
    sql145,
  ),
);
check(
  "THE SAME-COMPANY RULE IS A FOREIGN KEY, not an application check",
  /foreign\s+key\s*\(\s*video_media_asset_id\s*,\s*company_id\s*\)\s*references\s+public\.marketing_media_assets\s*\(\s*id\s*,\s*company_id\s*\)/.test(
    sql145,
  ),
);
check(
  "and the referenced pair is actually unique, or the FK could not exist",
  /create\s+unique\s+index\s+if\s+not\s+exists\s+\w+\s+on\s+public\.marketing_media_assets\s*\(\s*id\s*,\s*company_id\s*\)/.test(
    sql145,
  ),
);
check(
  "NO ACTION on delete — RESTRICT would block company deletion outright",
  /on\s+delete\s+no\s+action/.test(sql145) &&
    !/on\s+delete\s+(cascade|restrict|set\s+null)/.test(sql145),
);
check(
  "the constraint is added inside an existence guard so a re-run converges",
  /if\s+not\s+exists\s*\([\s\S]*?pg_constraint[\s\S]*?marketing_posts_video_media_asset_fkey/.test(
    sql145,
  ),
);
check(
  "records the provider-side media id, idempotently",
  /alter\s+table\s+public\.marketing_channel_deliveries\s+add\s+column\s+if\s+not\s+exists\s+provider_media_id\s+text/.test(
    sql145,
  ),
);
check(
  "stores no URL and no filesystem path",
  !/signed_url|public_url|video_url|file_path|master_path/.test(sql145),
);
check(
  "creates no new table — a Reel is one post publishing one video",
  !/create\s+table/.test(sql145),
);
check(
  "leaves 143's duplicate guard untouched",
  !/unique\s*\(\s*company_id\s*,\s*marketing_post_id/.test(sql145) &&
    !/drop\s+constraint/.test(sql145),
);
check(
  "145 contains no destructive statement",
  !/\b(drop\s+table|drop\s+schema|truncate|delete\s+from|drop\s+database|drop\s+column)\b/.test(
    sql145,
  ),
);
check(
  "145 grants nothing new — it adds columns to tables that already have grants",
  // Matches a GRANT *statement*, not the word. The column comments explain
  // that bytes are reached through a short-lived grant, and prose must not be
  // able to fail a structural check.
  !/\bgrant\s+[\w,\s]+\s+on\s+/.test(sql145) && !/\brevoke\s+/.test(sql145),
);

// ---------------------------------------------------------------- 196
const sql196 = loadSql(MIGRATIONS[196]);
console.log("\n196 — reject reasons (label-factory foundation)");

check(
  "THE CONSTRAINT SWAP IS ONE STATEMENT — no window without a subject_kind CHECK",
  /alter\s+table\s+public\.agent_marketing_decisions\s+drop\s+constraint\s+if\s+exists\s+agent_marketing_decisions_subject_kind_check\s*,\s*add\s+constraint\s+agent_marketing_decisions_subject_kind_check/.test(
    sql196,
  ),
);
check(
  "targets the exact constraint name 142 created",
  (sql196.match(/agent_marketing_decisions_subject_kind_check/g) ?? [])
    .length >= 2,
);
check(
  "the new kind list is a strict superset of 142's — existing rows all validate",
  /check\s*\(\s*subject_kind\s+in\s*\(\s*'approval'\s*,\s*'recommendation'\s*,\s*'video_render'\s*,\s*'marketing_post'\s*\)\s*\)/.test(
    sql196,
  ),
);
check(
  "adds archived_reason idempotently, bounded",
  /alter\s+table\s+public\.marketing_posts\s+add\s+column\s+if\s+not\s+exists\s+archived_reason\s+text/.test(
    sql196,
  ) && /char_length\s*\(\s*archived_reason\s*\)\s*<=\s*200/.test(sql196),
);
check(
  "adds archived_tags idempotently, as a JSON array or null",
  /alter\s+table\s+public\.marketing_posts\s+add\s+column\s+if\s+not\s+exists\s+archived_tags\s+jsonb/.test(
    sql196,
  ) && /jsonb_typeof\s*\(\s*archived_tags\s*\)\s*=\s*'array'/.test(sql196),
);
check(
  "does NOT put the reason vocabulary in a CHECK — versioning belongs to the reader",
  !/archived_reason\s+text[\s\S]*?\bin\s*\(\s*'/.test(sql196),
);
check(
  "adds deliveries.published_text idempotently, bounded",
  /alter\s+table\s+public\.marketing_channel_deliveries\s+add\s+column\s+if\s+not\s+exists\s+published_text\s+text/.test(
    sql196,
  ) && /char_length\s*\(\s*published_text\s*\)\s*<=\s*10000/.test(sql196),
);
check(
  "creates no new table and no RLS policy — columns ride existing grants",
  !/create\s+table/.test(sql196) && !/create\s+policy/.test(sql196),
);
check(
  "grants and revokes nothing",
  !/\bgrant\s+[\w,\s]+\s+on\s+/.test(sql196) && !/\brevoke\s+/.test(sql196),
);
check(
  "196 contains no destructive statement (the constraint swap is the one intended drop)",
  !/\b(drop\s+table|drop\s+schema|truncate|delete\s+from|drop\s+database|drop\s+column)\b/.test(
    sql196,
  ),
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} migration checks passed.`,
);
if (failures > 0) process.exit(1);
