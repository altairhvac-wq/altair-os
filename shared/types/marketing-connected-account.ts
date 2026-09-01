import type { IntegrationProvider } from "./integration-provider";
import type { MarketingPublishCapability } from "./marketing-channel-connection";

/**
 * ============ ONE PROVIDER VOCABULARY, NOT TWO ============
 * This used to be a hand-written three-value union while the SQL enum had
 * five, and `lib/integrations/oauth-state.ts` derives its provider allowlist
 * from the options list below — so YouTube and TikTok could not even have an
 * OAuth state minted, though the database had accepted those labels since
 * migration 143. Aliasing to `IntegrationProvider` makes that drift
 * unrepresentable: there is now exactly one place a provider is spelled, and
 * `scripts/verify-integration-registry.mjs` proves it matches the SQL enum.
 */
export type MarketingConnectedProvider = IntegrationProvider;

export type MarketingConnectedAccountStatus =
  | "connected"
  | "expired"
  | "disconnected"
  | "error";

export type MarketingConnectedAccount = {
  id: string;
  companyId: string;
  provider: MarketingConnectedProvider;
  providerAccountId?: string;
  providerAccountName?: string;
  providerResourceId?: string;
  providerResourceName?: string;
  status: MarketingConnectedAccountStatus;
  /** What we ASKED the provider for at authorize time. */
  scopes: string[];
  /**
   * What this connection can DO, independent of whether the token is valid.
   *
   * The column has existed since migration 143 and was never read by any
   * query — both `listMarketingConnectedAccounts` and the admin query used
   * explicit select lists that omitted it, so the value could not reach the
   * state machine that exists to consume it. Selecting it is what makes
   * `deriveMarketingChannelState` able to tell "connected but not permitted
   * to publish" from "connected and ready".
   */
  publishCapability: MarketingPublishCapability;
  /** Operator-facing reason for the capability, naming the next human step. */
  capabilityDetail?: string;
  capabilityCheckedAt?: string;
  tokenExpiresAt?: string;
  connectedBy?: string;
  connectedAt?: string;
  disconnectedAt?: string;
  lastError?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

/**
 * The providers the MARKETING HUB card renders, in its order.
 *
 * ============ A DISPLAY LIST, NOT AN ALLOWLIST ============
 * Deliberately still the three Meta-era providers. This drives
 * `buildMarketingConnectedAccountStatusRows`, which paints
 * `MarketingConnectedAccountsCard` and the Company settings Connections
 * rows — surfaces about the Facebook/Instagram publishing relationship.
 * Every provider Altair supports is enumerated in
 * `INTEGRATION_PROVIDERS` and rendered by Settings → Integrations instead.
 *
 * `lib/integrations/oauth-state.ts` used to derive its provider allowlist
 * from THIS list, which made a presentation array into a security control:
 * a provider was authorizable only if the Marketing card happened to show
 * it. That is why YouTube and TikTok could not be connected despite the SQL
 * enum accepting them since migration 143. The allowlist now derives from
 * `INTEGRATION_PROVIDERS`; this list is free to stay about the Hub.
 */
export const MARKETING_CONNECTED_PROVIDER_OPTIONS: {
  value: MarketingConnectedProvider;
  label: string;
  helperText: string;
}[] = [
  {
    value: "facebook",
    label: "Facebook Page",
    helperText:
      "Connect Pages you manage. Founder drafts can post to Facebook and linked Instagram from Marketing Hub.",
  },
  {
    value: "instagram",
    label: "Instagram Business",
    helperText:
      "Publishing uses the Instagram Business account linked to a connected Facebook Page (no separate Instagram Login).",
  },
  {
    value: "google_business",
    label: "Google Business Profile",
    helperText:
      "Optional for companies with a verified Google Business Profile.",
  },
];

export const MARKETING_CONNECTED_ACCOUNT_STATUS_OPTIONS: {
  value: MarketingConnectedAccountStatus;
  label: string;
}[] = [
  { value: "connected", label: "Connected" },
  { value: "expired", label: "Expired" },
  { value: "disconnected", label: "Not connected" },
  { value: "error", label: "Needs attention" },
];

export type MarketingConnectedAccountDisplayStatus =
  | MarketingConnectedAccountStatus
  | "not_connected";

export type MarketingConnectedAccountStatusRow = {
  provider: MarketingConnectedProvider;
  providerLabel: string;
  helperText: string;
  account: MarketingConnectedAccount | null;
  /** All connected (or errored) rows for this provider — e.g. multiple Facebook Pages. */
  accounts: MarketingConnectedAccount[];
  displayStatus: MarketingConnectedAccountDisplayStatus;
  displayStatusLabel: string;
  resourceName?: string;
  /** Read-only Page names when pages_show_list returned multiple resources. */
  connectedResourceNames: string[];
};

export function listMarketingConnectedAccountsForProvider(
  accounts: MarketingConnectedAccount[],
  provider: MarketingConnectedProvider,
): MarketingConnectedAccount[] {
  return accounts
    .filter((account) => account.provider === provider)
    .slice()
    .sort((a, b) => {
      const aName = a.providerResourceName ?? a.providerAccountName ?? "";
      const bName = b.providerResourceName ?? b.providerAccountName ?? "";
      return aName.localeCompare(bName);
    });
}

export function resolveMarketingConnectedProviderDisplayStatus(
  providerAccounts: MarketingConnectedAccount[],
): MarketingConnectedAccountDisplayStatus {
  if (providerAccounts.length === 0) {
    return "not_connected";
  }

  if (providerAccounts.some((account) => account.status === "connected")) {
    return "connected";
  }

  if (providerAccounts.some((account) => account.status === "error")) {
    return "error";
  }

  if (providerAccounts.some((account) => account.status === "expired")) {
    return "expired";
  }

  return "disconnected";
}

export function formatMarketingConnectedProvider(
  provider: MarketingConnectedProvider,
): string {
  return (
    MARKETING_CONNECTED_PROVIDER_OPTIONS.find(
      (option) => option.value === provider,
    )?.label ?? provider
  );
}

export function formatMarketingConnectedAccountStatus(
  status: MarketingConnectedAccountStatus,
): string {
  return (
    MARKETING_CONNECTED_ACCOUNT_STATUS_OPTIONS.find(
      (option) => option.value === status,
    )?.label ?? status
  );
}

export function buildMarketingConnectedAccountStatusRows(
  accounts: MarketingConnectedAccount[],
): MarketingConnectedAccountStatusRow[] {
  return MARKETING_CONNECTED_PROVIDER_OPTIONS.map((option) => {
    const providerAccounts = listMarketingConnectedAccountsForProvider(
      accounts,
      option.value,
    );
    const displayStatus =
      resolveMarketingConnectedProviderDisplayStatus(providerAccounts);
    const displayStatusLabel =
      displayStatus === "not_connected"
        ? "Not connected"
        : formatMarketingConnectedAccountStatus(displayStatus);

    const connectedResourceNames = providerAccounts
      .filter(
        (account) =>
          account.status === "connected" &&
          Boolean(account.providerResourceName || account.providerResourceId),
      )
      .map(
        (account) =>
          account.providerResourceName ||
          account.providerResourceId ||
          "Untitled Page",
      );

    const primaryAccount =
      providerAccounts.find((account) => account.status === "connected") ??
      providerAccounts[0] ??
      null;

    const resourceName =
      connectedResourceNames[0] ??
      primaryAccount?.providerResourceName ??
      primaryAccount?.providerAccountName;

    return {
      provider: option.value,
      providerLabel: option.label,
      helperText: option.helperText,
      account: primaryAccount,
      accounts: providerAccounts,
      displayStatus,
      displayStatusLabel,
      resourceName: resourceName || undefined,
      connectedResourceNames,
    };
  });
}

export function formatFacebookConnectFlashMessage(input: {
  facebook?: string | null;
  facebookError?: string | null;
  pages?: string | null;
}): { tone: "success" | "error"; message: string } | null {
  if (input.facebook === "connected") {
    const pageCount = Number.parseInt(input.pages ?? "", 10);
    if (Number.isFinite(pageCount) && pageCount > 0) {
      return {
        tone: "success",
        message:
          pageCount === 1
            ? "Facebook connected. 1 Page is ready."
            : `Facebook connected. ${pageCount} Pages are ready.`,
      };
    }

    return {
      tone: "success",
      message: "Facebook connected.",
    };
  }

  if (!input.facebookError) {
    return null;
  }

  const messages: Record<string, string> = {
    denied: "Facebook connection was cancelled.",
    state: "Facebook connection expired or was invalid. Try connecting again.",
    token_exchange:
      "Facebook authorization failed while exchanging tokens. Try again.",
    pages: "Facebook authorized, but Pages could not be loaded.",
    no_pages:
      "Facebook authorized, but no Pages were found for this account.",
    persist: "Facebook authorized, but saving the connection failed.",
    config: "Facebook OAuth is not fully configured on this environment.",
    provider: "Facebook returned an error during connect.",
  };

  return {
    tone: "error",
    message:
      messages[input.facebookError] ??
      "Facebook connection failed. Try again.",
  };
}
