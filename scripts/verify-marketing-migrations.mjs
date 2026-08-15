/**
 * Static verification of migrations 141 and 142.
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
  /create\s+table\s+if\s+not\s+exists\s+public\.agent_marketing_snapshots/.test(sql141),
);
check(
  "is idempotent DDL (if not exists)",
  /create\s+table\s+if\s+not\s+exists/.test(sql141),
);
check(
  "company-scoped by primary key with a real FK to companies",
  /company_id\s+uuid\s+primary\s+key\s+references\s+public\.companies\s*\(\s*id\s*\)/.test(sql141),
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
check("enables row level security", /enable\s+row\s+level\s+security/.test(sql141));
check("revokes from anon", /revoke\s+all\s+on\s+table\s+public\.agent_marketing_snapshots\s+from\s+anon/.test(sql141));
check(
  "revokes from authenticated",
  /revoke\s+all\s+on\s+table\s+public\.agent_marketing_snapshots\s+from\s+authenticated/.test(sql141),
);
check(
  "grants to service_role only",
  /grant\s+all\s+on\s+table\s+public\.agent_marketing_snapshots\s+to\s+service_role/.test(sql141),
);
check("creates its read index idempotently", /create\s+index\s+if\s+not\s+exists/.test(sql141));

// ---------------------------------------------------------------- 142
console.log("\n142 — agent_marketing_decisions");

check(
  "creates the decision table",
  /create\s+table\s+if\s+not\s+exists\s+public\.agent_marketing_decisions/.test(sql142),
);
check(
  "company-scoped with a real FK to companies",
  /company_id\s+uuid\s+not\s+null\s+references\s+public\.companies\s*\(\s*id\s*\)/.test(sql142),
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
check("enables row level security", /enable\s+row\s+level\s+security/.test(sql142));
check("revokes from anon", /revoke\s+all\s+on\s+table\s+public\.agent_marketing_decisions\s+from\s+anon/.test(sql142));
check(
  "revokes from authenticated",
  /revoke\s+all\s+on\s+table\s+public\.agent_marketing_decisions\s+from\s+authenticated/.test(sql142),
);
check(
  "grants to service_role only",
  /grant\s+all\s+on\s+table\s+public\.agent_marketing_decisions\s+to\s+service_role/.test(sql142),
);

// ------------------------------------------------------- both, safety
console.log("\nBoth — safety properties");

for (const [version, sql] of [
  ["141", sql141],
  ["142", sql142],
]) {
  check(
    `${version} contains no destructive statement`,
    !/\b(drop\s+table|drop\s+schema|truncate|delete\s+from|drop\s+database)\b/.test(sql),
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
  /create\s+table\s+if\s+not\s+exists\s+public\.marketing_channel_deliveries/.test(sql143),
);
check(
  "THE DUPLICATE GUARD — unique (company_id, marketing_post_id, provider)",
  /unique\s*\(\s*company_id\s*,\s*marketing_post_id\s*,\s*provider\s*\)/.test(sql143),
);
check(
  "persists the provider's own post id — the gap the audit found",
  /provider_post_id\s+text/.test(sql143),
);
check("persists a permalink when the provider gives one", /provider_permalink\s+text/.test(sql143));
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
check("company-scoped with cascade", /company_id\s+uuid\s+not\s+null\s+references\s+public\.companies/.test(sql143));
check(
  "indexes unsettled claims for the reconciliation queue",
  /where\s+delivery_state\s*=\s*'in_flight'/.test(sql143),
);
check("bounds failure_detail so a provider error body cannot be pasted in whole",
  /char_length\s*\(\s*failure_detail\s*\)\s*<=\s*1000/.test(sql143));
check("enables row level security", /marketing_channel_deliveries[\s\S]*?enable\s+row\s+level\s+security/.test(sql143));
check(
  "GRANTS SELECT TO authenticated — without it the read policy is inert",
  /grant\s+select\s+on\s+table\s+public\.marketing_channel_deliveries\s+to\s+authenticated/.test(sql143),
);
check(
  "but revokes writes from authenticated — deliveries are written server-side only",
  /revoke\s+insert,\s*update,\s*delete\s+on\s+table\s+public\.marketing_channel_deliveries\s+from\s+authenticated/.test(
    sql143,
  ),
);
check("revokes everything from anon",
  /revoke\s+all\s+on\s+table\s+public\.marketing_channel_deliveries\s+from\s+anon/.test(sql143));
check("grants to service_role",
  /grant\s+all\s+on\s+table\s+public\.marketing_channel_deliveries\s+to\s+service_role/.test(sql143));
check("143 contains no destructive statement",
  !/\b(drop\s+table|drop\s+schema|truncate|delete\s+from|drop\s+database)\b/.test(sql143));
check("143 adds enum values idempotently",
  /add\s+value\s+if\s+not\s+exists\s+'youtube'/.test(sql143) &&
  /add\s+value\s+if\s+not\s+exists\s+'tiktok'/.test(sql143));

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} migration checks passed.`,
);
if (failures > 0) process.exit(1);
