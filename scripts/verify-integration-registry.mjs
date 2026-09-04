/**
 * The provider registry and capability matrix.
 *
 * Every assertion here is about a STATIC fact — the shape of the matrix and
 * its agreement with the SQL enums — so this runs with no database, no
 * network and no credentials, and cannot publish anything.
 *
 * The check that earns this file's keep is the TS-union-vs-SQL-enum
 * comparison. That drift already happened: migration 143 added `youtube` and
 * `tiktok` to `marketing_connected_provider`, the TypeScript union was never
 * widened, and because the OAuth state module derived its provider allowlist
 * from the TypeScript side, neither provider could be connected at all. The
 * database was ready and the type was the blocker. Nothing caught it because
 * nothing compared the two.
 *
 * Run: node scripts/verify-integration-registry.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { loadPureModule } from "./lib/load-pure-module.mjs";

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

// The real module graph — capability imports provider, and both are loaded
// as themselves rather than flattened, so a circular or shadowed import
// would fail here instead of being masked.
const cap = await loadPureModule(
  "shared/types/integration-capability.ts",
  "intreg",
);
const providerModule = await loadPureModule(
  "shared/types/integration-provider.ts",
  "intreg",
);
const delivery = await loadPureModule(
  "shared/types/marketing-delivery.ts",
  "intreg",
);

const reg = { ...providerModule, ...cap };
const PROVIDERS = reg.INTEGRATION_PROVIDERS;
const CAPS = reg.INTEGRATION_CAPABILITIES;

console.log("\nRegistry completeness");

check(
  "every provider has exactly one capability entry",
  PROVIDERS.every((p) => CAPS[p] && CAPS[p].provider === p),
  PROVIDERS.filter((p) => !CAPS[p]),
);
check(
  "the matrix declares no provider outside the union",
  Object.keys(CAPS).every((p) => PROVIDERS.includes(p)),
  Object.keys(CAPS).filter((p) => !PROVIDERS.includes(p)),
);
check(
  "provider ids are unique",
  new Set(PROVIDERS).size === PROVIDERS.length,
);
check(
  "every entry declares a known kind",
  PROVIDERS.every((p) => reg.INTEGRATION_KINDS.includes(CAPS[p].kind)),
);

console.log("\nSecrets never leak through the registry");

// A capability table is rendered in a browser. A value here would ship a
// credential to every visitor, so the shape is constrained to NAMES.
check(
  "requiredEnvVars are NAMES only, never values",
  PROVIDERS.every((p) =>
    CAPS[p].requiredEnvVars.every((v) => /^[A-Z][A-Z0-9_]*$/.test(v)),
  ),
  PROVIDERS.flatMap((p) =>
    CAPS[p].requiredEnvVars.filter((v) => !/^[A-Z][A-Z0-9_]*$/.test(v)),
  ),
);
check(
  "no entry carries anything shaped like a secret",
  !JSON.stringify(CAPS).match(/secret["']?\s*:\s*["'][^"']+["']/i),
);

console.log("\nKind discipline");

// This check used to require a connect path on every publisher, and four
// providers satisfied it with paths pointing at routes that did not exist —
// a Connect button navigating to a 404. Requiring the STRING was the wrong
// invariant; requiring the CLAIM to be true is the right one, and
// `verify-youtube-connect.mjs` enforces it against the filesystem. What
// belongs here is only the shape: a path, when present, must look like the
// authorize route it claims to be.
check(
  "a declared connect path is an authorize route under the connected-accounts API",
  PROVIDERS.every(
    (p) =>
      CAPS[p].connectPath === null ||
      /^\/api\/marketing\/connected-accounts\/[a-z0-9-]+\/authorize$/.test(
        CAPS[p].connectPath,
      ),
  ),
  PROVIDERS.filter(
    (p) =>
      CAPS[p].connectPath !== null &&
      !/^\/api\/marketing\/connected-accounts\/[a-z0-9-]+\/authorize$/.test(
        CAPS[p].connectPath,
      ),
  ),
);
check(
  "at least one provider is actually connectable, so the shape check is not vacuous",
  PROVIDERS.some((p) => CAPS[p].connectPath !== null),
);
check(
  "a provider with authKind 'none' advertises no connect path",
  PROVIDERS.every(
    (p) => CAPS[p].authKind !== "none" || CAPS[p].connectPath === null,
  ),
);
check(
  "a non-publisher never advertises a connect path into the publish flow",
  PROVIDERS.filter((p) => CAPS[p].kind !== "publisher").every(
    (p) => CAPS[p].connectPath === null,
  ),
);
check(
  "higgsfield is an asset source, never a publisher",
  CAPS.higgsfield.kind === "asset_source" &&
    !reg.isPublisherProvider("higgsfield"),
);
check(
  "an asset source accepts no delivered media and no body text",
  CAPS.higgsfield.acceptsMediaKinds.length === 0 &&
    CAPS.higgsfield.maxAssets === 0 &&
    CAPS.higgsfield.bodyMaxChars === 0,
);
check(
  "altair_site is first-party and needs no refresh token",
  CAPS.altair_site.kind === "first_party" &&
    CAPS.altair_site.authKind === "none" &&
    CAPS.altair_site.requiresRefreshToken === false,
);
check(
  "PUBLISHER_PROVIDERS is derived, not hand-listed",
  reg.PUBLISHER_PROVIDERS.every((p) => CAPS[p].kind === "publisher") &&
    PROVIDERS.filter((p) => CAPS[p].kind === "publisher").length ===
      reg.PUBLISHER_PROVIDERS.length,
);

console.log("\nSafe defaults");

// A caller bug must never become a public post on a real brand account.
check(
  "no provider defaults to public visibility",
  PROVIDERS.every((p) => CAPS[p].defaultVisibility !== "public"),
  PROVIDERS.filter((p) => CAPS[p].defaultVisibility === "public"),
);
check(
  "every provider requires manual approval at this stage",
  PROVIDERS.every((p) => CAPS[p].requiresManualApproval === true),
  PROVIDERS.filter((p) => !CAPS[p].requiresManualApproval),
);
check(
  "reddit is single-attempt — a retry reads as the spam behaviour their rules catch",
  CAPS.reddit.maxAttempts === 1,
);
check(
  "a provider requiring media accepts at least one media kind",
  PROVIDERS.every(
    (p) => !CAPS[p].requiresMedia || CAPS[p].acceptsMediaKinds.length > 0,
  ),
);
check(
  "maxAssets is 0 exactly when no media kind is accepted",
  PROVIDERS.every(
    (p) => (CAPS[p].maxAssets === 0) === (CAPS[p].acceptsMediaKinds.length === 0),
  ),
);

console.log("\nPolling cannot outlive the in-flight grace window");

// A poll that outlasts the grace window would let a delivery be treated as
// abandoned while it is still legitimately running — and a second attempt
// would double-post, which is the exact defect migration 143 exists to close.
check(
  `every pollBudgetMs < DELIVERY_IN_FLIGHT_GRACE_MS (${delivery.DELIVERY_IN_FLIGHT_GRACE_MS})`,
  PROVIDERS.every(
    (p) => CAPS[p].pollBudgetMs < delivery.DELIVERY_IN_FLIGHT_GRACE_MS,
  ),
  PROVIDERS.filter(
    (p) => CAPS[p].pollBudgetMs >= delivery.DELIVERY_IN_FLIGHT_GRACE_MS,
  ).map((p) => `${p}=${CAPS[p].pollBudgetMs}`),
);

console.log("\nOperator copy is total");

const GAPS = [
  { reason: "not_a_publisher" },
  { reason: "media_kind_unsupported", kind: "video" },
  { reason: "media_required" },
  { reason: "too_many_assets", count: 99 },
  { reason: "title_too_long", length: 999 },
  { reason: "body_too_long", length: 999 },
  { reason: "title_required" },
];
check(
  "describeCapabilityGap returns copy for every reason and every provider",
  PROVIDERS.every((p) =>
    GAPS.every((gap) => {
      const text = reg.describeCapabilityGap(gap, CAPS[p]);
      return typeof text === "string" && text.length > 0;
    }),
  ),
);

console.log("\nTypeScript union vs SQL enums");

// The check that would have caught the youtube/tiktok drift.
const enumLabels = (files, typeName) => {
  const labels = [];
  for (const file of files) {
    // Never skip a named migration silently. A renamed file would otherwise
    // turn this whole comparison into a vacuous pass — which is precisely
    // how the drift this verifier exists to catch went unnoticed before.
    if (!existsSync(file)) {
      failures += 1;
      console.error(`  FAIL  migration named but missing on disk: ${file}`);
      continue;
    }
    const sql = readFileSync(file, "utf8").replace(/--[^\n]*/g, "");
    const created = sql.match(
      new RegExp(`create type public\\.${typeName} as enum\\s*\\(([^)]*)\\)`, "i"),
    );
    if (created) {
      for (const m of created[1].matchAll(/'([a-z0-9_]+)'/gi)) labels.push(m[1]);
    }
    for (const m of sql.matchAll(
      new RegExp(
        `alter type public\\.${typeName} add value(?: if not exists)? '([a-z0-9_]+)'`,
        "gi",
      ),
    )) {
      labels.push(m[1]);
    }
  }
  return labels;
};

const MIGRATIONS = [
  "supabase/migrations/089_marketing_connected_accounts_foundation.sql",
  "supabase/migrations/143_marketing_channel_publishing.sql",
  "supabase/migrations/179_integration_provider_enum.sql",
];
const sqlProviders = enumLabels(MIGRATIONS, "marketing_connected_provider");

check(
  "every SQL provider label exists in the TypeScript union",
  sqlProviders.every((label) => PROVIDERS.includes(label)),
  sqlProviders.filter((label) => !PROVIDERS.includes(label)),
);
check(
  "every TypeScript provider exists as a SQL label",
  PROVIDERS.every((p) => sqlProviders.includes(p)),
  PROVIDERS.filter((p) => !sqlProviders.includes(p)),
);
check(
  "the SQL enum declares no duplicate labels",
  new Set(sqlProviders).size === sqlProviders.length,
);

const channelLabels = enumLabels(
  [
    "supabase/migrations/087_marketing_posts_foundation.sql",
    "supabase/migrations/180_marketing_channel_enum.sql",
  ],
  "marketing_channel",
);

check(
  "every publisher has a marketing_channel label to be filed under",
  reg.PUBLISHER_PROVIDERS.every((p) => channelLabels.includes(p)),
  reg.PUBLISHER_PROVIDERS.filter((p) => !channelLabels.includes(p)),
);
check(
  "higgsfield is NOT a marketing channel — an asset source cannot receive a post",
  !channelLabels.includes("higgsfield"),
);

// The same drift, one file over. `MarketingChannel` sat three labels behind
// the SQL enum, and `app/actions/marketing-posts.ts` builds its accepted-
// channel Set from MARKETING_CHANNEL_OPTIONS — so a missing label was not
// merely a gap in a dropdown, it was a Server Action refusing a value the
// database would happily have stored.
const postModule = await loadPureModule("shared/types/marketing-post.ts", "intreg");
const optionValues = postModule.MARKETING_CHANNEL_OPTIONS.map((o) => o.value);

check(
  "every SQL marketing_channel label is offered as an option",
  channelLabels.every((label) => optionValues.includes(label)),
  channelLabels.filter((label) => !optionValues.includes(label)),
);
check(
  "every offered channel option exists as a SQL label",
  optionValues.every((value) => channelLabels.includes(value)),
  optionValues.filter((value) => !channelLabels.includes(value)),
);
check(
  "the channel options list has no duplicates",
  new Set(optionValues).size === optionValues.length,
);
check(
  "the SQL channel enum was actually parsed, so the comparison is not vacuous",
  channelLabels.length >= 5,
  channelLabels,
);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
