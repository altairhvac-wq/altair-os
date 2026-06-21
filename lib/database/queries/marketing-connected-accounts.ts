import { createClient } from "@/lib/supabase/server";
import type {
  MarketingConnectedAccount,
  MarketingConnectedAccountStatus,
  MarketingConnectedProvider,
} from "@/shared/types/marketing-connected-account";

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
      "id, company_id, provider, provider_account_id, provider_account_name, provider_resource_id, provider_resource_name, status, scopes, token_expires_at, connected_by, connected_at, disconnected_at, last_error, metadata, created_at, updated_at",
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
