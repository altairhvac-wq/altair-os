import "server-only";

import {
  claimDelivery,
  settleDelivery,
} from "@/lib/database/queries/marketing-channel-deliveries";
import { getUsableAccessToken } from "@/lib/integrations/credential-lifecycle";
import type { PublishOutcome, PublisherAdapter } from "@/lib/integrations/port";
import { resolveIntegrationAdapter } from "@/lib/integrations/registry";
import { capabilityFor } from "@/shared/types/integration-capability";
import type { IntegrationProvider } from "@/shared/types/integration-provider";
import type { MediaReadGrant } from "@/shared/types/marketing-media";
import {
  deriveMarketingChannelState,
  type MarketingChannelAccountFacts,
} from "@/shared/types/marketing-channel-connection";
import type { DeliveryProviderResult } from "@/shared/types/marketing-delivery";
import {
  assertConnectionReady,
  assertPublishPreconditions,
  type PublishModeEnv,
} from "./gate";

/**
 * The one path from an approved job to an external write.
 *
 * ================== WHAT THIS FILE IS FOR ==================
 * Every precondition in this codebase already exists somewhere: the kill
 * switch and the approval in `gate.ts`, the credential in
 * `credential-lifecycle.ts`, the duplicate guard in `claimDelivery`, the
 * provider call in the adapter. What did not exist was a single place that
 * runs them in the right ORDER, so that "was the gate consulted?" is
 * answerable by reading one function instead of auditing every call site
 * that might one day publish.
 *
 * ================== THE ORDER IS THE DESIGN ==================
 *   1. GATE, HALF ONE — publisher kind, the kill switch, and the recorded
 *      human approval. All decidable from the row and the environment, so a
 *      refusal costs nothing and leaves nothing behind: no ledger row, no
 *      signed URL, and no provider contact at all.
 *   2. CREDENTIAL next, because it can refresh and therefore fail, and a
 *      failure after a claim would strand the ledger row `in_flight`, which
 *      `decideDelivery` reports as NEEDS_RECONCILIATION and sends a human to
 *      look at a provider for a post that never happened. The same lesson
 *      `app/actions/marketing-publish.ts` records about local validation
 *      returning after a claim.
 *   3. GATE, HALF TWO — connection health, judged on the expiry that applies
 *      AFTER the refresh. See below; this split is not cosmetic.
 *   4. MEDIA GRANTS next, for the same reason as the credential: minting can
 *      fail.
 *   5. CLAIM last. From here on, everything that can fail locally has
 *      already been resolved, so the window between the claim and the
 *      provider call is as small as this can make it.
 *   6. PUBLISH, then SETTLE — always, on both paths.
 *
 * ================== WHY THE GATE IS IN TWO HALVES ==================
 * It was one call, ahead of the credential, and that deadlocked every publish
 * whose access token had expired. `canAcceptContent` refuses `TOKEN_EXPIRED`,
 * so the gate rejected the publish BEFORE reaching the seam that would have
 * refreshed the token — while the state machine's own copy for that state
 * promised "it will refresh automatically on the next publish". It could not.
 * Google's tokens last about an hour; outside that window nothing could ever
 * publish, and no amount of retrying would help because the retry was refused
 * for the same reason.
 *
 * The live YouTube canary hit it on its first real run. The fix is ordering,
 * not permission: nothing is now allowed that was not allowed before, and the
 * checks that must precede any provider contact still do.
 *
 * ================== IDEMPOTENCY IS NOT IMPLEMENTED HERE ==================
 * It is `claimDelivery`, and behind it 143's
 * `unique (company_id, marketing_post_id, provider)`. A retry of the same
 * approved request re-enters this function, reaches step 4, and the database
 * refuses the insert — so the second attempt cannot reach the adapter at
 * all. Nothing in this file decides that, deliberately: an idempotency check
 * written in application code is a check that a concurrent request runs
 * alongside rather than against.
 */

export const DISPATCH_REFUSALS = [
  /** The gate said no. `detail` carries its words verbatim. */
  "REFUSED_BY_GATE",
  /** This deployment has no adapter for the provider. */
  "NO_ADAPTER",
  /** The adapter exists but cannot receive content. */
  "NOT_A_PUBLISHER",
  /** No usable credential — expired, revoked, unrefreshable, undecryptable. */
  "NO_CREDENTIAL",
  /** A signed URL for the media could not be minted. */
  "MEDIA_UNAVAILABLE",
  /**
   * The ledger refused the claim. Usually the duplicate guard, which is a
   * SUCCESSFUL outcome for a retry — the work is already done or in flight.
   */
  "NOT_CLAIMED",
  /** The provider was contacted and the call failed. */
  "PROVIDER_FAILED",
] as const;
export type DispatchRefusal = (typeof DISPATCH_REFUSALS)[number];

export type DispatchResult =
  | {
      readonly ok: true;
      readonly outcome: PublishOutcome;
      readonly deliveryId: string;
    }
  | {
      readonly ok: false;
      readonly refusal: DispatchRefusal;
      /** Operator-facing and secret-free. Safe to render. */
      readonly detail: string;
      /** True when nothing was sent, so a retry is safe. */
      readonly safeToRetry: boolean;
    };

/** The connected-account facts a dispatch needs. Read by the caller. */
export type DispatchAccount = {
  readonly connectedAccountId: string;
  readonly companyId: string;
  readonly provider: IntegrationProvider;
  readonly integrationKind: "publisher" | "asset_source" | "first_party";
  readonly providerAccountId: string | null;
  readonly providerResourceId: string | null;
  readonly grantedScopes: readonly string[];
  readonly facts: MarketingChannelAccountFacts;
};

export type DispatchInput = {
  readonly account: DispatchAccount;
  readonly marketingPostId: string;
  /** When a human approved THIS job for THIS destination, or null. */
  readonly jobApprovedAt: string | null;
  readonly title: string | null;
  readonly body: string;
  readonly hashtags: readonly string[];
  readonly link: string | null;
  /** Already-minted, short-lived read grants. Never object keys. */
  readonly media: readonly MediaReadGrant[];
  readonly nowIso: string;
  /** True when the deployment is configured, so the gate can be driven. */
  readonly configured: boolean;
  /** Injected for verifiers only. Production leaves it alone. */
  readonly env?: PublishModeEnv;
};

function refuse(
  refusal: DispatchRefusal,
  detail: string,
  safeToRetry: boolean,
): DispatchResult {
  return { ok: false, refusal, detail, safeToRetry };
}

/**
 * Facts an adapter reported, flattened for `provider_result` (migration 186).
 *
 * Only primitives survive: the column is capped at 2 KB and constrained to an
 * object, and an adapter that could nest arbitrary structures in here would
 * eventually put a response body in it.
 */
function providerResultFrom(
  outcome: PublishOutcome,
  nowIso: string,
): DeliveryProviderResult {
  return {
    providerPostId: outcome.providerPostId,
    ...(outcome.providerMediaId
      ? { providerMediaId: outcome.providerMediaId }
      : {}),
    ...(outcome.providerPermalink
      ? { providerPermalink: outcome.providerPermalink }
      : {}),
    // Whatever the adapter verified about the object it created — for
    // YouTube the privacy, the channel and the processing status. Spread
    // BEFORE `verifiedAt` so an adapter cannot overwrite the timestamp the
    // dispatcher stamps.
    ...(outcome.providerResult ?? {}),
    verifiedAt: nowIso,
  };
}

export async function dispatchPublish(
  input: DispatchInput,
): Promise<DispatchResult> {
  const { account } = input;

  // ---------------------------------------------------------------- 1. gate
  const channelState = deriveMarketingChannelState({
    configured: input.configured,
    account: account.facts,
    nowIso: input.nowIso,
  });

  const gateInput = {
    provider: account.provider,
    integrationKind: account.integrationKind,
    channelState,
    jobApprovedAt: input.jobApprovedAt,
    account: account.facts,
    ...(input.env ? { env: input.env } : {}),
  };

  // HALF ONE: everything decidable without touching a provider — publisher
  // kind, the kill switch, and the recorded human approval. A refusal here
  // costs nothing and leaves nothing behind: no ledger row, no signed URL,
  // and no provider contact of any kind, not even a credential refresh.
  const preconditionRefusal = assertPublishPreconditions(gateInput);
  if (preconditionRefusal) {
    return refuse("REFUSED_BY_GATE", preconditionRefusal, true);
  }

  // ------------------------------------------------------------- 2. adapter
  const resolution = await resolveIntegrationAdapter(account.provider);
  if (!resolution.ok) {
    return refuse("NO_ADAPTER", resolution.detail, false);
  }

  if (resolution.adapter.kind !== "publisher") {
    // The gate checks this too, from the row and the matrix. This checks the
    // loaded ADAPTER, which is a third independent answer — and the one that
    // would catch a module wired under the wrong key in the registry.
    return refuse(
      "NOT_A_PUBLISHER",
      `The ${account.provider} adapter cannot receive content, so nothing was sent.`,
      false,
    );
  }

  const adapter: PublisherAdapter = resolution.adapter;

  // ---------------------------------------------------------- 3. credential
  // Refreshes if needed AND persists the new expiry — the whole reason this
  // goes through the lifecycle wrapper rather than `refreshIfNeeded`.
  const credential = await getUsableAccessToken({
    account: {
      connectedAccountId: account.connectedAccountId,
      companyId: account.companyId,
      provider: account.provider,
      integrationKind: account.integrationKind,
      tokenExpiresAt: account.facts.tokenExpiresAt,
    },
    nowIso: input.nowIso,
  });

  if (!credential.ok) {
    return refuse("NO_CREDENTIAL", credential.detail, false);
  }

  // HALF TWO: connection health, judged on the expiry that applies NOW.
  //
  // `credential.tokenExpiresAt` is authoritative either way — the refreshed
  // value when a refresh happened, the stored one when it did not — and the
  // lifecycle wrapper has already persisted it. Deriving the state from the
  // pre-refresh facts is what deadlocked this path: an expired token was
  // refused for being expired by the check that ran before the step which
  // un-expires it.
  const refreshedFacts = {
    ...account.facts,
    tokenExpiresAt: credential.tokenExpiresAt,
  };

  const readyRefusal = assertConnectionReady({
    ...gateInput,
    channelState: deriveMarketingChannelState({
      configured: input.configured,
      account: refreshedFacts,
      nowIso: input.nowIso,
    }),
    account: refreshedFacts,
  });

  if (readyRefusal) {
    // Still nothing claimed and nothing sent — the credential seam only
    // talked to the provider's token endpoint. A connection that cannot be
    // repaired by a refresh (revoked, never granted, awaiting review) lands
    // here, and the refusal names the human step.
    return refuse("REFUSED_BY_GATE", readyRefusal, true);
  }

  // -------------------------------------------------------------- 4. media
  if (input.media.length === 0 && capabilityFor(account.provider).requiresMedia) {
    return refuse(
      "MEDIA_UNAVAILABLE",
      `${capabilityFor(account.provider).label} requires media and none was available, so nothing was sent.`,
      false,
    );
  }

  // -------------------------------------------------------------- 5. claim
  const claim = await claimDelivery({
    companyId: account.companyId,
    marketingPostId: input.marketingPostId,
    provider: account.provider,
    connectedAccountId: account.connectedAccountId,
    nowIso: input.nowIso,
  });

  if (claim.decision !== "PROCEED" || !claim.delivery) {
    // The duplicate guard doing its job is the common case here, and it is
    // not an error: the work is already done or already in flight. Retrying
    // would be refused again, so `safeToRetry` is false — not because a
    // retry is dangerous, but because it is pointless.
    return refuse(
      "NOT_CLAIMED",
      claim.error ??
        `This post has already been sent to ${capabilityFor(account.provider).label}, or a send is in progress. Nothing was sent again.`,
      false,
    );
  }

  const deliveryId = claim.delivery.id;

  // ------------------------------------------------------------ 6. publish
  let outcome: PublishOutcome;
  try {
    outcome = await adapter.publish({
      post: {
        connectedAccountId: account.connectedAccountId,
        companyId: account.companyId,
        providerAccountId: account.providerAccountId,
        providerResourceId: account.providerResourceId,
      },
      package: {
        title: input.title,
        body: input.body,
        hashtags: input.hashtags,
        link: input.link,
        media: input.media,
      },
      capability: capabilityFor(account.provider),
      publishCapability: account.facts.publishCapability,
      grantedScopes: account.grantedScopes,
      accessToken: credential.accessToken,
    });
  } catch (error) {
    // The adapter throws on every failure, per the port. The provider's own
    // words are NOT forwarded: `YouTubeApiError` carries a status and a short
    // code by construction, and even that is kept out of operator copy — the
    // failure detail on the ledger is ours.
    const detail = `Publishing to ${capabilityFor(account.provider).label} failed. Nothing further was sent.`;

    console.error("[dispatchPublish] provider call failed:", {
      provider: account.provider,
      connectedAccountId: account.connectedAccountId,
      deliveryId,
      errorName: error instanceof Error ? error.name : "unknown",
      // The code is a closed vocabulary from the adapter, never a body.
      code:
        error instanceof Error && "code" in error
          ? String((error as { code: unknown }).code)
          : "unknown",
    });

    // ALWAYS settled. An unsettled claim is the state the ledger exists to
    // make impossible to create by accident.
    const settled = await settleDelivery({
      deliveryId,
      settlement: { outcome: "failed", failureDetail: detail },
      nowIso: input.nowIso,
    });

    if (settled.error) {
      console.error("[dispatchPublish] failed settle did not land:", {
        deliveryId,
      });
    }

    return refuse("PROVIDER_FAILED", detail, false);
  }

  // ------------------------------------------------------------- 7. settle
  const settled = await settleDelivery({
    deliveryId,
    settlement: {
      outcome: outcome.outcome,
      providerPostId: outcome.providerPostId,
      ...(outcome.providerPermalink
        ? { providerPermalink: outcome.providerPermalink }
        : {}),
      ...(outcome.outcome === "posted"
        ? { providerResult: providerResultFrom(outcome, input.nowIso) }
        : {}),
    } as Parameters<typeof settleDelivery>[0]["settlement"],
    nowIso: input.nowIso,
  });

  if (settled.error) {
    // The video exists. The ledger does not say so. This is the one failure
    // that must be loud rather than returned as a refusal: reporting it as a
    // failed publish would invite a retry, and the retry would be refused by
    // the claim that is still sitting there — leaving an operator with a
    // published video and a ledger insisting nothing happened.
    console.error("[dispatchPublish] PUBLISHED BUT NOT SETTLED:", {
      provider: account.provider,
      deliveryId,
      providerPostId: outcome.providerPostId,
    });
  }

  return { ok: true, outcome, deliveryId };
}
