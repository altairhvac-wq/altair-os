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
    helperText: "Planned first for business page posting.",
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
  displayStatus: MarketingConnectedAccountDisplayStatus;
  displayStatusLabel: string;
  resourceName?: string;
};

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
  const accountsByProvider = new Map<
    MarketingConnectedProvider,
    MarketingConnectedAccount
  >();

  for (const account of accounts) {
    const existing = accountsByProvider.get(account.provider);
    if (!existing) {
      accountsByProvider.set(account.provider, account);
      continue;
    }

    const existingName =
      existing.providerResourceName ?? existing.providerAccountName ?? "";
    const candidateName =
      account.providerResourceName ?? account.providerAccountName ?? "";
    if (candidateName.localeCompare(existingName) < 0) {
      accountsByProvider.set(account.provider, account);
    }
  }

  return MARKETING_CONNECTED_PROVIDER_OPTIONS.map((option) => {
    const account = accountsByProvider.get(option.value) ?? null;
    const displayStatus: MarketingConnectedAccountDisplayStatus = account
      ? account.status
      : "not_connected";
    const displayStatusLabel =
      displayStatus === "not_connected"
        ? "Not connected"
        : formatMarketingConnectedAccountStatus(displayStatus);
    const resourceName =
      account?.providerResourceName ?? account?.providerAccountName;

    return {
      provider: option.value,
      providerLabel: option.label,
      helperText: option.helperText,
      account,
      displayStatus,
      displayStatusLabel,
      resourceName: resourceName || undefined,
    };
  });
}
