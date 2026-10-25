/**
 * Which connected account a post publishes THROUGH — the destination.
 *
 * ==================== WHY THIS IS ITS OWN MODULE ====================
 * An approval that does not name its destination is not an approval the
 * publisher can act on: with two YouTube channels connected, "approved for
 * YouTube" is ambiguous, and the one thing an automation must never do is
 * pick. This module makes the rule explicit and pure, so the Today view, the
 * approval action and the publisher cron all resolve a destination the same
 * way — and so the rule is testable without a database.
 *
 * The rule:
 *   exactly one eligible account for the provider  -> that one
 *   an explicit account id that IS eligible         -> that one
 *   none                                            -> refuse (connect first)
 *   several, none named                             -> refuse (ask the human)
 *
 * Nothing here reads a title, a hashtag or a caption to guess a channel.
 */

import { getFacebookPageInstagramBusinessAccountId } from "./marketing-facebook-metadata";
import { capabilityFor } from "../types/integration-capability";
import type { IntegrationProvider } from "../types/integration-provider";
import type { MarketingConnectedAccount } from "../types/marketing-connected-account";
import type { MarketingChannel } from "../types/marketing-post";

/**
 * The provider a post's `channelTarget` publishes to. `website` is the site;
 * `general` names no destination at all and returns null.
 */
export function providerForChannelTarget(
  channel: MarketingChannel,
): IntegrationProvider | null {
  if (channel === "website") return "altair_site";
  if (channel === "general") return null;
  return channel;
}

/**
 * The accounts that could carry a publish to `provider`.
 *
 * Instagram publishes through a Facebook Page row that has a linked Business
 * account (that is how Meta's Graph API is shaped, and how every existing
 * Instagram path in this repository addresses it), so its candidates are
 * Facebook rows, not rows whose provider says "instagram".
 */
export function listDestinationCandidates(
  accounts: readonly MarketingConnectedAccount[],
  provider: IntegrationProvider,
): MarketingConnectedAccount[] {
  return accounts.filter((account) => {
    if (account.status !== "connected") return false;
    if (account.integrationKind === "asset_source") return false;
    if (provider === "instagram") {
      return (
        account.provider === "facebook" &&
        getFacebookPageInstagramBusinessAccountId(account.metadata) !== null
      );
    }
    if (account.provider !== provider) return false;
    // A publisher row with no resource id is a placeholder (a Facebook user
    // with no Pages, a YouTube login that picked no channel). Not a target.
    return (
      account.integrationKind === "first_party" ||
      Boolean(account.providerResourceId?.trim())
    );
  });
}

export type DestinationDecision =
  | { readonly ok: true; readonly account: MarketingConnectedAccount }
  | { readonly ok: false; readonly error: string };

export function decideDestination(input: {
  readonly provider: IntegrationProvider;
  readonly candidates: readonly MarketingConnectedAccount[];
  /** The account the human named, if any. */
  readonly explicitAccountId: string | null;
}): DestinationDecision {
  const label = capabilityFor(input.provider).label;
  const explicit = input.explicitAccountId?.trim() || null;

  if (explicit) {
    const named = input.candidates.find((account) => account.id === explicit);
    if (!named) {
      return {
        ok: false,
        error: `That ${label} connection is not available as a destination for this post. Pick a connected ${label} account.`,
      };
    }
    return { ok: true, account: named };
  }

  if (input.candidates.length === 0) {
    return {
      ok: false,
      error: `No connected ${label} account can receive this post. Connect one in Settings → Integrations, then approve again.`,
    };
  }

  if (input.candidates.length > 1) {
    return {
      ok: false,
      error:
        `More than one ${label} account is connected, so this approval needs a destination. ` +
        `Choose which ${label} account this post publishes to, then approve again.`,
    };
  }

  return { ok: true, account: input.candidates[0] };
}

/**
 * What the publisher hands `dispatchPublish` as `providerResourceId`: the
 * provider-side identity the adapter publishes AS. For Instagram that is the
 * Business account id in the Page row's metadata, not the Page id.
 */
export function providerResourceIdFor(
  account: MarketingConnectedAccount,
  provider: IntegrationProvider,
): string | null {
  if (provider === "instagram") {
    return getFacebookPageInstagramBusinessAccountId(account.metadata);
  }
  return account.providerResourceId?.trim() || null;
}
