import { createClient } from "@/lib/supabase/server";
import type {
  MarketingConnectedAccount,
  MarketingConnectedAccountStatus,
  MarketingConnectedProvider,
} from "@/shared/types/marketing-connected-account";
import type { MarketingPublishCapability } from "@/shared/types/marketing-channel-connection";

type MarketingConnectedAccountRow = {
  id: string;
  company_id: string;
  provider: MarketingConnectedProvider;
  provider_account_id: string | null;
  provider_account_name: string | null;
  provider_resource_id: string | null;
  provider_resource_name: string | null;
  status: MarketingConnectedAccountStatus;
  scopes: string[];
  publish_capability: MarketingPublishCapability | null;
  capability_detail: string | null;
  capability_checked_at: string | null;
  token_expires_at: string | null;
  connected_by: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
  last_error: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type MarketingConnectedAccountsClient = Awaited<ReturnType<typeof createClient>>;

function marketingConnectedAccountsTable(client: MarketingConnectedAccountsClient) {
  // marketing_connected_accounts: migration 089 — wire into Database types on next gen types run
  return (client as MarketingConnectedAccountsClient & {
    from(table: "marketing_connected_accounts"): ReturnType<
      MarketingConnectedAccountsClient["from"]
    >;
  }).from("marketing_connected_accounts");
}

function mapMarketingConnectedAccountRow(
  row: MarketingConnectedAccountRow,
): MarketingConnectedAccount {
  return {
    id: row.id,
    companyId: row.company_id,
    provider: row.provider,
    providerAccountId: row.provider_account_id ?? undefined,
    providerAccountName: row.provider_account_name ?? undefined,
    providerResourceId: row.provider_resource_id ?? undefined,
    providerResourceName: row.provider_resource_name ?? undefined,
    status: row.status,
    scopes: row.scopes ?? [],
    // Null-safe: the column is NOT NULL DEFAULT 'none' in SQL, but a row
    // read before 143 applied would surface null, and 'none' is the honest
    // reading of "we have never established what this can do".
    publishCapability: row.publish_capability ?? "none",
    capabilityDetail: row.capability_detail ?? undefined,
    capabilityCheckedAt: row.capability_checked_at ?? undefined,
    tokenExpiresAt: row.token_expires_at ?? undefined,
    connectedBy: row.connected_by ?? undefined,
    connectedAt: row.connected_at ?? undefined,
    disconnectedAt: row.disconnected_at ?? undefined,
    lastError: row.last_error ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMarketingConnectedAccounts(
  companyId: string,
): Promise<MarketingConnectedAccount[]> {
  const supabase = await createClient();

  const { data, error } = await marketingConnectedAccountsTable(supabase)
    .select(
      // publish_capability / capability_detail / capability_checked_at have
      // existed since migration 143 and were never selected here, so the
      // value could not reach `deriveMarketingChannelState` — the state
      // machine written to consume it. Explicit lists are the house style;
      // this is the omission being corrected, not a widening.
      "id, company_id, provider, provider_account_id, provider_account_name, provider_resource_id, provider_resource_name, status, scopes, publish_capability, capability_detail, capability_checked_at, token_expires_at, connected_by, connected_at, disconnected_at, last_error, metadata, created_at, updated_at",
    )
    .eq("company_id", companyId)
    .order("provider", { ascending: true })
    .order("provider_resource_name", { ascending: true, nullsFirst: false })
    .order("provider_account_name", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("[listMarketingConnectedAccounts] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as MarketingConnectedAccountRow[]).map(
    mapMarketingConnectedAccountRow,
  );
}

export async function getMarketingConnectedAccountById(
  companyId: string,
  connectedAccountId: string,
): Promise<MarketingConnectedAccount | null> {
  const normalizedId = connectedAccountId.trim();
  if (!normalizedId) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await marketingConnectedAccountsTable(supabase)
    .select(
      // publish_capability / capability_detail / capability_checked_at have
      // existed since migration 143 and were never selected here, so the
      // value could not reach `deriveMarketingChannelState` — the state
      // machine written to consume it. Explicit lists are the house style;
      // this is the omission being corrected, not a widening.
      "id, company_id, provider, provider_account_id, provider_account_name, provider_resource_id, provider_resource_name, status, scopes, publish_capability, capability_detail, capability_checked_at, token_expires_at, connected_by, connected_at, disconnected_at, last_error, metadata, created_at, updated_at",
    )
    .eq("company_id", companyId)
    .eq("id", normalizedId)
    .maybeSingle();

  if (error) {
    console.error("[getMarketingConnectedAccountById] query failed:", {
      companyId,
      connectedAccountId: normalizedId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  if (!data) {
    return null;
  }

  return mapMarketingConnectedAccountRow(data as MarketingConnectedAccountRow);
}
