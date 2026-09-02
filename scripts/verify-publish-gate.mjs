/**
 * The kill switch, exercised.
 *
 * ===================== WHY THIS SCRIPT CAN EXIST =====================
 * `lib/publishing/gate.ts` is pure: relative imports of pure sibling types and
 * nothing else. It holds no transport, no client and no credential, so every
 * branch of the switch that guards the only irreversible action in the product
 * can be driven here with no database, no network and no provider account.
 * This script cannot publish anything, by construction.
 *
 * The environment is INJECTED on every call, and this process NEVER writes to
 * its own — a verifier that moved the global position of a kill switch would
 * leave it in an unknown position for whatever ran next, and for the other
 * four thousand assertions in this same file. The two places that must observe
 * the real `process.env` binding instead spawn a child with a controlled
 * environment; see `inChild`.
 *
 * ================= WHY EVERY CHECK LOOPS THE REGISTRY =================
 * Adding a provider must not be able to open a hole. Every gate assertion runs
 * across `INTEGRATION_PROVIDERS`, so a tenth provider inherits the whole suite
 * automatically, and the registry itself is pinned to the nine known names so
 * that adding one fails here until a human has decided what the gate does with
 * it.
 *
 * That sweep has one blind spot by construction, covered separately below: it
 * can only ask about names that are IN the registry, and the value the gate
 * sees in production comes off a database row whose enum has drifted from this
 * union before.
 *
 * Run: node scripts/verify-publish-gate.mjs
 */
import { execFileSync } from "node:child_process";

import { loadPureModule } from "./lib/load-pure-module.mjs";

const loadTs = (path) => loadPureModule(path, "gate");

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

const gate = await loadTs("lib/publishing/gate.ts");
const prov = await loadTs("shared/types/integration-provider.ts");
const caps = await loadTs("shared/types/integration-capability.ts");
const conn = await loadTs("shared/types/marketing-channel-connection.ts");

const PROVIDERS = prov.INTEGRATION_PROVIDERS;
const KINDS = prov.INTEGRATION_KINDS;
const STATES = conn.MARKETING_CHANNEL_STATES;
const CAPABILITY = caps.INTEGRATION_CAPABILITIES;

const LIVE_ENV = { MARKETING_PUBLISH_MODE: "live" };
const APPROVED_AT = "2026-09-01T10:00:00.000Z";

/** The stored kind that agrees with the registry, i.e. a well-formed row. */
const storedKindFor = (provider) => CAPABILITY[provider].kind;
const isPublisher = (provider) => CAPABILITY[provider].kind === "publisher";

/** Everything correct, for `provider`, unless overridden. */
function ask(provider, over = {}) {
  return gate.assertPublishAllowed({
    provider,
    integrationKind: storedKindFor(provider),
    channelState: "DIRECT_PUBLISH_READY",
    jobApprovedAt: APPROVED_AT,
    account: null,
    env: LIVE_ENV,
    ...over,
  });
}

const refused = (result) => typeof result === "string" && result.length > 0;

/* --------------------------------------------- the real environment, at arm's length */

/**
 * Evaluate one expression against a freshly loaded gate in a CHILD process
 * whose `MARKETING_PUBLISH_MODE` this file controls. Returns the child's
 * stdout.
 *
 * ============ WHY A CHILD PROCESS AND NOT AN ASSERTION HERE ============
 * The default parameter `env: PublishModeEnv = process.env` is the binding that
 * makes production callers — who pass no `env` at all — read the real switch.
 * The checks this replaces asserted it as
 * `resolvePublishMode() === resolvePublishMode(process.env)`. Both sides call
 * the same function, so they agree for ANY default binding as long as the
 * variable is unset, which on a developer machine and in CI it always is: a
 * resolver whose default was bound to `{}` satisfied that check. It could not
 * fail, so it proved nothing.
 *
 * Reading the binding honestly needs an environment that actually differs, and
 * this process must not be the one to change it — everything else in this file
 * depends on the kill switch staying where it was found. So the environment is
 * built as a COPY, the switch is set or removed in the copy alone, and a child
 * reads that copy as its own `process.env`.
 */
const CHILD_PRELUDE =
  `const { loadPureModule } = await import(${JSON.stringify(
    new URL("./lib/load-pure-module.mjs", import.meta.url).href,
  )}); ` +
  `const gate = await loadPureModule("lib/publishing/gate.ts", "gate-child"); `;

function inChild(expression, publishMode) {
  const env = { ...process.env };
  // Deleted rather than assumed absent: the "unset" case must assert the same
  // thing on a machine that happens to have the switch armed.
  delete env[gate.MARKETING_PUBLISH_MODE_ENV];
  if (publishMode !== undefined) {
    env[gate.MARKETING_PUBLISH_MODE_ENV] = publishMode;
  }

  return execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `${CHILD_PRELUDE}process.stdout.write(String(${expression}));`,
    ],
    // `loadPureModule` resolves its path against the working directory, the
    // same way this file's own load did, so the child must inherit it.
    { env, cwd: process.cwd(), encoding: "utf8" },
  ).trim();
}

/* ------------------------------------------------------- the mode truth table */

console.log("\nresolvePublishMode — the full truth table");

const modeOf = (raw) => gate.resolvePublishMode({ MARKETING_PUBLISH_MODE: raw });

check(
  "the variable is named MARKETING_PUBLISH_MODE",
  gate.MARKETING_PUBLISH_MODE_ENV === "MARKETING_PUBLISH_MODE",
);
check(
  "there are exactly three modes, worst to best",
  gate.PUBLISH_MODES.join(",") === "off,dry_run,live",
  gate.PUBLISH_MODES,
);
check("an unset variable is off", gate.resolvePublishMode({}) === "off");
check(
  "an empty environment object is off",
  gate.resolvePublishMode(Object.freeze({})) === "off",
);

// Each row is [raw value, expected mode, why this row exists at all].
const MODE_TABLE = [
  ["live", "live", "the one deliberate literal that arms live publishing"],
  ["dry_run", "dry_run", "rehearsal is its own mode, not a flavour of live"],
  ["off", "off", "the documented way to disarm"],
  [undefined, "off", "a present-but-undefined value is not a decision"],
  ["", "off", "an unset Vercel variable arrives as empty, not missing"],
  ["   ", "off", "whitespace is not an assertion"],
  ["LIVE", "off", "case-folding would let a shouted value arm publishing"],
  ["Live", "off", "nor a capitalized one"],
  ["live ", "off", "a trailing space is a keystroke, not a decision"],
  [" live", "off", "nor is a leading one"],
  ["live\n", "off", "a trailing newline out of a .env file must not arm it"],
  ["live\r", "off", "nor a CR from a CRLF .env file on Windows"],
  ["\tlive", "off", "nor a tab"],
  ["1", "off", "this is not a boolean"],
  ["true", "off", "nor is this"],
  ["yes", "off", "nor is this"],
  ["on", "off", "nor is this"],
  ["enabled", "off", "an approving word is still not the literal"],
  ["DRY_RUN", "off", "even the safe mode requires its exact literal"],
  ["dry-run", "off", "a hyphen is a different value"],
  ["dry_run ", "off", "and trailing space is not trimmed for it either"],
  ["publish", "off", "an unrecognized value is a misconfiguration"],
  ["off ", "off", "an unrecognized value lands on off, which is where it was"],
];

for (const [raw, expected, why] of MODE_TABLE) {
  const label = raw === undefined ? "<undefined>" : JSON.stringify(raw);
  check(
    `${label} resolves to ${expected} — ${why}`,
    modeOf(raw) === expected,
    modeOf(raw),
  );
}

check(
  "no input can produce a mode outside the declared vocabulary",
  MODE_TABLE.every(([raw]) => gate.PUBLISH_MODES.includes(modeOf(raw))),
);
check(
  'isLivePublishingArmed is true for the exact literal only',
  gate.isLivePublishingArmed(LIVE_ENV) === true &&
    gate.isLivePublishingArmed({ MARKETING_PUBLISH_MODE: "LIVE " }) === false &&
    gate.isLivePublishingArmed({}) === false,
);

// The default parameter binds to the REAL process.env — asserted against two
// environments that differ, in a process this file does not share. A resolver
// defaulted to `{}`, or to any other object, prints "off" for the first of
// these; only one bound to `process.env` can print "live".
const CHILD_MODE_ARMED = inChild("gate.resolvePublishMode()", "live");
const CHILD_MODE_UNSET = inChild("gate.resolvePublishMode()", undefined);
check(
  "omitting env reads the real environment: an injected live value resolves to live",
  CHILD_MODE_ARMED === "live",
  CHILD_MODE_ARMED,
);
check(
  "omitting env reads the real environment: an absent variable resolves to off",
  CHILD_MODE_UNSET === "off",
  CHILD_MODE_UNSET,
);

/* --------------------------------------------------- the registry is pinned */

console.log("\nThe registry the gate must decide for");

check(
  "there are exactly nine providers",
  PROVIDERS.length === 9,
  PROVIDERS.length,
);
check(
  "and they are the nine this file has decided about — a tenth must fail here first",
  PROVIDERS.join(",") ===
    "facebook,instagram,google_business,youtube,tiktok,linkedin,reddit,higgsfield,altair_site",
  PROVIDERS.join(","),
);
check(
  "seven of them are publish destinations; two can never be",
  PROVIDERS.filter(isPublisher).length === 7 &&
    !isPublisher("higgsfield") &&
    !isPublisher("altair_site"),
);

/* -------------------------------------------- providers outside the registry */

console.log("\nOff-registry providers — the refusal contract is total, not merely typed");

/**
 * Every other loop in this file iterates `INTEGRATION_PROVIDERS`, so every
 * provider it asks about is in the registry by construction — the sweep cannot
 * see what the gate does with a name that is not.
 *
 * It has to. `PublishGateInput.provider` is TYPED `IntegrationProvider`, but
 * the value arrives on a `marketing_connected_accounts` row and
 * `row.provider as IntegrationProvider` is a cast, not a check. The SQL enum
 * and this union have drifted apart before: migration 143 added `youtube` and
 * `tiktok` to `marketing_connected_provider` and the union did not learn them
 * for eighteen months. These are the strings the next such drift hands the gate.
 *
 * A throw is the specific outcome that must not happen, and not merely for
 * tidiness: `gate.ts` states that refusals are RETURNED because a throw lands
 * in a caller's `catch` written to settle a delivery FAILED, which records a
 * provider failure for a publish that never left the building.
 */
const OFF_REGISTRY = [
  ["threads", "a real platform this build has not learned — the shape of the next drift"],
  ["", "an empty provider column"],
  ["FACEBOOK", "a case variant is a different label, not a near miss"],
  ["facebook ", "and so is one carrying a trailing space"],
  ["toString", "an inherited prototype key resolves to a function, survives a `.kind` read, and refused while calling the provider \"undefined\""],
  ["constructor", "likewise"],
  ["hasOwnProperty", "likewise"],
  ["valueOf", "likewise"],
  ["__proto__", "resolves to the prototype object rather than to undefined"],
  ["FACEBOOK_APP_SECRET", "a credential-shaped name must not be echoed into operator copy"],
  ["a".repeat(64), "nor must an opaque token-shaped run"],
];

/** Kept apart from the sweep's refusals: these name no provider, deliberately. */
const offRegistrySentences = new Set();

/**
 * `ask` cannot be reused here: it derives `integrationKind` from
 * `CAPABILITY[provider]`, so the VERIFIER would throw on these names before the
 * gate ever saw them, and the throw would be attributed to the gate.
 *
 * `publisher` is the stored kind to send, because it is the one migration 181's
 * `not null default 'publisher'` actually produces on rows nothing else wrote.
 */
const askOffRegistry = (provider, over = {}) =>
  gate.assertPublishAllowed({
    provider,
    integrationKind: "publisher",
    channelState: "DIRECT_PUBLISH_READY",
    jobApprovedAt: APPROVED_AT,
    account: null,
    env: LIVE_ENV,
    ...over,
  });

for (const [provider, why] of OFF_REGISTRY) {
  let result;
  let thrown = null;
  try {
    result = askOffRegistry(provider);
  } catch (error) {
    thrown = error;
  }

  if (thrown === null && refused(result)) offRegistrySentences.add(result);

  check(
    `${JSON.stringify(provider).slice(0, 24)}: refused, not thrown — ${why}`,
    thrown === null && refused(result),
    thrown ? `threw ${thrown.constructor.name}: ${thrown.message}` : result,
  );
}

// Total, not merely correct on the happy path: no stored kind, connection state
// or publish mode turns an unrecognized provider into a destination, and none of
// them reaches the unguarded registry index either.
let offRegistryCombinations = 0;
let offRegistryThrew = 0;
let offRegistryAllowed = 0;
for (const [provider] of OFF_REGISTRY) {
  for (const kind of KINDS) {
    for (const state of STATES) {
      for (const env of [{}, { MARKETING_PUBLISH_MODE: "dry_run" }, LIVE_ENV]) {
        offRegistryCombinations += 1;
        try {
          const result = askOffRegistry(provider, {
            integrationKind: kind,
            channelState: state,
            env,
          });
          if (result === null) offRegistryAllowed += 1;
          else offRegistrySentences.add(result);
        } catch {
          offRegistryThrew += 1;
        }
      }
    }
  }
}

check(
  `all ${offRegistryCombinations} off-registry combinations returned rather than threw`,
  offRegistryThrew === 0,
  offRegistryThrew,
);
check(
  "no off-registry provider is ever allowed, under any combination",
  offRegistryAllowed === 0,
  offRegistryAllowed,
);
check(
  "every off-registry refusal is a finished sentence",
  [...offRegistrySentences].every((text) => /[.…!?]$/.test(text.trim())),
  [...offRegistrySentences],
);
check(
  "an off-registry refusal names the next step on both sides of the drift",
  [...offRegistrySentences].every(
    (text) =>
      text.includes("Choose a supported publishing channel") &&
      text.includes("deploy a build that knows this one"),
  ),
  [...offRegistrySentences],
);

/* ------------------------------------------------------------- the kind gate */

console.log("\nKind — an asset source is never a destination");

/**
 * Which kinds may be published to.
 *
 * `asset_source` never can: it produces creative, and migration 181's header
 * says a publish to it must stay unrepresentable.
 *
 * `first_party` NOW CAN, and that changed deliberately. It was refused while
 * the Altair site had no publisher — a destination nothing can write to is
 * not a destination — and migration 187 gave it one. The dispatcher routes on
 * the adapter's kind, so a first-party destination reaches an internal
 * database write through `publishFirstParty` and can never reach `publish`.
 * The kill switch, the recorded approval and the delivery ledger apply to it
 * exactly as they do to an external provider.
 */
const isDestination = (provider) => CAPABILITY[provider].kind !== "asset_source";

for (const provider of PROVIDERS) {
  const label = CAPABILITY[provider].label;

  // A well-formed row, everything else perfect.
  const wellFormed = ask(provider);
  check(
    `${provider}: a well-formed row is ${isDestination(provider) ? "allowed" : "refused"}`,
    isDestination(provider) ? wellFormed === null : refused(wellFormed),
    wellFormed,
  );

  if (!isDestination(provider)) {
    check(
      `${provider}: the refusal says it does not receive published content`,
      (wellFormed ?? "").includes(`${label} does not receive published content.`),
      wellFormed,
    );
    check(
      `${provider}: and names a publishing channel as the next step`,
      (wellFormed ?? "").includes("Choose a publishing channel as the destination"),
      wellFormed,
    );
  }

  // Migration 181 defaults integration_kind to 'publisher'. A non-publisher row
  // that still carries that default must not become a destination because of it.
  const claimsPublisher = ask(provider, { integrationKind: "publisher" });
  check(
    `${provider}: a row claiming 'publisher' cannot override the registry`,
    isPublisher(provider) ? claimsPublisher === null : refused(claimsPublisher),
    claimsPublisher,
  );

  // Every other stored kind is refused, whatever the provider is.
  for (const kind of KINDS) {
    if (kind === storedKindFor(provider)) continue;
    const mismatched = ask(provider, { integrationKind: kind });
    check(
      `${provider}: a row stored as '${kind}' is refused`,
      refused(mismatched),
      mismatched,
    );
  }
}

check(
  "a stored kind that disagrees with the registry is named as a disagreement",
  (ask("facebook", { integrationKind: "asset_source" }) ?? "").includes(
    "the record and the registry disagree",
  ),
  ask("facebook", { integrationKind: "asset_source" }),
);

/* ------------------------------------------------------------- the mode gate */

console.log("\nMode — nothing publishes until a human arms the deployment");

for (const provider of PROVIDERS.filter(isPublisher)) {
  const off = ask(provider, { env: {} }) ?? "";
  check(`${provider}: an unarmed deployment refuses`, refused(off), off);
  check(
    `${provider}: and names MARKETING_PUBLISH_MODE and the exact literal`,
    off.includes("MARKETING_PUBLISH_MODE") && off.includes('"live"'),
    off,
  );
  check(
    `${provider}: and says nothing was sent`,
    off.includes("nothing was sent to"),
    off,
  );

  const dry = ask(provider, { env: { MARKETING_PUBLISH_MODE: "dry_run" } }) ?? "";
  check(`${provider}: dry-run refuses`, refused(dry), dry);
  check(
    `${provider}: and says the request was prepared but not sent`,
    dry.includes("prepared but not sent"),
    dry,
  );

  for (const nearly of ["LIVE", "Live", "live ", " live", "live\n", "1", "true"]) {
    const near = ask(provider, { env: { MARKETING_PUBLISH_MODE: nearly } });
    check(
      `${provider}: ${JSON.stringify(nearly)} does not arm the gate`,
      refused(near),
      near,
    );
  }

  check(`${provider}: the exact literal arms it`, ask(provider) === null);
}

// The same binding, one level up: a production caller passes no `env` at all,
// so the gate's own `resolvePublishMode(input.env)` must fall through to the
// real switch. Two differing environments, and the outcomes must differ with
// them — comparing the omitted call against `env: process.env` would compare a
// function with itself and agree whatever the default was bound to.
const GATE_IN_CHILD =
  `gate.assertPublishAllowed({ provider: "facebook", integrationKind: "publisher", ` +
  `channelState: "DIRECT_PUBLISH_READY", jobApprovedAt: ${JSON.stringify(APPROVED_AT)} }) ` +
  `=== null ? "ALLOWED" : "REFUSED"`;
const CHILD_GATE_ARMED = inChild(GATE_IN_CHILD, "live");
const CHILD_GATE_UNSET = inChild(GATE_IN_CHILD, undefined);
check(
  "omitting env on the gate reads the real environment: an armed deployment allows",
  CHILD_GATE_ARMED === "ALLOWED",
  CHILD_GATE_ARMED,
);
check(
  "omitting env on the gate reads the real environment: an unset variable refuses",
  CHILD_GATE_UNSET === "REFUSED",
  CHILD_GATE_UNSET,
);

/* ------------------------------------------------------ the channel-state gate */

console.log("\nChannel state — canAcceptContent is the only answer consulted");

for (const provider of PROVIDERS.filter(isPublisher)) {
  const descriptor = conn.MARKETING_CHANNEL_DESCRIPTORS[provider];

  for (const state of STATES) {
    const result = ask(provider, { channelState: state });
    const acceptable = conn.canAcceptContent(state);

    check(
      `${provider}/${state}: ${acceptable ? "allowed" : "refused"}, matching canAcceptContent`,
      acceptable ? result === null : refused(result),
      result,
    );

    if (!acceptable) {
      check(
        `${provider}/${state}: the refusal reuses the channel state machine's copy`,
        (result ?? "").includes(
          conn.describeMarketingChannelState(state, descriptor, null),
        ),
        result,
      );
    }
  }

  // The three states an optimistic caller is most likely to treat as fine.
  for (const state of ["TOKEN_EXPIRED", "API_ACCESS_REQUIRED", "ERROR"]) {
    check(
      `${provider}/${state}: refused`,
      refused(ask(provider, { channelState: state })),
    );
  }

  // The provider's own words survive into the refusal, so the operator is not
  // handed a generic sentence when the provider explained itself.
  const withDetail = ask(provider, {
    channelState: "ERROR",
    account: {
      status: "error",
      publishCapability: "none",
      tokenExpiresAt: null,
      hasRefreshToken: false,
      lastError: "The Page has been unpublished.",
      capabilityDetail: null,
      accountName: null,
      resourceName: null,
    },
  });
  check(
    `${provider}: a provider error is quoted rather than flattened`,
    (withDetail ?? "").includes("The Page has been unpublished."),
    withDetail,
  );
}

/* --------------------------------------------------------- the approval gate */

console.log("\nApproval — the second key, held by the operator");

check(
  "every provider currently requires a human approval per publish",
  PROVIDERS.every((provider) => CAPABILITY[provider].requiresManualApproval),
  PROVIDERS.filter((p) => !CAPABILITY[p].requiresManualApproval),
);

for (const provider of PROVIDERS.filter(isPublisher)) {
  const label = CAPABILITY[provider].label;

  const none = ask(provider, { jobApprovedAt: null }) ?? "";
  check(`${provider}: no approval recorded is refused`, refused(none), none);
  check(
    `${provider}: and the refusal names approving it for this destination`,
    none.includes(`Approve it for ${label}`),
    none,
  );
  check(
    `${provider}: and says nothing was sent`,
    none.includes("nothing was sent"),
    none,
  );

  for (const notAnApproval of ["", "   ", "yes", "approved", "not-a-timestamp"]) {
    check(
      `${provider}: ${JSON.stringify(notAnApproval)} is not an approval`,
      refused(ask(provider, { jobApprovedAt: notAnApproval })),
    );
  }

  check(
    `${provider}: a recorded instant is an approval`,
    ask(provider, { jobApprovedAt: APPROVED_AT }) === null,
  );
}

/* -------------------------------------------------------- the exhaustive sweep */

console.log("\nEvery combination — nothing reaches a provider by accident");

const MODES_UNDER_TEST = [
  {},
  { MARKETING_PUBLISH_MODE: "off" },
  { MARKETING_PUBLISH_MODE: "dry_run" },
  { MARKETING_PUBLISH_MODE: "live" },
  { MARKETING_PUBLISH_MODE: "LIVE " },
];
const APPROVALS = [null, "", "nonsense", APPROVED_AT];

let combinations = 0;
let threw = 0;
let malformed = 0;
const allowedBy = new Map(PROVIDERS.map((provider) => [provider, 0]));
const wronglyAllowed = [];
const wronglyRefused = [];
/** Deduplicated: the sweep repeats each sentence hundreds of times. */
const refusalTexts = new Set();

for (const provider of PROVIDERS) {
  for (const kind of KINDS) {
    for (const state of STATES) {
      for (const env of MODES_UNDER_TEST) {
        for (const jobApprovedAt of APPROVALS) {
          combinations += 1;

          let result;
          try {
            result = gate.assertPublishAllowed({
              provider,
              integrationKind: kind,
              channelState: state,
              jobApprovedAt,
              account: null,
              env,
            });
          } catch {
            threw += 1;
            continue;
          }

          // Restated independently of the implementation: all four facts, or no.
          const shouldAllow =
            // The stored kind and the registry must agree, and neither may
            // be an asset source. `first_party` is a legitimate destination
            // since migration 187 — an internal write reached through
            // `publishFirstParty`, under the same switch, approval and
            // ledger as an external post.
            kind === CAPABILITY[provider].kind &&
            CAPABILITY[provider].kind !== "asset_source" &&
            env.MARKETING_PUBLISH_MODE === "live" &&
            conn.canAcceptContent(state) &&
            (!CAPABILITY[provider].requiresManualApproval ||
              jobApprovedAt === APPROVED_AT);

          if (result === null) {
            allowedBy.set(provider, allowedBy.get(provider) + 1);
            if (!shouldAllow) {
              wronglyAllowed.push({ provider, kind, state, env, jobApprovedAt });
            }
            continue;
          }

          if (shouldAllow) {
            wronglyRefused.push({ provider, kind, state, env, jobApprovedAt });
          }
          // `CONNECTING` legitimately ends in an ellipsis, so the assertion is
          // "a finished sentence", not "a full stop".
          if (typeof result !== "string" || !/[.…!?]$/.test(result.trim())) {
            malformed += 1;
          }
          refusalTexts.add(result);
        }
      }
    }
  }
}

check(
  `all ${combinations} combinations were evaluated without throwing`,
  threw === 0,
  threw,
);
check(
  "no combination is allowed that should not be",
  wronglyAllowed.length === 0,
  wronglyAllowed.slice(0, 5),
);
check(
  "no combination is refused that should not be",
  wronglyRefused.length === 0,
  wronglyRefused.slice(0, 5),
);
check(
  "every refusal is a non-empty sentence",
  malformed === 0,
  malformed,
);
check(
  "an asset source is never allowed, under any combination",
  allowedBy.get("higgsfield") === 0,
  allowedBy.get("higgsfield"),
);
check(
  "A FIRST-PARTY SURFACE IS ALLOWED ONLY WHEN EVERY OTHER FACT HOLDS",
  // It is a destination now, so "never allowed" is the wrong assertion. What
  // must remain true is that it earns its way through the same four checks
  // as anything else — the sweep above already fails any combination that
  // gets through without them.
  allowedBy.get("altair_site") > 0,
  allowedBy.get("altair_site"),
);
check(
  "a first-party surface is still refused when publishing is disarmed",
  refused(
    gate.assertPublishAllowed({
      provider: "altair_site",
      integrationKind: "first_party",
      channelState: "DIRECT_PUBLISH_READY",
      jobApprovedAt: APPROVED_AT,
      account: null,
      env: {},
    }),
  ),
);
check(
  "a first-party surface is still refused without a recorded approval",
  refused(
    gate.assertPublishAllowed({
      provider: "altair_site",
      integrationKind: "first_party",
      channelState: "DIRECT_PUBLISH_READY",
      jobApprovedAt: null,
      account: null,
      env: LIVE_ENV,
    }),
  ),
);
check(
  "every publisher has at least one path through, so the gate is not merely closed",
  PROVIDERS.filter(isPublisher).every(
    (provider) => allowedBy.get(provider) > 0,
  ),
  [...allowedBy],
);
check(
  "every provider in the registry was swept",
  [...allowedBy.keys()].length === PROVIDERS.length && PROVIDERS.length === 9,
);

/* ------------------------------------------------------------ refusal hygiene */

console.log("\nRefusal hygiene");

const sentences = [...refusalTexts];

const ENV_LOOKING = /[A-Z][A-Z0-9_]{4,}/g;
const leaked = new Set();
for (const text of sentences) {
  for (const token of text.match(ENV_LOOKING) ?? []) {
    if (token !== "MARKETING_PUBLISH_MODE") leaked.add(token);
  }
}
check(
  "the only variable any refusal names is MARKETING_PUBLISH_MODE",
  leaked.size === 0,
  [...leaked],
);

// The capability matrix carries the NAME of every provider credential. None of
// them belongs in operator copy, and a refusal built by interpolating a
// connection's configuration is how one would get there.
const CREDENTIAL_ENV_NAMES = [
  ...new Set(PROVIDERS.flatMap((provider) => CAPABILITY[provider].requiredEnvVars)),
];
check(
  "no refusal names a provider credential variable",
  sentences.every(
    (text) => !CREDENTIAL_ENV_NAMES.some((name) => text.includes(name)),
  ),
  CREDENTIAL_ENV_NAMES,
);
check(
  "no refusal carries an opaque token-shaped run of characters",
  sentences.every((text) => !/[A-Za-z0-9_-]{24,}/.test(text)),
);
check(
  "every refusal names the provider or the switch",
  sentences.every(
    (text) =>
      text.includes("MARKETING_PUBLISH_MODE") ||
      PROVIDERS.some((provider) => text.includes(CAPABILITY[provider].label)),
  ),
);

// The off-registry refusals are held to the same hygiene, and to one rule the
// others cannot break: a provider name that just failed the registry check is
// the one string in this system nothing can vouch for, so it is never quoted
// back. `FACEBOOK_APP_SECRET` and a 64-character run are in `OFF_REGISTRY`
// precisely so that a `${provider}` echo fails here rather than reaching an
// operator.
const offRegistry = [...offRegistrySentences];

check(
  "no off-registry refusal quotes the unrecognized provider name back",
  OFF_REGISTRY.every(
    ([provider]) =>
      provider === "" || offRegistry.every((text) => !text.includes(provider)),
  ),
  OFF_REGISTRY.filter(
    ([provider]) =>
      provider !== "" && offRegistry.some((text) => text.includes(provider)),
  ).map(([provider]) => provider),
);
check(
  "no off-registry refusal names an environment variable at all",
  offRegistry.every((text) => (text.match(ENV_LOOKING) ?? []).length === 0),
  offRegistry.flatMap((text) => text.match(ENV_LOOKING) ?? []),
);
check(
  "no off-registry refusal names a provider credential variable",
  offRegistry.every(
    (text) => !CREDENTIAL_ENV_NAMES.some((name) => text.includes(name)),
  ),
);
check(
  "no off-registry refusal carries an opaque token-shaped run of characters",
  offRegistry.every((text) => !/[A-Za-z0-9_-]{24,}/.test(text)),
);

/* ============================================================================
 * THE TOKEN_EXPIRED DEADLOCK
 *
 * The gate used to refuse `TOKEN_EXPIRED` in the same call that checked the
 * kill switch and the approval, and `dispatchPublish` made that call BEFORE
 * resolving the credential. So an expired access token was refused by the
 * check that ran before the step which un-expires it, while the state
 * machine's copy for that state promised "it will refresh automatically on
 * the next publish". Google's tokens last about an hour; outside that window
 * nothing could publish, and retrying could not help.
 *
 * The live YouTube canary hit this on its first real run. These checks pin
 * the split that fixed it: the local half must not care about connection
 * health, and the health half must still refuse everything it always did.
 * ========================================================================== */

console.log("\nThe TOKEN_EXPIRED deadlock stays fixed");

const expiredInput = (over = {}) => ({
  provider: "youtube",
  integrationKind: "publisher",
  channelState: "TOKEN_EXPIRED",
  jobApprovedAt: APPROVED_AT,
  account: null,
  env: LIVE_ENV,
  ...over,
});

check(
  "THE LOCAL HALF LETS AN EXPIRED TOKEN THROUGH so the refresh can run",
  gate.assertPublishPreconditions(expiredInput()) === null,
  gate.assertPublishPreconditions(expiredInput()),
);
check(
  "the health half still refuses an expired token when it is genuinely stale",
  refused(gate.assertConnectionReady(expiredInput())),
);
check(
  "the health half passes a refreshed connection",
  gate.assertConnectionReady(
    expiredInput({ channelState: "DIRECT_PUBLISH_READY" }),
  ) === null,
);

// The local half must still refuse everything that was never about health.
check(
  "the local half still refuses a disarmed deployment",
  refused(gate.assertPublishPreconditions(expiredInput({ env: {} }))),
);
check(
  "the local half still refuses an unapproved publish",
  refused(gate.assertPublishPreconditions(expiredInput({ jobApprovedAt: null }))),
);
check(
  "the local half still refuses a non-publisher",
  refused(
    gate.assertPublishPreconditions(
      expiredInput({ provider: "higgsfield", integrationKind: "asset_source" }),
    ),
  ),
);
check(
  "the local half still refuses a provider outside the registry",
  refused(gate.assertPublishPreconditions(expiredInput({ provider: "myspace" }))),
);
check(
  "the health half refuses an unknown provider too, rather than throwing",
  refused(gate.assertConnectionReady(expiredInput({ provider: "myspace" }))),
);

// And the composition is unchanged for callers that already hold fresh facts.
check(
  "assertPublishAllowed still refuses TOKEN_EXPIRED as a whole",
  refused(gate.assertPublishAllowed(expiredInput())),
);
check(
  "assertPublishAllowed still allows a healthy, armed, approved publish",
  gate.assertPublishAllowed(
    expiredInput({ channelState: "DIRECT_PUBLISH_READY" }),
  ) === null,
);
check(
  "nothing was widened: every state canAcceptContent rejects is still refused",
  ["NOT_CONFIGURED", "NOT_CONNECTED", "CONNECTING", "REAUTH_REQUIRED", "API_ACCESS_REQUIRED", "ERROR"].every(
    (state) => refused(gate.assertConnectionReady(expiredInput({ channelState: state }))),
  ),
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} publish-gate checks passed.`,
);
if (failures > 0) process.exit(1);
