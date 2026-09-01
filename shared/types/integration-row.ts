/**
 * What the Settings → Integrations page renders, derived purely.
 *
 * ====================== WHY THIS IS NOT IN THE COMPONENT ======================
 * Every state on that page is reachable only through a third party we cannot
 * summon on demand: a revoked consent, an app still awaiting review, a
 * provider that granted five of the six scopes we asked for. If the mapping
 * from those facts to what a human sees lives inside a React component, it is
 * testable only by rendering a browser and somehow arranging for TikTok to be
 * mid-review. So the mapping lives here, as data and pure functions, and the
 * component does nothing but paint the result.
 *
 * That is the same reasoning `marketing-channel-connection.ts` gives for its
 * own purity, and this module is its display layer — it adds no new state
 * machine, it projects the existing one.
 *
 * ====================== NOTHING HERE CLAIMS A CONNECTION ======================
 * A row reports exactly what the stored facts support. There is no optimistic
 * branch: a provider with no account row is NOT_CONNECTED, a provider whose
 * deployment has no credentials configured is NOT_CONFIGURED and shows no
 * Connect button at all, and no code path can produce a "Connected" row for a
 * provider that has not actually connected.
 */
import {
  INTEGRATION_CAPABILITIES,
  type ProviderCapability,
} from "./integration-capability";
import {
  INTEGRATION_PROVIDERS,
  type IntegrationKind,
  type IntegrationProvider,
} from "./integration-provider";
import {
  MARKETING_CHANNEL_DESCRIPTORS,
  deriveMarketingChannelState,
  describeMarketingChannelState,
  formatChannelIdentity,
  type MarketingChannelAccountFacts,
  type MarketingChannelState,
  type MarketingPublishChannel,
} from "./marketing-channel-connection";

/** The tone vocabulary from `shared/design-system/components/status-tone.ts`. */
export type IntegrationRowTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

/**
 * What the operator may do next on this row.
 *
 * `none` is a real answer, not a missing one: an unconfigured deployment has
 * nothing to click, and rendering a Connect button that 404s or fails at the
 * provider is worse than rendering no button.
 */
export type IntegrationRowAction =
  | "none"
  | "connect"
  | "reconnect"
  | "recheck"
  | "disconnect";

export type IntegrationRow = {
  readonly provider: IntegrationProvider;
  readonly kind: IntegrationKind;
  readonly label: string;
  readonly state: MarketingChannelState;
  readonly tone: IntegrationRowTone;
  /** Short label for the pill: what state this is, in two words or fewer. */
  readonly statusLabel: string;
  /** One line of operator-facing copy naming the next step. */
  readonly detail: string;
  /** "Connected — Altair HVAC", or null when there is no identity yet. */
  readonly identity: string | null;
  readonly action: IntegrationRowAction;
  /** Where Connect points. Null unless the action is connect/reconnect. */
  readonly connectPath: string | null;
  /** Env var NAMES the deployment is missing. Never values. */
  readonly missingEnvVars: readonly string[];
  /** The connected-account row id, when one exists. */
  readonly connectedAccountId: string | null;
  /** ISO timestamp of the last successful use, when known. */
  readonly lastSuccessAt: string | null;
};

/**
 * State → pill tone. A total record, so a new `MarketingChannelState` is a
 * compile error here rather than an unstyled pill in production.
 *
 * Tone semantics follow `status-tone.ts` exactly: neutral = nothing has
 * happened; info = in motion, or waiting on someone else; warning = a human
 * needs to act soon; danger = access or money is at risk.
 */
export const INTEGRATION_STATE_TONE: Readonly<
  Record<MarketingChannelState, IntegrationRowTone>
> = {
  NOT_CONFIGURED: "neutral",
  NOT_CONNECTED: "neutral",
  CONNECTING: "info",
  TOKEN_EXPIRED: "warning",
  REAUTH_REQUIRED: "warning",
  API_ACCESS_REQUIRED: "warning",
  DRAFT_UPLOAD_ONLY: "info",
  DIRECT_PUBLISH_READY: "success",
  ERROR: "danger",
};

/**
 * The short pill text. Deliberately not the same strings as
 * `describeMarketingChannelState`, which writes a sentence; this is the
 * two-word badge beside it.
 */
export const INTEGRATION_STATE_LABEL: Readonly<
  Record<MarketingChannelState, string>
> = {
  NOT_CONFIGURED: "Not available",
  NOT_CONNECTED: "Not connected",
  CONNECTING: "Connecting",
  TOKEN_EXPIRED: "Refreshing",
  REAUTH_REQUIRED: "Reconnect needed",
  API_ACCESS_REQUIRED: "Awaiting approval",
  DRAFT_UPLOAD_ONLY: "Drafts only",
  DIRECT_PUBLISH_READY: "Connected",
  ERROR: "Needs attention",
};

export const INTEGRATION_STATE_ACTION: Readonly<
  Record<MarketingChannelState, IntegrationRowAction>
> = {
  // Nothing to click: the deployment holds no credentials for this provider,
  // so a Connect button could only fail. The row names the missing env vars
  // instead, which is the actual next step and belongs to whoever deploys.
  NOT_CONFIGURED: "none",
  NOT_CONNECTED: "connect",
  // Already in flight — a second authorize would mint a second state row.
  CONNECTING: "none",
  // A refresh token exists, so this recovers without the human. Offering a
  // reconnect here would ask someone to redo work a background job will do.
  TOKEN_EXPIRED: "none",
  REAUTH_REQUIRED: "reconnect",
  // Connected and healthy; what is missing is a grant from the provider that
  // no amount of reconnecting will produce. Re-check asks them again.
  API_ACCESS_REQUIRED: "recheck",
  DRAFT_UPLOAD_ONLY: "recheck",
  DIRECT_PUBLISH_READY: "disconnect",
  ERROR: "reconnect",
};

export type IntegrationRowInput = {
  /** Provider → whether this deployment holds its client credentials. */
  readonly configuredProviders: Readonly<Record<string, boolean>>;
  /** Provider → env var NAMES that are missing, for the unconfigured copy. */
  readonly missingEnvVars?: Readonly<Record<string, readonly string[]>>;
  /** The company's connected-account rows, in any order. */
  readonly accounts: readonly IntegrationAccountFacts[];
  /** Providers with a pending, unexpired OAuth state row. */
  readonly authorizeInFlight?: readonly string[];
  /** Injected. Never read a clock inside a render path. */
  readonly nowIso: string;
};

/** The subset of a connected-account row this projection needs. */
export type IntegrationAccountFacts = MarketingChannelAccountFacts & {
  readonly id: string;
  readonly provider: IntegrationProvider;
  readonly lastSuccessAt: string | null;
};

function isPublishChannel(
  provider: IntegrationProvider,
): provider is MarketingPublishChannel {
  return INTEGRATION_CAPABILITIES[provider].kind === "publisher";
}

/**
 * A descriptor for any provider, including the non-publishers that
 * `MARKETING_CHANNEL_DESCRIPTORS` deliberately does not cover — the copy
 * function needs one, and an asset source still has a label and an identity
 * noun even though it is never a publish target.
 */
function descriptorFor(capability: ProviderCapability) {
  return isPublishChannel(capability.provider)
    ? MARKETING_CHANNEL_DESCRIPTORS[capability.provider]
    : {
        channel: capability.provider,
        label: capability.label,
        identityLabel: capability.identityLabel,
        connectPath: capability.connectPath ?? "",
        requiredEnvVars: capability.requiredEnvVars,
      };
}

/**
 * Projects stored facts into one row per provider, in registry order.
 *
 * Pure: every input is passed in, including the clock. The same inputs always
 * produce the same rows, which is what makes every state on this page
 * testable without a browser or a live third-party account.
 */
export function buildIntegrationRows(
  input: IntegrationRowInput,
): IntegrationRow[] {
  const inFlight = new Set(input.authorizeInFlight ?? []);

  return INTEGRATION_PROVIDERS.map((provider) => {
    const capability = INTEGRATION_CAPABILITIES[provider];
    const descriptor = descriptorFor(capability);

    // A provider needing no credentials is configured by definition — the
    // first-party surface is ours and has nothing to authorize.
    const configured =
      capability.requiredEnvVars.length === 0
        ? true
        : (input.configuredProviders[provider] ?? false);

    const account =
      input.accounts.find((row) => row.provider === provider) ?? null;

    const state = deriveMarketingChannelState({
      configured,
      account,
      authorizeInFlight: inFlight.has(provider),
      nowIso: input.nowIso,
    });

    const action = INTEGRATION_STATE_ACTION[state];
    const wantsConnectPath = action === "connect" || action === "reconnect";

    return {
      provider,
      kind: capability.kind,
      label: capability.label,
      state,
      tone: INTEGRATION_STATE_TONE[state],
      statusLabel: INTEGRATION_STATE_LABEL[state],
      detail: describeMarketingChannelState(state, descriptor, account),
      identity: formatChannelIdentity(account),
      action,
      // Never advertise a path for a provider that has none to offer.
      connectPath:
        wantsConnectPath && capability.connectPath
          ? capability.connectPath
          : null,
      missingEnvVars:
        state === "NOT_CONFIGURED"
          ? (input.missingEnvVars?.[provider] ?? capability.requiredEnvVars)
          : [],
      connectedAccountId: account?.id ?? null,
      lastSuccessAt: account?.lastSuccessAt ?? null,
    } satisfies IntegrationRow;
  });
}

/** The page's three sections, in render order. */
export const INTEGRATION_SECTIONS: readonly {
  readonly kind: IntegrationKind;
  readonly title: string;
  readonly description: string;
  readonly emptyTitle: string;
}[] = [
  {
    kind: "publisher",
    title: "Publishing channels",
    description:
      "Where finished content can be delivered. Publishing stays a human decision on every channel.",
    emptyTitle: "No publishing channels are available on this deployment.",
  },
  {
    kind: "asset_source",
    title: "Creative sources",
    description:
      "Providers that generate creative for review. They never receive a post.",
    emptyTitle: "No creative sources are available on this deployment.",
  },
  {
    kind: "first_party",
    title: "Altair surfaces",
    description: "Our own destinations. No third-party credential is involved.",
    emptyTitle: "No Altair surfaces are configured.",
  },
];

export function rowsForSection(
  rows: readonly IntegrationRow[],
  kind: IntegrationKind,
): IntegrationRow[] {
  return rows.filter((row) => row.kind === kind);
}

/**
 * The flash message after an OAuth round trip.
 *
 * Generalizes `formatFacebookConnectFlashMessage` to any provider. The error
 * vocabulary is a closed map: an unrecognized code gets a generic message
 * rather than being echoed back, because that value arrives on the query
 * string and echoing it would paint attacker-controlled text into the page.
 */
export function formatIntegrationConnectFlash(params: {
  readonly connected?: string | null;
  readonly connectError?: string | null;
  readonly provider?: string | null;
}): { tone: "success" | "error"; message: string } | null {
  const label = resolveProviderLabel(params.provider);

  if (params.connected === "1" || params.connected === "true") {
    return { tone: "success", message: `${label} connected.` };
  }

  if (!params.connectError) {
    return null;
  }

  const messages: Record<string, string> = {
    denied: `${label} connection was cancelled.`,
    state: `${label} connection expired or was invalid. Try connecting again.`,
    token_exchange: `${label} authorization failed while exchanging tokens. Try again.`,
    channels: `${label} authorized, but its account list could not be read. Try again.`,
    no_accounts: `${label} authorized, but no usable account was found.`,
    persist: `${label} authorized, but saving the connection failed.`,
    config: `${label} is not fully configured on this environment.`,
    provider: `${label} returned an error during connect.`,
    unsupported: `${label} cannot be connected from this deployment yet.`,
  };

  return {
    tone: "error",
    message: messages[params.connectError] ?? `${label} connection failed. Try again.`,
  };
}

function resolveProviderLabel(provider: string | null | undefined): string {
  if (!provider) return "The integration";
  const known = INTEGRATION_PROVIDERS.find((value) => value === provider);
  return known ? INTEGRATION_CAPABILITIES[known].label : "The integration";
}
