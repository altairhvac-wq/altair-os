/**
 * The Settings → Integrations row projection.
 *
 * Every state this page can render is reachable only through a third party we
 * cannot summon on demand — a revoked consent, an app awaiting review, a
 * partially granted scope set. Testing them through a browser would mean
 * arranging for TikTok to be mid-review. The projection is pure, so every
 * state is reachable here instead.
 *
 * The checks that matter most are the honesty ones: no input may produce a
 * row that claims a connection which has not happened, and no row may ever
 * carry a credential VALUE.
 *
 * Run: node scripts/verify-integration-rows.mjs
 */
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

const rowsModule = await loadPureModule("shared/types/integration-row.ts", "introw");
const providerModule = await loadPureModule(
  "shared/types/integration-provider.ts",
  "introw",
);
const capModule = await loadPureModule(
  "shared/types/integration-capability.ts",
  "introw",
);
const connModule = await loadPureModule(
  "shared/types/marketing-channel-connection.ts",
  "introw",
);

const {
  buildIntegrationRows,
  INTEGRATION_STATE_TONE,
  INTEGRATION_STATE_LABEL,
  INTEGRATION_STATE_ACTION,
  INTEGRATION_SECTIONS,
  rowsForSection,
  formatIntegrationConnectFlash,
} = rowsModule;
const { INTEGRATION_PROVIDERS, INTEGRATION_KINDS } = providerModule;
const { INTEGRATION_CAPABILITIES } = capModule;
const { MARKETING_CHANNEL_STATES } = connModule;

const NOW = "2026-09-01T12:00:00.000Z";

/** Every provider configured, so states depend only on the account facts. */
const ALL_CONFIGURED = Object.fromEntries(
  INTEGRATION_PROVIDERS.map((p) => [p, true]),
);

const healthy = (provider, over = {}) => ({
  id: `acct_${provider}`,
  provider,
  status: "connected",
  publishCapability: "direct",
  tokenExpiresAt: "2026-12-01T00:00:00.000Z",
  hasRefreshToken: true,
  lastError: null,
  capabilityDetail: null,
  accountName: "Altair HVAC",
  resourceName: null,
  lastSuccessAt: "2026-08-30T00:00:00.000Z",
  ...over,
});

const build = (input) =>
  buildIntegrationRows({
    configuredProviders: ALL_CONFIGURED,
    accounts: [],
    nowIso: NOW,
    ...input,
  });

console.log("\nTotality — a new state or provider cannot be forgotten");

check(
  "every channel state has a tone",
  MARKETING_CHANNEL_STATES.every((s) => INTEGRATION_STATE_TONE[s] !== undefined),
  MARKETING_CHANNEL_STATES.filter((s) => !INTEGRATION_STATE_TONE[s]),
);
check(
  "every channel state has a pill label",
  MARKETING_CHANNEL_STATES.every(
    (s) => typeof INTEGRATION_STATE_LABEL[s] === "string" && INTEGRATION_STATE_LABEL[s].length > 0,
  ),
);
check(
  "every channel state has an action decision",
  MARKETING_CHANNEL_STATES.every((s) => INTEGRATION_STATE_ACTION[s] !== undefined),
);
check(
  "one row per provider, in registry order",
  build({}).map((r) => r.provider).join(",") === INTEGRATION_PROVIDERS.join(","),
);
check(
  "every integration kind has a section",
  INTEGRATION_KINDS.every((kind) =>
    INTEGRATION_SECTIONS.some((section) => section.kind === kind),
  ),
);
check(
  "every row lands in exactly one section",
  build({}).every(
    (row) =>
      INTEGRATION_SECTIONS.filter((s) => rowsForSection([row], s.kind).length === 1)
        .length === 1,
  ),
);

console.log("\nNo row may claim a connection that has not happened");

const noAccounts = build({});
check(
  "with no account rows, nothing reports connected",
  noAccounts.every((r) => r.state !== "DIRECT_PUBLISH_READY"),
  noAccounts.filter((r) => r.state === "DIRECT_PUBLISH_READY").map((r) => r.provider),
);
check(
  "with no account rows, nothing reports an identity",
  noAccounts.every((r) => r.identity === null),
);
check(
  "with no account rows, nothing offers Disconnect",
  noAccounts.every((r) => r.action !== "disconnect"),
);

const unconfigured = buildIntegrationRows({
  configuredProviders: Object.fromEntries(
    INTEGRATION_PROVIDERS.map((p) => [p, false]),
  ),
  accounts: [],
  nowIso: NOW,
});
// A provider needing no credentials (the first-party surface) is configured
// by definition, so it is exempt from the unconfigured expectation.
const needsCreds = (p) => INTEGRATION_CAPABILITIES[p].requiredEnvVars.length > 0;
check(
  "an unconfigured deployment reports NOT_CONFIGURED for every credentialled provider",
  unconfigured
    .filter((r) => needsCreds(r.provider))
    .every((r) => r.state === "NOT_CONFIGURED"),
  unconfigured.filter((r) => needsCreds(r.provider) && r.state !== "NOT_CONFIGURED").map((r) => r.provider),
);
check(
  "an unconfigured provider offers NO action — a Connect that cannot complete is worse than none",
  unconfigured
    .filter((r) => needsCreds(r.provider))
    .every((r) => r.action === "none" && r.connectPath === null),
);
check(
  "a provider needing no credentials is not reported unconfigured",
  unconfigured
    .filter((r) => !needsCreds(r.provider))
    .every((r) => r.state !== "NOT_CONFIGURED"),
);

console.log("\nNo credential value can reach the page");

check(
  "missingEnvVars carries NAMES only",
  unconfigured.every((r) =>
    r.missingEnvVars.every((v) => /^[A-Z][A-Z0-9_]*$/.test(v)),
  ),
  unconfigured.flatMap((r) => r.missingEnvVars.filter((v) => !/^[A-Z][A-Z0-9_]*$/.test(v))),
);
check(
  "a configured provider exposes no env var names at all",
  build({}).every((r) => r.missingEnvVars.length === 0),
);

console.log("\nState-specific behaviour");

const connected = build({ accounts: [healthy("facebook")] });
const fb = connected.find((r) => r.provider === "facebook");
check("a healthy connection reports DIRECT_PUBLISH_READY", fb.state === "DIRECT_PUBLISH_READY");
check("a healthy connection is success-toned", fb.tone === "success");
check("a healthy connection shows its identity", fb.identity === "Altair HVAC");
check("a healthy connection carries its account id", fb.connectedAccountId === "acct_facebook");
check("a healthy connection surfaces last success", fb.lastSuccessAt !== null);

const expiredNoRefresh = build({
  accounts: [
    healthy("facebook", {
      tokenExpiresAt: "2026-08-01T00:00:00.000Z",
      hasRefreshToken: false,
    }),
  ],
}).find((r) => r.provider === "facebook");
check(
  "an expired token without refresh asks for a reconnect",
  expiredNoRefresh.state === "REAUTH_REQUIRED" &&
    expiredNoRefresh.action === "reconnect",
);
check(
  "a reconnect offers a real path",
  typeof expiredNoRefresh.connectPath === "string" &&
    expiredNoRefresh.connectPath.length > 0,
);

const expiredWithRefresh = build({
  accounts: [healthy("facebook", { tokenExpiresAt: "2026-08-01T00:00:00.000Z" })],
}).find((r) => r.provider === "facebook");
check(
  "an expired token WITH refresh does not nag the human",
  expiredWithRefresh.state === "TOKEN_EXPIRED" &&
    expiredWithRefresh.action === "none",
);

const errored = build({
  accounts: [healthy("facebook", { status: "error", lastError: "Page token revoked." })],
}).find((r) => r.provider === "facebook");
check("an errored connection is danger-toned", errored.tone === "danger");
check("an errored connection surfaces the provider's reason", errored.detail.includes("revoked"));

const draftOnly = build({
  accounts: [healthy("tiktok", { publishCapability: "draft_only" })],
}).find((r) => r.provider === "tiktok");
check(
  "draft-only capability is reported as such, not as connected",
  draftOnly.state === "DRAFT_UPLOAD_ONLY" && draftOnly.statusLabel === "Drafts only",
);

const noCapability = build({
  accounts: [healthy("google_business", { publishCapability: "none" })],
}).find((r) => r.provider === "google_business");
check(
  "connected-but-not-permitted reports awaiting approval, never connected",
  noCapability.state === "API_ACCESS_REQUIRED" &&
    noCapability.statusLabel !== "Connected",
);

const connecting = build({ authorizeInFlight: ["youtube"] }).find(
  (r) => r.provider === "youtube",
);
check(
  "an authorize in flight reports CONNECTING and offers no second attempt",
  connecting.state === "CONNECTING" && connecting.action === "none",
);

console.log("\nNon-publishers are never publish targets");

const higgsfield = build({}).find((r) => r.provider === "higgsfield");
check("higgsfield sits in the creative-sources section", higgsfield.kind === "asset_source");
check(
  "higgsfield never renders a publish-channel connect path",
  higgsfield.connectPath === null,
);
const altairSite = build({}).find((r) => r.provider === "altair_site");
check("the Altair surface is first_party", altairSite.kind === "first_party");
check("the Altair surface advertises no OAuth path", altairSite.connectPath === null);

console.log("\nFlash messages are a closed vocabulary");

check(
  "an unknown error code is not echoed back into the page",
  !formatIntegrationConnectFlash({
    connectError: "<script>alert(1)</script>",
    provider: "facebook",
  }).message.includes("<script>"),
);
check(
  "an unknown provider does not echo the query value",
  !formatIntegrationConnectFlash({
    connected: "1",
    provider: "<img src=x>",
  }).message.includes("<img"),
);
check(
  "a known success names the provider",
  formatIntegrationConnectFlash({ connected: "1", provider: "youtube" }).message.includes(
    "YouTube",
  ),
);
check(
  "no flash without a signal",
  formatIntegrationConnectFlash({}) === null,
);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
