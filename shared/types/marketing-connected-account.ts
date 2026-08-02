export type MarketingConnectedProvider =
  | "facebook"
  | "instagram"
  | "google_business";

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
  scopes: string[];
  tokenExpiresAt?: string;
  connectedBy?: string;
  connectedAt?: string;
  disconnectedAt?: string;
  lastError?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export const MARKETING_CONNECTED_PROVIDER_OPTIONS: {
  value: MarketingConnectedProvider;
  label: string;
  helperText: string;
}[] = [
  {
    value: "facebook",
    label: "Facebook Page",
    helperText:
      "Connect Pages you manage. Publishing requires a later App Review stage.",
  },
  {
    value: "instagram",
    label: "Instagram Business",
    helperText:
      "Requires an Instagram Business account connected to a Facebook Page.",
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
