/**
 * The live-publishing kill switch, and the gate every publish path must pass.
 *
 * ===================== THE ONE THING THIS FILE DOES =====================
 * Everything else in the publishing foundation answers "could this work?" —
 * the capability matrix says what a platform accepts, the channel state
 * machine says whether a connection is alive, the delivery ledger says whether
 * we already published. This file answers a different question: "MAY this
 * happen at all, on this deployment, right now?" It is the only module allowed
 * to say yes, and it says no unless four independent facts all agree.
 *
 * Nothing reaches a third party until a human has deliberately armed it. Not a
 * scheduler, not an agent, not a background worker, not a test run that picked
 * up a stale environment variable. The default state of this system is silent.
 *
 * ====================== WHY THIS FILE IS PURE ======================
 * Relative imports of pure sibling types, and nothing else — no `server-only`,
 * no database client, no fetch, no module-level environment read. Two reasons,
 * both load-bearing:
 *
 *   1. It cannot publish. There is no transport in here and no import that
 *      reaches one, so exercising every branch of the kill switch is safe by
 *      construction — the same property that makes
 *      `lib/integrations/channel-publish-requests.ts` testable.
 *   2. It is testable. `scripts/verify-publish-gate.mjs` drives every branch
 *      for every provider with no database, no network and no credential. A
 *      gate whose refusals cannot be exercised is a gate nobody can trust, and
 *      this one guards the only irreversible action in the product.
 *
 * The imports are RELATIVE rather than the usual `@/` alias precisely so the
 * verifier loads the real module graph. `scripts/lib/load-pure-module.mjs`
 * follows relative specifiers and nothing else, deliberately: a module that
 * reached for an alias or a package would not be pure, and the loader failing
 * on it is the signal, not a nuisance.
 *
 * `server-only` is likewise absent on purpose. This module holds no secret —
 * it reads the NAME of a mode, never a credential — so there is nothing to
 * hide from a bundle, and adding the import would make the gate unloadable by
 * a verifier that has no bundler. It also fails closed in the one place that
 * matters: a client bundle has no `MARKETING_PUBLISH_MODE` (no `NEXT_PUBLIC_`
 * prefix), so `resolvePublishMode` there reads `undefined` and returns `off`.
 *
 * ===================== WHY REFUSALS ARE RETURNED, NOT THROWN =====================
 * A refusal here is an expected, ordinary outcome — "publishing is off" is the
 * normal state of this deployment, not an exception. Returning `string | null`
 * matches `assertPublishPrerequisites()` in `app/actions/marketing-publish.ts`
 * exactly, and keeps refusals on the same path as every other typed action
 * result. A thrown error would land in a `catch` block written to settle a
 * delivery as FAILED, which would record a provider failure for a publish that
 * never left the building.
 *
 * That contract is TOTAL over arbitrary strings, not merely typed: a provider
 * name the registry has never heard of — the shape a SQL-enum drift produces —
 * is REFUSED here rather than allowed to throw out of an unguarded registry
 * lookup. See `assertPublishAllowed`.
 *
 * ====================== THE TWO-KEY IDIOM ======================
 * `lib/sms/env.ts` established the pattern for dangerous integrations in this
 * repository: having the credentials is NOT permission to use them. Outbound
 * SMS needs `SMS_PROVIDER=twilio` AND a separate, explicit
 * `SMS_INBOUND_STOP_HANDLING=live`, because "we have a Twilio account" and "we
 * honour opt-outs" are different facts and only the second one is the question
 * that matters.
 *
 * Publishing follows it, with the two keys held by different people:
 *
 *   KEY 1  MARKETING_PUBLISH_MODE=live — whoever deploys asserts that this
 *          environment is allowed to touch real brand accounts.
 *   KEY 2  a recorded human approval on the job — whoever operates asserts
 *          that THIS content, to THIS destination, was looked at and approved.
 *
 * Neither is inferable from the other, and neither alone opens the gate. The
 * failure this prevents is the realistic one: someone sets the mode to live to
 * finish a launch checklist, and every queued draft in the system goes out.
 */
import {
  capabilityFor,
  describeCapabilityGap,
} from "../../shared/types/integration-capability";
import type { ProviderCapability } from "../../shared/types/integration-capability";
import { isIntegrationProvider } from "../../shared/types/integration-provider";
import type {
  IntegrationKind,
  IntegrationProvider,
} from "../../shared/types/integration-provider";
import {
  MARKETING_CHANNEL_DESCRIPTORS,
  canAcceptContent,
  describeMarketingChannelState,
} from "../../shared/types/marketing-channel-connection";
import type {
  MarketingChannelAccountFacts,
  MarketingChannelState,
} from "../../shared/types/marketing-channel-connection";

/* ========================================================================== *
 *                              THE KILL SWITCH
 * ========================================================================== */

/**
 * The environment, injected.
 *
 * Not `NodeJS.ProcessEnv`, so this module carries no ambient dependency and
 * the verifier can hand it a plain object literal. `process.env` satisfies it.
 */
export type PublishModeEnv = Readonly<Record<string, string | undefined>>;

export const MARKETING_PUBLISH_MODE_ENV = "MARKETING_PUBLISH_MODE";

/**
 * `dry_run` is a real mode and not a courtesy. Publishing is not a boolean:
 * "build the request, resolve the media, claim nothing, send nothing" is how
 * an operator proves a channel is wired correctly without a post appearing on
 * a customer-facing account. Collapsing it into off/on would leave rehearsal
 * and live as the same switch, which is how rehearsals become live.
 */
export const PUBLISH_MODES = ["off", "dry_run", "live"] as const;
export type PublishMode = (typeof PUBLISH_MODES)[number];

/** The ONLY string that arms live publishing. Compared byte for byte. */
export const MARKETING_PUBLISH_MODE_LIVE_VALUE = "live";
export const MARKETING_PUBLISH_MODE_DRY_RUN_VALUE = "dry_run";
export const MARKETING_PUBLISH_MODE_OFF_VALUE = "off";

/**
 * Resolve the deployment-wide publish mode. FAILS CLOSED, exactly.
 *
 * ==================== THE FULL TRUTH TABLE ====================
 * Every one of these was decided deliberately, and every unusual value lands
 * on `off`:
 *
 *   unset                    off   nothing is armed until someone arms it
 *   ""                       off   present-but-empty is not a decision; it is
 *                                  what an unset Vercel variable looks like
 *   "   "                     off
 *   "off"                    off   the documented way to disarm, and the value
 *                                  a `.env.example` line can safely ship with
 *   "dry_run"                dry_run
 *   "live"                   live  the one value that arms live publishing
 *   "LIVE", "Live"           off
 *   "live ", " live"         off
 *   "live\n", "live\r"       off
 *   "1", "true", "yes", "on" off
 *   anything else            off
 *
 * ================== WHY NO TRIM AND NO CASE FOLD ==================
 * `isSmsInboundStopHandlingLive` normalizes with `.trim().toLowerCase()`, and
 * this deliberately does not. The difference is what each variable can do on
 * its own. The SMS assertion is inert until `SMS_PROVIDER` and three Twilio
 * credentials are also present, so a forgiving comparison there cannot arm
 * anything by itself. This variable is the single switch that converts every
 * other already-satisfied condition in the system into real traffic on real
 * brand accounts.
 *
 * So the rule is: a value that had to be NORMALIZED before it meant "live" was
 * not typed as "live". `"LIVE "` is a value someone pasted, echoed out of a
 * CRLF `.env` file, or produced by a shell that kept a trailing space — none
 * of which is the deliberate act this switch exists to require.
 *
 * The costs are wildly asymmetric and that is the whole argument. Refusing a
 * value that meant live costs one config edit and a confused minute, and the
 * operator can see the mode reported as `off`. Accepting a value that did not
 * mean live costs real posts on real accounts that nothing in this repository
 * can unpublish.
 *
 * `off` — rather than `dry_run` — is the landing place for every unrecognized
 * value because an unrecognized value is a misconfiguration, and a
 * misconfigured deployment should do nothing at all rather than spend a
 * rehearsal budget building requests nobody asked for.
 */
export function resolvePublishMode(
  env: PublishModeEnv = process.env,
): PublishMode {
  // A `switch` on the raw value, with no normalization step anywhere in it, so
  // the exactness is visible rather than asserted in a comment.
  switch (env[MARKETING_PUBLISH_MODE_ENV]) {
    case MARKETING_PUBLISH_MODE_LIVE_VALUE:
      return "live";
    case MARKETING_PUBLISH_MODE_DRY_RUN_VALUE:
      return "dry_run";
    default:
      return "off";
  }
}

/** True only when this deployment has been deliberately armed. */
export function isLivePublishingArmed(
  env: PublishModeEnv = process.env,
): boolean {
  return resolvePublishMode(env) === "live";
}

/* ========================================================================== *
 *                                 THE GATE
 * ========================================================================== */

export type PublishGateInput = {
  readonly provider: IntegrationProvider;
  /**
   * `integration_kind` as stored on the connected-account row (migration 181),
   * NOT as looked up from the registry. Both are checked, and they are checked
   * against each other — see `refuseOnKind`.
   */
  readonly integrationKind: IntegrationKind;
  /** From `deriveMarketingChannelState`. The caller owns the clock. */
  readonly channelState: MarketingChannelState;
  /**
   * When a person approved THIS job for THIS destination, or null.
   *
   * A timestamp rather than a boolean because an approval is evidence, and
   * evidence has a time. `approved: true` is something a caller can write
   * without anyone having looked at anything; a recorded instant is a thing
   * that either exists in the record or does not.
   */
  readonly jobApprovedAt: string | null;
  /** Optional, and only used to quote the provider's own words in a refusal. */
  readonly account?: MarketingChannelAccountFacts | null;
  /** Injected for tests. Production callers leave it alone. */
  readonly env?: PublishModeEnv;
};

/**
 * The refusal, or null when this publish may proceed.
 *
 * ==================== WHY THE MODE IS NOT AN INPUT ====================
 * Every other precondition arrives as a parameter, and the publish mode does
 * not: it is resolved in here, from the environment, on every call. A gate
 * whose most dangerous precondition is supplied by its caller is not a gate —
 * it is a suggestion, and one careless `mode: "live"` in one call site would
 * silently arm publishing for that path alone. `env` is injectable so the
 * verifier can drive both halves of the switch, which is not the same thing as
 * letting a caller assert the answer.
 *
 * ==================== WHY THE CHECKS ARE IN THIS ORDER ====================
 * A refusal is only useful if the next step it names would actually unblock
 * the publish. That, not severity, sets the order:
 *
 *   1. KIND     permanent. No configuration change makes an asset source into
 *               a destination, so this must be said first — telling someone to
 *               set MARKETING_PUBLISH_MODE for a Higgsfield "publish" would
 *               name a step that cannot work.
 *   2. MODE     deployment-wide, and the same answer for every channel. It
 *               outranks connection health for the reason
 *               `deriveMarketingChannelState` checks `configured` first: a
 *               disarmed deployment cannot meaningfully be in any other state.
 *   3. APPROVAL this one piece of content, and the only step that is nobody's
 *               job but the operator's, right now.
 *   4. STATE    this one connection.
 *
 * ============ WHY STATE MOVED BEHIND APPROVAL ============
 * It used to be third, and that ordering deadlocked the publish path. The
 * live YouTube canary found it: a token that had expired put the connection
 * in `TOKEN_EXPIRED`, which `canAcceptContent` refuses — so the publish was
 * rejected BEFORE `dispatchPublish` ever reached the credential seam that
 * would have refreshed it. The state machine's own copy for that state reads
 * "Access expired. It will refresh automatically on the next publish", and it
 * could not: the refresh was reachable only through a publish that this gate
 * refused for needing one. Google's access tokens last about an hour, so
 * every publish attempted outside that window was refused forever.
 *
 * The fix is ordering, not permission. Connection health is now judged
 * against POST-REFRESH facts, which means the caller must resolve the
 * credential between the two halves of this gate — hence
 * `assertPublishPreconditions` and `assertConnectionReady` below.
 *
 * Approval moving ahead of state is not a consolation prize for the split;
 * it is strictly better. Approval is local and free, connection health now
 * costs a network round trip to establish honestly, and checking the free
 * thing first means AN UNAPPROVED PUBLISH NEVER CONTACTS THE PROVIDER AT
 * ALL — not even to refresh a credential.
 *
 * ============ WHY THE PROVIDER IS CHECKED BEFORE IT IS LOOKED UP ============
 * `provider` is declared `IntegrationProvider`, and that is a claim about the
 * value rather than a check on it. The value reaching a publish path comes off
 * a `marketing_connected_accounts` row, and `row.provider as
 * IntegrationProvider` is a cast — it asserts the database agrees with this
 * union. It has not always: migration 143 added `youtube` and `tiktok` to the
 * `marketing_connected_provider` enum and the TypeScript union did not learn
 * them for eighteen months (`shared/types/integration-provider.ts` writes that
 * history out). During the next such drift the database hands this gate a label
 * the registry has never heard of.
 *
 * `INTEGRATION_CAPABILITIES[provider]` is an unguarded record index, so that
 * label reads `undefined` and the very next `.kind` THROWS — the one failure
 * mode the header of this file rules out, because a throw lands in a caller's
 * `catch` written to settle a delivery FAILED and records a provider failure
 * for a publish that never left the building. An inherited key is worse than a
 * throw: `toString` and `constructor` resolve to functions, survive the
 * dereference, and produce a refusal that tells an operator the provider is
 * registered as "undefined".
 *
 * So membership is checked against `INTEGRATION_PROVIDERS` — the one place a
 * provider name is spelled — before anything indexes the registry, which is
 * what makes the `string | null` result total over arbitrary strings.
 */
export function assertPublishAllowed(input: PublishGateInput): string | null {
  // The whole gate, in order, for a caller that already holds facts current
  // enough to judge connection health — a preview, a verifier, a readback.
  //
  // `dispatchPublish` deliberately does NOT use this one: it runs the two
  // halves either side of the credential refresh, which is the only way the
  // state check sees a token that was just renewed. See the ordering note.
  return (
    assertPublishPreconditions(input) ?? assertConnectionReady(input)
  );
}

/**
 * The refusals that need nothing external: is this a publisher, is publishing
 * armed, and has a human approved THIS content for THIS destination.
 *
 * Everything here is decidable from the row and the environment, so all of it
 * runs before a single byte reaches a provider — including before a
 * credential refresh. That is the property that keeps an unapproved or
 * disarmed publish from generating any provider traffic whatsoever.
 */
export function assertPublishPreconditions(
  input: PublishGateInput,
): string | null {
  const unknown = refuseOnUnknownProvider(input.provider);
  if (unknown) return unknown;

  const capability = capabilityFor(input.provider);

  const kindRefusal = refuseOnKind(input.integrationKind, capability);
  if (kindRefusal) return kindRefusal;

  const modeRefusal = refuseOnMode(
    resolvePublishMode(input.env),
    capability.label,
  );
  if (modeRefusal) return modeRefusal;

  if (
    capability.requiresManualApproval &&
    !hasRecordedApproval(input.jobApprovedAt)
  ) {
    return (
      `${capability.label} publishes only after a person approves the specific post ` +
      `and destination, and no approval is recorded on this one. Approve it for ` +
      `${capability.label}, then try again — nothing was sent.`
    );
  }

  return null;
}

/**
 * The one refusal that must be judged on CURRENT facts: is this connection
 * healthy enough to accept content right now.
 *
 * Call this AFTER resolving the credential. `channelState` is derived from
 * `token_expires_at`, and an expired token is exactly the condition the
 * credential seam repairs — so evaluating it beforehand asks a question whose
 * answer the very next step was about to change.
 */
export function assertConnectionReady(
  input: PublishGateInput,
): string | null {
  const unknown = refuseOnUnknownProvider(input.provider);
  if (unknown) return unknown;

  const capability = capabilityFor(input.provider);

  if (!canAcceptContent(input.channelState)) {
    // `MARKETING_CHANNEL_DESCRIPTORS` covers exactly the publishers; the
    // registry check has already refused every name outside the union and the
    // kind check every non-publisher inside it, so this lookup is non-null
    // here. `verify-integration-registry.mjs` proves the record is total over
    // the publisher set.
    const descriptor = MARKETING_CHANNEL_DESCRIPTORS[input.provider];
    // The channel state machine already owns this copy and already names the
    // next step for every state. Restating it here would be a second place for
    // "Reconnect YouTube" to drift out of date.
    return `Nothing was sent to ${capability.label}. ${describeMarketingChannelState(
      input.channelState,
      descriptor,
      input.account ?? null,
    )}`;
  }

  return null;
}

/** The registry membership check both halves of the gate begin with. */
function refuseOnUnknownProvider(candidate: string): string | null {
  // Widened to `string` on purpose: narrowing to the union is the job of the
  // guard on the next line, not of the parameter's declared type.
  const provider: string = candidate;
  if (!isIntegrationProvider(provider)) {
    // The unrecognized name is deliberately NOT quoted back. Every other
    // refusal in this file is assembled from registry-controlled text, and a
    // value that just failed the registry check is the one string here that
    // nothing can vouch for — interpolating it would put an arbitrary column
    // value into operator copy that `verify-publish-gate.mjs` otherwise proves
    // carries no credential name and no opaque token-shaped run.
    //
    // Both next steps are named because either one is the real fix depending on
    // which side drifted: pick a destination this build knows, or ship a build
    // that knows this destination.
    return (
      `This connection names a provider that is not in Altair's integration ` +
      `registry, so nothing was sent. Nothing publishes through a connection ` +
      `this deployment cannot identify. Choose a supported publishing channel ` +
      `as the destination, or deploy a build that knows this one, then try again.`
    );
  }

  return null;
}

/**
 * Refuse anything that is not, by BOTH accounts, a publisher.
 *
 * ============ WHY THE ROW ALONE IS NOT ENOUGH ============
 * Migration 181 added `integration_kind` as `not null default 'publisher'`.
 * That default is right for the live Facebook rows it had to backfill and
 * wrong for anything else that existed before a writer did: a Higgsfield
 * connection created earlier reads `publisher` today, and trusting the column
 * alone would make "publish to Higgsfield" a representable state again — the
 * exact thing migration 181's own comment says this gate exists to prevent.
 *
 * So both answers must say publisher, and they must AGREE. A disagreement is
 * not resolved in favour of either side: it means the stored row and the
 * registry describe different things, and nothing publishes through a
 * connection whose identity is in dispute.
 */
function refuseOnKind(
  storedKind: IntegrationKind,
  capability: ProviderCapability,
): string | null {
  if (storedKind !== capability.kind) {
    return (
      `This connection is stored as "${storedKind}" but ${capability.label} is ` +
      `registered as "${capability.kind}". Nothing is published while the record ` +
      `and the registry disagree about what a connection is. Correct the ` +
      `connection's integration kind, then try again.`
    );
  }

  const nextStep = describeNonPublisherNextStep(capability.kind);
  if (!nextStep) return null;

  // Reused rather than restated: the capability matrix already writes the
  // sentence for a provider that does not receive content.
  return `${describeCapabilityGap({ reason: "not_a_publisher" }, capability)} ${nextStep}`;
}

/**
 * What to do instead, per kind. Exhaustive over `IntegrationKind`, so a fourth
 * kind cannot be added without someone deciding whether it may be published to
 * and what a human is told when it may not.
 */
function describeNonPublisherNextStep(kind: IntegrationKind): string | null {
  switch (kind) {
    case "publisher":
      return null;
    case "asset_source":
      return "Choose a publishing channel as the destination — this connection only produces creative.";
    case "first_party":
      return "Choose a publishing channel as the destination — this is an Altair surface, not an external one.";
  }
}

/**
 * Exhaustive over `PublishMode`, so a fourth mode cannot be added without
 * someone deciding whether it may publish.
 *
 * Both refusals name the variable and the exact literal, because "publishing
 * is off" without the way to turn it on is not a next step. The literal is a
 * mode name, not a credential — nothing secret is written here or anywhere
 * else in this module.
 */
function refuseOnMode(mode: PublishMode, label: string): string | null {
  switch (mode) {
    case "off":
      return (
        `Live publishing is switched off on this deployment, so nothing was sent to ` +
        `${label}. Set ${MARKETING_PUBLISH_MODE_ENV} to the exact literal ` +
        `"${MARKETING_PUBLISH_MODE_LIVE_VALUE}" to arm it.`
      );
    case "dry_run":
      return (
        `Publishing is in dry-run mode, so the ${label} request was prepared but not ` +
        `sent. Set ${MARKETING_PUBLISH_MODE_ENV} to the exact literal ` +
        `"${MARKETING_PUBLISH_MODE_LIVE_VALUE}" to publish for real.`
      );
    case "live":
      return null;
  }
}

/**
 * An approval is a readable instant or it is not an approval.
 *
 * An unparseable timestamp fails CLOSED, unlike `isTokenExpired`, which treats
 * an unreadable expiry as "not expired". The directions differ because the
 * consequences do: guessing wrong about an expiry costs one failed refresh,
 * and guessing wrong about an approval publishes something no one approved.
 */
function hasRecordedApproval(approvedAt: string | null): boolean {
  if (!approvedAt || !approvedAt.trim()) return false;
  return !Number.isNaN(Date.parse(approvedAt));
}
