/**
 * The publishing package contract — the fan-out from one piece of content to
 * one post per provider.
 *
 * ==================== WHAT THIS IS GUARDING ====================
 * Three properties, each of which fails silently and expensively:
 *
 *   1. The TypeScript vocabulary and the SQL CHECK constraints agree. The
 *      drift documented at the top of shared/types/integration-provider.ts —
 *      a database that accepted `youtube` for eighteen months while the
 *      TypeScript union refused to mint OAuth state for it — is the class of
 *      bug this closes. The literals are compared character for character,
 *      parsed out of migration 182 rather than restated here.
 *
 *   2. `buildProviderPosts` never emits two posts for one provider. Migration
 *      143's `unique (company_id, marketing_post_id, provider)` means the
 *      second of two such posts could never claim a delivery, so it would sit
 *      looking publishable and never publish — a defect with no error
 *      anywhere.
 *
 *   3. `derivePackageState` never reports `published` while a destination is
 *      unsettled. Reporting it early tells an operator the work is done, so
 *      nobody finishes the half that did not go out.
 *
 * Purely static: it reads source and SQL from disk, stubs nothing because
 * there is nothing to stub, and cannot open a socket or reach a provider.
 *
 * Run: node scripts/verify-publishing-package.mjs
 */
import { readFileSync } from "node:fs";
import { loadPureModule } from "./lib/load-pure-module.mjs";

const MODULE_PATH = "shared/types/publishing-package.ts";
const CAPABILITY_PATH = "shared/types/integration-capability.ts";
const MIGRATION_182 = "supabase/migrations/182_marketing_content_packages.sql";
const MIGRATION_145 = "supabase/migrations/145_marketing_reel_publishing.sql";
const MIGRATION_147 = "supabase/migrations/147_agent_daily_reel_draft_key.sql";
const MIGRATION_087 = "supabase/migrations/087_marketing_posts_foundation.sql";
const MIGRATION_180 = "supabase/migrations/180_marketing_channel_enum.sql";

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

/** Comments stripped so prose can never satisfy a structural check. */
function readSql(path) {
  return readFileSync(path, "utf8").replace(/--[^\n]*/g, "");
}

const pkgModule = await loadPureModule(MODULE_PATH, "pubpkg");
const delivery = await loadPureModule("shared/types/marketing-delivery.ts", "pubpkg");
const capabilities = await loadPureModule(CAPABILITY_PATH, "pubpkg");
const providers = await loadPureModule("shared/types/integration-provider.ts", "pubpkg");

const raw182 = readSql(MIGRATION_182);
const sql182 = raw182.toLowerCase();

/**
 * String literals blanked as well as comments.
 *
 * `comment on column ... is '…'` is prose that legitimately names other
 * migrations' indexes and tables. Searching for "this identifier must not
 * appear" against text that includes those comments would fail on a correct
 * migration, so the "does not touch X" checks read this instead.
 */
const ddl182 = sql182.replace(/'(?:[^']|'')*'/g, "''");

/**
 * The column list of ONE `create table`, from the create statement to the paren
 * that closes it.
 *
 * The per-table checks below used to slice with
 * `sql.split("create table if not exists public.<table>")[1]`, which is not
 * that table's definition — it is the entire REMAINDER OF THE FILE, every
 * later table included. So "packages: company_id is a cascading FK" was
 * satisfied by the ASSETS table's cascade: deleting the cascade from the
 * packages table changed nothing and the check still passed. A check that
 * cannot fail is not a check. Cutting the body at its own closing paren is
 * what makes a missing constraint fail on the table that is missing it.
 */
function tableBody(sql, table) {
  const open = new RegExp(
    `create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}\\s*\\(`,
  ).exec(sql);
  if (open === null) return null;

  let depth = 0;
  for (let i = open.index + open[0].length - 1; i < sql.length; i += 1) {
    const ch = sql[i];
    if (ch === "'") {
      // Step over the literal. A paren inside a default or a CHECK value would
      // otherwise unbalance the count and run the "body" to the end of the
      // file — reintroducing the over-wide slice this function exists to stop.
      i += 1;
      while (i < sql.length) {
        if (sql[i] !== "'") {
          i += 1;
          continue;
        }
        if (sql[i + 1] === "'") {
          i += 2; // a doubled quote is an escape, not the end of the literal
          continue;
        }
        break;
      }
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return sql.slice(open.index, i + 1);
    }
  }
  return null;
}

/**
 * ONE statement: from `pattern` to the semicolon that ends it.
 *
 * The lazy form of the same defect. `create trigger X[\s\S]*?execute function
 * f()` walks straight past X's own semicolon and matches the NEXT trigger's
 * clause, so X can be missing that clause entirely and the pattern still
 * succeeds — the check then reports on a statement nobody asked about.
 */
function statementFrom(sql, pattern) {
  const match = pattern.exec(sql);
  if (match === null) return null;
  const end = sql.indexOf(";", match.index);
  return end === -1 ? null : sql.slice(match.index, end + 1);
}

const PACKAGE_TABLES = [
  "marketing_content_packages",
  "marketing_content_package_assets",
];
/** Null here means the create statement did not parse; the checks say so. */
const TABLE_BODY = new Map(
  PACKAGE_TABLES.map((table) => [table, tableBody(sql182, table)]),
);
const assetsBody = TABLE_BODY.get("marketing_content_package_assets") ?? "";
const packagesBody = TABLE_BODY.get("marketing_content_packages") ?? "";

const moduleSource = readFileSync(MODULE_PATH, "utf8");
/** The module with its own documentation removed — prose describes purity;
 *  only code can violate it. */
const moduleCode = moduleSource
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/[^\n]*/g, "");

/* ===================================================== purity ============ */

console.log("\nThe contract module is pure");

const specifiers = [...moduleCode.matchAll(/from\s+["']([^"']+)["']/g)].map(
  (m) => m[1],
);
check(
  "imports nothing but relative sibling types",
  specifiers.length > 0 && specifiers.every((s) => s.startsWith("./")),
  specifiers.filter((s) => !s.startsWith("./")),
);
check(
  "never reaches for the project alias or a package",
  !/from\s+["'](@\/|[a-z@])/.test(moduleCode),
);
check("is not server-only", !moduleCode.includes("server-only"));
check(
  "reads no environment and no clock",
  !moduleCode.includes("process.env") &&
    !moduleCode.includes("Date.now()") &&
    !moduleCode.includes("new Date("),
);

/* ======================================= the vocabulary matches the SQL === */

console.log("\nPACKAGE_STATES and ASSET_ROLES mirror migration 182 exactly");

function sqlLiterals(pattern) {
  const group = raw182.match(pattern)?.[1] ?? "";
  return [...group.matchAll(/'([^']*)'/g)].map((m) => m[1]);
}

const sqlStates = sqlLiterals(/package_state\s+in\s*\(([^)]*)\)/);
const sqlRoles = sqlLiterals(/asset_role\s+in\s*\(([^)]*)\)/);

// A parse that silently yields nothing would make every comparison below pass
// on emptiness, which is the classic way a guard stops guarding.
check("the package_state CHECK parses to five labels", sqlStates.length === 5, sqlStates);
check("the asset_role CHECK parses to four labels", sqlRoles.length === 4, sqlRoles);

check(
  "PACKAGE_STATES equals the SQL CHECK character for character, in order",
  JSON.stringify([...pkgModule.PACKAGE_STATES]) === JSON.stringify(sqlStates),
  `${JSON.stringify([...pkgModule.PACKAGE_STATES])} vs ${JSON.stringify(sqlStates)}`,
);
check(
  "ASSET_ROLES equals the SQL CHECK character for character, in order",
  JSON.stringify([...pkgModule.ASSET_ROLES]) === JSON.stringify(sqlRoles),
  `${JSON.stringify([...pkgModule.ASSET_ROLES])} vs ${JSON.stringify(sqlRoles)}`,
);

const sortBounds = raw182.match(
  /sort_order\s*>=\s*(\d+)\s+and\s+sort_order\s*<=\s*(\d+)/,
);
check(
  "the sort_order bounds mirror the SQL CHECK",
  Boolean(sortBounds) &&
    Number(sortBounds[1]) === pkgModule.PACKAGE_ASSET_SORT_ORDER_MIN &&
    Number(sortBounds[2]) === pkgModule.PACKAGE_ASSET_SORT_ORDER_MAX,
  sortBounds?.slice(1),
);

check(
  "every asset role declares a media kind",
  pkgModule.ASSET_ROLES.every(
    (role) => pkgModule.MEDIA_KIND_BY_ASSET_ROLE[role] !== undefined,
  ),
);
check(
  "primary_video is the only role that is video",
  pkgModule.ASSET_ROLES.filter(
    (role) => pkgModule.mediaKindForAssetRole(role) === "video",
  ).join(",") === "primary_video",
);
// The role map feeds `acceptsMediaKinds`, so a kind the capability matrix has
// never heard of would not throw — it would simply match no provider, and the
// package would be refused everywhere for no stated reason.
const declaredMediaKinds = new Set(
  [
    ...(readFileSync(CAPABILITY_PATH, "utf8").match(
      /export type MediaKind =([^;]*);/,
    ) ?? ["", ""])[1].matchAll(/"([a-z_]+)"/g),
  ].map((m) => m[1]),
);
check(
  "the MediaKind union parses to the kinds the capability matrix uses",
  declaredMediaKinds.size >= 2,
  [...declaredMediaKinds],
);
check(
  "every role's media kind is a declared MediaKind",
  pkgModule.ASSET_ROLES.every((role) =>
    declaredMediaKinds.has(pkgModule.mediaKindForAssetRole(role)),
  ),
);

/* ================================================== migration structure == */

console.log("\nMigration 182 structure");

check(
  "creates public.marketing_content_packages",
  /create\s+table\s+if\s+not\s+exists\s+public\.marketing_content_packages\b/.test(sql182),
);
check(
  "creates public.marketing_content_package_assets",
  /create\s+table\s+if\s+not\s+exists\s+public\.marketing_content_package_assets\b/.test(sql182),
);
check(
  // In the PACKAGE's own column list. A `source_type` declared anywhere else
  // in the file would not be the column migration 147's source-scoped
  // duplicate guard has to agree with.
  "REUSES public.marketing_post_source instead of a parallel enum",
  /source_type\s+public\.marketing_post_source\s+not\s+null/.test(packagesBody),
);
check(
  "declares no new type at all",
  !/create\s+type\s+public\./.test(sql182),
);
check(
  "creates no new public function (keeps verify-function-grants simple)",
  !/create\s+(?:or\s+replace\s+)?function\s+public\./.test(sql182),
);
check(
  "contains no destructive statement",
  ![/\bdrop\s+table\b/, /\bdrop\s+column\b/, /\bdrop\s+type\b/, /\btruncate\b/, /\bdelete\s+from\b/]
    .some((re) => re.test(sql182)),
);

for (const table of PACKAGE_TABLES) {
  // Every check in this iteration that reads a table BODY reads this one. If
  // the create statement stopped parsing, the body would be "" and each of
  // them would fail for a reason that has nothing to do with the constraint it
  // names — so the parse is asserted first, by itself.
  const body = TABLE_BODY.get(table) ?? "";
  check(
    `${table}: its CREATE TABLE column list parses on its own`,
    TABLE_BODY.get(table) !== null && body.length < sql182.length,
    TABLE_BODY.get(table) === null
      ? "no create statement found"
      : `${body.length} of ${sql182.length} chars`,
  );
  check(
    `${table}: company_id is a cascading FK to companies`,
    new RegExp(
      `company_id\\s+uuid\\s+not\\s+null\\s+references\\s+public\\.companies\\s*\\(\\s*id\\s*\\)\\s+on\\s+delete\\s+cascade`,
    ).test(body),
  );
  check(
    `${table}: enables row level security`,
    new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`).test(sql182),
  );
  // Scoped to the one CREATE POLICY statement. The lazy `[\s\S]*?` this
  // replaces ran past the statement's semicolon, so a policy that checked only
  // membership was covered by the OTHER table's policy naming the dispatcher
  // helper — a table readable by any company member would have passed.
  const selectPolicy = statementFrom(
    sql182,
    new RegExp(`create\\s+policy\\s+"[^"]*"\\s+on\\s+public\\.${table}\\b`),
  );
  check(
    `${table}: dispatcher SELECT policy uses both tenancy helpers`,
    selectPolicy !== null &&
      /\bfor\s+select\b/.test(selectPolicy) &&
      selectPolicy.includes("public.is_active_company_member(company_id)") &&
      selectPolicy.includes("public.can_dispatch_jobs(company_id)"),
    selectPolicy,
  );
  check(
    `${table}: the policy is re-runnable (dropped first)`,
    new RegExp(`drop\\s+policy\\s+if\\s+exists\\s+"[^"]+"\\s+on\\s+public\\.${table}`).test(sql182),
  );
  // RLS narrows an existing privilege; it does not create one. All four lines
  // or the SELECT policy above is silently inert (143, lines 147-151).
  check(
    `${table}: grants select to authenticated`,
    sql182.includes(`grant select on table public.${table} to authenticated;`),
  );
  check(
    `${table}: revokes writes from authenticated`,
    sql182.includes(`revoke insert, update, delete on table public.${table} from authenticated;`),
  );
  check(
    `${table}: revokes everything from anon`,
    sql182.includes(`revoke all on table public.${table} from anon;`),
  );
  check(
    `${table}: grants all to service_role`,
    sql182.includes(`grant all on table public.${table} to service_role;`),
  );
  // Also scoped to its own statement, and now asserting the STRONGER property
  // the old pattern only appeared to test: the trigger fires BEFORE UPDATE ON
  // THIS TABLE. The lazy `[\s\S]*?` could reach the sibling trigger's
  // `execute function` clause, so a trigger attached to the wrong table, or to
  // no useful event, satisfied it.
  const trigger = statementFrom(
    sql182,
    new RegExp(`create\\s+trigger\\s+${table}_set_updated_at\\b`),
  );
  check(
    `${table}: updated_at trigger is attached and re-runnable`,
    new RegExp(
      `drop\\s+trigger\\s+if\\s+exists\\s+${table}_set_updated_at\\b`,
    ).test(sql182) &&
      trigger !== null &&
      new RegExp(`before\\s+update\\s+on\\s+public\\.${table}\\b`).test(trigger) &&
      /execute\s+function\s+public\.set_updated_at\(\)/.test(trigger),
    trigger,
  );
}

console.log("\nComposite foreign keys carry tenancy");

check(
  "packages is a composite-FK target: unique (id, company_id)",
  /create\s+unique\s+index\s+if\s+not\s+exists\s+\w+\s+on\s+public\.marketing_content_packages\s*\(\s*id,\s*company_id\s*\)/.test(sql182),
);
check(
  "the media parent already carries its (id, company_id) unique index (145)",
  /create\s+unique\s+index\s+if\s+not\s+exists\s+\w+\s+on\s+public\.marketing_media_assets\s*\(\s*id,\s*company_id\s*\)/.test(
    readSql(MIGRATION_145).toLowerCase(),
  ),
);
// All five are facts about the ASSETS table's own column list, so they are
// tested against it rather than against the file. A constraint written into
// some other statement is not a constraint on this table, and the file-wide
// form could not tell the difference.
check(
  "assets -> packages is composite on (package_id, company_id)",
  /foreign\s+key\s*\(\s*package_id,\s*company_id\s*\)\s*references\s+public\.marketing_content_packages\s*\(\s*id,\s*company_id\s*\)/.test(assetsBody),
);
check(
  "assets -> media is composite on (media_asset_id, company_id)",
  /foreign\s+key\s*\(\s*media_asset_id,\s*company_id\s*\)\s*references\s+public\.marketing_media_assets\s*\(\s*id,\s*company_id\s*\)/.test(assetsBody),
);
check(
  "the media FK is ON DELETE NO ACTION, so a company delete is not blocked (145's reasoning)",
  /references\s+public\.marketing_media_assets\s*\(\s*id,\s*company_id\s*\)\s*on\s+delete\s+no\s+action/.test(assetsBody),
);
check(
  "one asset per (package, role, slot)",
  /unique\s*\(\s*package_id,\s*asset_role,\s*sort_order\s*\)/.test(assetsBody),
);
check(
  "sort_order is a bounded smallint",
  /sort_order\s+smallint\s+not\s+null/.test(assetsBody),
);

console.log("\nThe agent cycle converges instead of duplicating");
check(
  "partial unique index on (company_id, source_type, source_id)",
  /create\s+unique\s+index\s+if\s+not\s+exists\s+\w+\s+on\s+public\.marketing_content_packages\s*\(\s*company_id,\s*source_type,\s*source_id\s*\)\s*where\s+source_id\s+is\s+not\s+null/.test(sql182),
);

/* ============================== the existing post rules are not disturbed = */

console.log("\nOne post = one provider (143/145/147) survives");

check(
  "content_package_id is added as a NULLABLE uuid",
  /alter\s+table\s+public\.marketing_posts\s+add\s+column\s+if\s+not\s+exists\s+content_package_id\s+uuid\s*;/.test(sql182),
);
check(
  "content_package_id is never declared NOT NULL",
  !/content_package_id\s+uuid\s+not\s+null/.test(sql182),
);
check(
  "no unique index is created over content_package_id",
  !/create\s+unique\s+index[^;]*content_package_id/.test(sql182),
);
check(
  "content_package_id appears in no UNIQUE constraint",
  !/unique\s*\([^)]*content_package_id/.test(sql182),
);
check(
  "posts -> packages is composite on (content_package_id, company_id)",
  /foreign\s+key\s*\(\s*content_package_id,\s*company_id\s*\)\s*references\s+public\.marketing_content_packages\s*\(\s*id,\s*company_id\s*\)/.test(sql182),
);
check(
  "the constraint is added inside a pg_constraint guard (add constraint has no if not exists)",
  /pg_constraint[\s\S]*?marketing_posts_content_package_fkey/.test(sql182),
);
// 147's index is the sole arbiter of /api/agent/draft-posts' insert-and-read-
// 23505 idempotency. A second unique index over these rows would make that
// error code ambiguous and the route would report ALREADY_EXISTS for a
// collision that meant something else.
check(
  "147's agent daily reel key is neither dropped nor redefined",
  !ddl182.includes("marketing_posts_agent_daily_reel_key"),
);
check(
  "147's index still exists on disk and is still scoped to agent_daily_reel",
  /create\s+unique\s+index\s+if\s+not\s+exists\s+marketing_posts_agent_daily_reel_key[\s\S]*?where\s+source_type\s*=\s*'agent_daily_reel'/.test(
    readSql(MIGRATION_147).toLowerCase(),
  ),
);
check(
  "143's delivery duplicate guard is not touched by 182",
  !ddl182.includes("marketing_channel_deliveries"),
);
check(
  "182 never adds an unscoped unique over (company_id, video_media_asset_id, channel_target)",
  !/video_media_asset_id/.test(ddl182),
);

/* ========================================================== fixtures ===== */

const asset = (assetRole, sortOrder) => ({
  id: `asset-${assetRole}-${sortOrder}`,
  companyId: "co-1",
  packageId: "pkg-1",
  mediaAssetId: `media-${assetRole}-${sortOrder}`,
  assetRole,
  sortOrder,
});

const makePackage = (over = {}) => ({
  id: "pkg-1",
  companyId: "co-1",
  sourceType: "agent_daily_reel",
  sourceId: "11111111-1111-1111-1111-111111111111",
  contentExperimentId: null,
  title: "Furnace tune-up in sixty seconds",
  description: "D".repeat(400),
  caption: "Here is what a tune-up actually looks like.",
  hashtags: ["#hvac", "#furnace"],
  tags: ["hvac", "furnace"],
  transcript: null,
  captionsVtt: null,
  cta: { label: "Book a visit", url: "https://example.com/book" },
  assets: [asset("primary_video", 0), asset("thumbnail", 0)],
  destinations: ["youtube", "tiktok"],
  requestedPublishAt: "2026-09-02T09:00:00.000Z",
  requiresApproval: false,
  seo: {
    slug: "furnace-tune-up",
    metaTitle: null,
    metaDescription: null,
    canonicalUrl: null,
    keywords: [],
  },
  provenance: {
    producedBy: "altair-agent-platform",
    agentRunId: "run-1",
    modelLabel: "content-writer",
    generatedAt: "2026-09-01T00:00:00.000Z",
    humanEdited: false,
  },
  packageState: "approved",
  createdBy: null,
  approvedBy: null,
  approvedAt: null,
  ...over,
});

const cap = (provider) => capabilities.INTEGRATION_CAPABILITIES[provider];
const validate = (pkg, provider) =>
  pkgModule.validatePackageForProvider(pkg, cap(provider));
const gapOf = (pkg, provider) => {
  const result = validate(pkg, provider);
  return result.ok ? null : result.gap;
};

/* ================================================== capability gating ==== */

console.log("\nA package is checked against what the platform can take");

check(
  "an asset source is refused structurally, not by good manners",
  gapOf(makePackage(), "higgsfield")?.reason === "not_a_publisher",
);
check(
  "a video handed to an image-only surface reports the KIND, not a count",
  gapOf(makePackage(), "google_business")?.reason === "media_kind_unsupported",
);
check(
  "the reported kind names the offending media",
  gapOf(makePackage(), "google_business")?.kind === "video",
);
check(
  "a surface that cannot publish without media says so",
  gapOf(makePackage({ assets: [] }), "instagram")?.reason === "media_required",
);

const tooMany = makePackage({
  assets: Array.from({ length: 10 }, (_, i) => asset("image", i)),
});
check(
  "an over-full carousel reports too_many_assets with the real count",
  gapOf(tooMany, "linkedin")?.reason === "too_many_assets" &&
    gapOf(tooMany, "linkedin")?.count === 10,
);

check(
  "an over-long title is refused, and the length is named",
  gapOf(makePackage({ title: "T".repeat(200) }), "youtube")?.reason === "title_too_long",
);
check(
  "a surface with a title field will not take an untitled package",
  gapOf(makePackage({ title: "   " }), "youtube")?.reason === "title_required",
);
check(
  "an over-long body is refused, and the length is named",
  gapOf(makePackage({ description: "D".repeat(6_000) }), "youtube")?.reason === "body_too_long" &&
    gapOf(makePackage({ description: "D".repeat(6_000) }), "youtube")?.length === 6_000,
);
check(
  "a surface with NO title field does not demand one",
  validate(makePackage({ title: "" }), "facebook").ok === true,
);
check(
  "a well-formed package passes the surfaces it was built for",
  validate(makePackage(), "youtube").ok && validate(makePackage(), "tiktok").ok,
);

// Every declared gap must be reachable. A reason nobody can produce is copy in
// describeCapabilityGap that will never render, and — worse — suggests a
// refusal path that does not exist.
const declaredReasons = new Set(
  [...readFileSync(CAPABILITY_PATH, "utf8").matchAll(/readonly reason: "([a-z_]+)"/g)].map(
    (m) => m[1],
  ),
);
const producedReasons = new Set(
  [
    gapOf(makePackage(), "higgsfield"),
    gapOf(makePackage(), "google_business"),
    gapOf(makePackage({ assets: [] }), "instagram"),
    gapOf(tooMany, "linkedin"),
    gapOf(makePackage({ title: "T".repeat(200) }), "youtube"),
    gapOf(makePackage({ title: "" }), "youtube"),
    gapOf(makePackage({ description: "D".repeat(6_000) }), "youtube"),
  ]
    .filter(Boolean)
    .map((gap) => gap.reason),
);
check(
  "the CapabilityGap union parses to a non-empty set",
  declaredReasons.size >= 7,
  [...declaredReasons],
);
check(
  "every declared CapabilityGap reason is reachable from this contract",
  [...declaredReasons].every((reason) => producedReasons.has(reason)),
  [...declaredReasons].filter((r) => !producedReasons.has(r)),
);
check(
  "every produced gap renders operator-facing words",
  [...producedReasons].length > 0 &&
    [
      gapOf(makePackage(), "higgsfield"),
      gapOf(makePackage(), "google_business"),
      gapOf(tooMany, "linkedin"),
    ].every((gap) => {
      const text = capabilities.describeCapabilityGap(gap, cap("google_business"));
      return typeof text === "string" && text.length > 0;
    }),
);

/* ==================================================== the projection ===== */

console.log("\nThe per-provider projection");

const ytVariant = validate(makePackage(), "youtube").variant;
const ttVariant = validate(makePackage(), "tiktok").variant;

check(
  "a titled surface gets the title and the long-form body",
  ytVariant.title === "Furnace tune-up in sixty seconds" &&
    ytVariant.body === "D".repeat(400),
);
check(
  "a single-field surface gets the CAPTION, not the headline",
  ttVariant.title === "Here is what a tune-up actually looks like." &&
    ttVariant.body === "",
);
check(
  "a surface with no title field carries only a body",
  validate(makePackage(), "facebook").variant.title === null,
);
check(
  "a thumbnail is dropped for a surface with no cover-image concept",
  ttVariant.assets.length === 1 && ttVariant.assets[0].assetRole === "primary_video",
);
check(
  "a thumbnail is kept for a surface that has one",
  ytVariant.assets.length === 2,
);
check(
  "hashtags are withheld where the platform reads them as spam",
  validate(makePackage({ assets: [] }), "reddit").variant.hashtags.length === 0,
);
check(
  "a link is withheld where the platform has no link field",
  validate(makePackage(), "instagram").variant.link === null &&
    validate(makePackage(), "facebook").variant.link === "https://example.com/book",
);
// Nulling the time for a provider that cannot schedule would quietly turn
// "post at 9am" into "post now".
check(
  "a requested time survives a provider that cannot schedule",
  ttVariant.scheduledAt === "2026-09-02T09:00:00.000Z" &&
    ttVariant.scheduleHeldBy === "altair",
);
check(
  "a provider that CAN schedule is asked to hold it",
  ytVariant.scheduleHeldBy === "provider",
);
check(
  "no requested time means nobody is holding one",
  validate(makePackage({ requestedPublishAt: null }), "youtube").variant.scheduleHeldBy === null,
);
// Everything from here to the end of the fan-out sweeps the provider
// vocabulary with `.every`, which is TRUE of an empty array. If the union ever
// failed to load — a rename, a moved file, a bad parse — every one of those
// checks would report PASS while testing nothing at all.
check(
  "the provider vocabulary loaded, whole",
  providers.INTEGRATION_PROVIDERS.length >= 9,
  providers.INTEGRATION_PROVIDERS.length,
);
check(
  "no provider defaults to a public visibility",
  providers.INTEGRATION_PROVIDERS.every(
    (provider) =>
      pkgModule.buildProviderPosts(makePackage(), [provider])[0].variant.visibility !== "public",
  ),
);

/* ======================================================== the fan-out ==== */

console.log("\nThe fan-out cannot produce a duplicate provider");

const repeated = pkgModule.buildProviderPosts(makePackage(), [
  "youtube",
  "youtube",
  "tiktok",
  "youtube",
  "tiktok",
]);
check("a repeated provider list collapses to one plan each", repeated.length === 2, repeated.map((p) => p.provider));
check(
  "first occurrence wins, so caller ordering is preserved",
  repeated.map((p) => p.provider).join(",") === "youtube,tiktok",
);

const everything = pkgModule.buildProviderPosts(makePackage(), [
  ...providers.INTEGRATION_PROVIDERS,
  ...providers.INTEGRATION_PROVIDERS,
  ...[...providers.INTEGRATION_PROVIDERS].reverse(),
]);
check(
  "the whole vocabulary, three times over, yields one plan per provider",
  everything.length === providers.INTEGRATION_PROVIDERS.length,
  everything.length,
);
check(
  "no two plans share a provider — 143's unique guard cannot be raced",
  new Set(everything.map((p) => p.provider)).size === everything.length,
);
check(
  "the fan-out defaults to the package's own destinations",
  pkgModule.buildProviderPosts(makePackage()).map((p) => p.provider).join(",") ===
    "youtube,tiktok",
);
check(
  "every plan carries the package and company it came from",
  everything.every((p) => p.packageId === "pkg-1" && p.companyId === "co-1"),
);

// A destination that cannot take the content is RETURNED with a gap, never
// dropped: five chosen platforms silently becoming three posts is a defect
// nobody can see.
check(
  "an unusable destination is returned with a gap, not omitted",
  everything.some((p) => p.gap !== null) &&
    everything.length === providers.INTEGRATION_PROVIDERS.length,
);
// `.every` over an empty result is true and the two lengths would both be 0,
// so a `publishablePosts` that returned nothing at all would pass this. The
// length floor is what makes it assert that something IS publishable.
check(
  "publishablePosts returns exactly the plans with no gap",
  pkgModule.publishablePosts(everything).length > 0 &&
    pkgModule.publishablePosts(everything).every((p) => p.gap === null) &&
    pkgModule.publishablePosts(everything).length ===
      everything.filter((p) => p.gap === null).length,
);
// The package says approval is not required; every provider currently says it
// is, on policy grounds. A package must not be able to waive that.
check(
  "a package cannot waive a provider's own approval requirement",
  everything.every((p) => p.requiresApproval === true),
);

console.log("\nchannel_target is a real marketing_channel label");

const enumLabels = new Set([
  ...[...(readSql(MIGRATION_087).match(/create type public\.marketing_channel as enum \(([^)]*)\)/) ?? ["", ""])[1].matchAll(/'([^']*)'/g)].map((m) => m[1]),
  ...[...readSql(MIGRATION_180).matchAll(/add value if not exists '([^']*)'/g)].map((m) => m[1]),
]);
check("the marketing_channel enum parses to at least nine labels", enumLabels.size >= 9, [...enumLabels]);

// Filtering the nulls out and asserting over what remains passes if EVERY
// target is null — a `channelTargetFor` that returned null throughout would
// write no `channel_target` on any post and this check would say nothing. The
// count is the stronger property and the one the contract actually claims:
// exactly one provider, the asset source, has no channel.
const derivedTargets = everything.map((p) => p.channelTarget);
const namedTargets = derivedTargets.filter((t) => t !== null);
check(
  "every provider but the asset source derives a channel target",
  namedTargets.length === providers.INTEGRATION_PROVIDERS.length - 1,
  derivedTargets,
);
check(
  "every derived channel target exists in the SQL enum",
  namedTargets.every((t) => enumLabels.has(t)),
  namedTargets.filter((t) => !enumLabels.has(t)),
);
check(
  "the asset source has no channel at all",
  pkgModule.channelTargetFor("higgsfield") === null,
);
check(
  "the first-party surface reuses the existing 'website' label",
  pkgModule.channelTargetFor("altair_site") === "website",
);

/* ================================================== state derivation ===== */

console.log("\nA package is never published while a destination is unsettled");

const posts = [
  { marketingPostId: "post-yt", provider: "youtube" },
  { marketingPostId: "post-tt", provider: "tiktok" },
];
const posted = (id) => ({ marketingPostId: id, provider: "x", deliveryState: "posted" });
const state = (deliveries) => pkgModule.derivePackageState(posts, deliveries);

check("no posts at all reads as draft", pkgModule.derivePackageState([], []) === "draft");
check("posts written but nothing attempted reads as approved", state([]) === "approved");
check(
  "one destination settled and the other untouched is still publishing",
  state([posted("post-yt")]) === "publishing",
);
check(
  "every destination posted reads as published",
  state([posted("post-yt"), posted("post-tt")]) === "published",
);

// Exhaustive over the delivery vocabulary: `in_flight` may or may not have
// completed, `draft` means bytes arrived but nothing is public, `failed` means
// nothing was created. None of them is `posted`, and none may be softened.
//
// The sweep runs one check per non-posted state, so an empty or truncated
// vocabulary would run ZERO checks, report zero failures, and look identical
// to a clean pass. Its shape is asserted before it is trusted to drive a loop.
check(
  "the delivery vocabulary loaded, with 'posted' and the three unsettled states",
  delivery.MARKETING_DELIVERY_STATES.length >= 4 &&
    delivery.MARKETING_DELIVERY_STATES.includes("posted"),
  delivery.MARKETING_DELIVERY_STATES,
);
for (const deliveryState of delivery.MARKETING_DELIVERY_STATES) {
  if (deliveryState === "posted") continue;
  check(
    `a destination in '${deliveryState}' keeps the package out of published`,
    state([
      posted("post-yt"),
      { marketingPostId: "post-tt", provider: "tiktok", deliveryState },
    ]) !== "published",
  );
}

check(
  "the unsettled destination is named, so an operator knows where to look",
  pkgModule.unsettledDestinations(posts, [posted("post-yt")]).join(",") === "tiktok",
);
check(
  "a post with no delivery row counts as unsettled, not as done",
  pkgModule.unsettledDestinations(posts, []).length === 2,
);
check(
  "packageIsFullyDelivered agrees with the derived state",
  pkgModule.packageIsFullyDelivered(posts, [posted("post-yt"), posted("post-tt")]) === true &&
    pkgModule.packageIsFullyDelivered(posts, [posted("post-yt")]) === false &&
    pkgModule.packageIsFullyDelivered([], []) === false,
);
// Archiving is a human withdrawing a package. No arrangement of posts and
// deliveries implies it, so a derivation must never overwrite it.
check(
  "the derivation never invents 'archived'",
  [
    pkgModule.derivePackageState([], []),
    state([]),
    state([posted("post-yt")]),
    state([posted("post-yt"), posted("post-tt")]),
    ...delivery.MARKETING_DELIVERY_STATES.map((deliveryState) =>
      state([{ marketingPostId: "post-yt", provider: "youtube", deliveryState }]),
    ),
  ].every((s) => s !== "archived"),
);
check(
  "every derived value is a declared package state",
  [
    pkgModule.derivePackageState([], []),
    state([]),
    state([posted("post-yt")]),
    state([posted("post-yt"), posted("post-tt")]),
  ].every((s) => pkgModule.PACKAGE_STATES.includes(s)),
);
check(
  "every package state has operator copy",
  pkgModule.PACKAGE_STATES.every((s) => {
    const text = pkgModule.describePackageState(s);
    return typeof text === "string" && text.length > 0;
  }),
);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
