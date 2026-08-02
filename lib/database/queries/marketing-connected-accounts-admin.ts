import "server-only";

import { mapDatabaseError } from "@/lib/database/errors";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type {
  MarketingConnectedAccount,
  MarketingConnectedAccountStatus,
  MarketingConnectedProvider,
} from "@/shared/types/marketing-connected-account";

/**
 * Service-role helpers for OAuth connect callbacks.
 * Authorized callers must validate OAuth state / permissions before use.
 * Does not touch marketing_connected_account_secrets (see secrets module).
 */

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

type MarketingConnectedAccountsClient = ReturnType<
  typeof createServiceRoleClient
>;

const ACCOUNT_SELECT =
  "id, company_id, provider, provider_account_id, provider_account_name, provider_resource_id, provider_resource_name, status, scopes, token_expires_at, connected_by, connected_at, disconnected_at, last_error, metadata, created_at, updated_at";

function marketingConnectedAccountsTable(
  client: MarketingConnectedAccountsClient,
) {
  // marketing_connected_accounts: migration 089 — wire into Database types on next gen types run
  return (
    client as MarketingConnectedAccountsClient & {
      from(table: "marketing_connected_accounts"): ReturnType<
        MarketingConnectedAccountsClient["from"]
      >;
    }
  ).from("marketing_connected_accounts");
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

export type UpsertMarketingConnectedFacebookPageInput = {
  companyId: string;
  connectedBy: string;
  providerAccountId: string;
  providerAccountName: string;
  providerResourceId: string;
  providerResourceName: string;
  scopes: string[];
  tokenExpiresAt?: string | null;
  metadata?: Record<string, unknown>;
};

export async function upsertMarketingConnectedFacebookPage(
  input: UpsertMarketingConnectedFacebookPageInput,
): Promise<{ account?: MarketingConnectedAccount; error?: string }> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data: existing, error: lookupError } =
    await marketingConnectedAccountsTable(supabase)
      .select("id")
      .eq("company_id", input.companyId)
      .eq("provider", "facebook")
      .eq("provider_resource_id", input.providerResourceId)
      .maybeSingle();

  if (lookupError) {
    console.error("[upsertMarketingConnectedFacebookPage] lookup failed:", {
      companyId: input.companyId,
      code: lookupError.code,
      message: lookupError.message,
    });
    return {
      error:
        mapDatabaseError(lookupError) ??
        "Failed to look up connected Facebook Page.",
    };
  }

  const existingId = (existing as { id?: string } | null)?.id;
  const payload = {
    company_id: input.companyId,
    provider: "facebook" as const,
    provider_account_id: input.providerAccountId,
    provider_account_name: input.providerAccountName,
    provider_resource_id: input.providerResourceId,
    provider_resource_name: input.providerResourceName,
    status: "connected" as const,
    scopes: input.scopes,
    token_expires_at: input.tokenExpiresAt ?? null,
    connected_by: input.connectedBy,
    connected_at: now,
    disconnected_at: null,
    last_error: null,
    metadata: input.metadata ?? {},
  };

  if (existingId) {
    const { data, error } = await marketingConnectedAccountsTable(supabase)
      .update(payload)
      .eq("id", existingId)
      .select(ACCOUNT_SELECT)
      .single();

    if (error || !data) {
      console.error("[upsertMarketingConnectedFacebookPage] update failed:", {
        companyId: input.companyId,
        code: error?.code,
        message: error?.message,
      });
      return {
        error:
          mapDatabaseError(error) ?? "Failed to update Facebook Page connection.",
      };
    }

    return {
      account: mapMarketingConnectedAccountRow(
        data as MarketingConnectedAccountRow,
      ),
    };
  }

  const { data, error } = await marketingConnectedAccountsTable(supabase)
    .insert(payload)
    .select(ACCOUNT_SELECT)
    .single();

  if (error || !data) {
    console.error("[upsertMarketingConnectedFacebookPage] insert failed:", {
      companyId: input.companyId,
      code: error?.code,
      message: error?.message,
    });
    return {
      error:
        mapDatabaseError(error) ?? "Failed to save Facebook Page connection.",
    };
  }

  return {
    account: mapMarketingConnectedAccountRow(
      data as MarketingConnectedAccountRow,
    ),
  };
}

/**
 * Marks Facebook Page connections not present in the latest OAuth page list
 * as disconnected (metadata only — secrets cascade on hard delete only).
 */
export async function disconnectMissingMarketingConnectedFacebookPages(input: {
  companyId: string;
  keepProviderResourceIds: string[];
}): Promise<{ error?: string }> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data: rows, error: listError } = await marketingConnectedAccountsTable(
    supabase,
  )
    .select("id, provider_resource_id")
    .eq("company_id", input.companyId)
    .eq("provider", "facebook")
    .eq("status", "connected");

  if (listError) {
    console.error(
      "[disconnectMissingMarketingConnectedFacebookPages] list failed:",
      {
        companyId: input.companyId,
        code: listError.code,
        message: listError.message,
      },
    );
    return {
      error:
        mapDatabaseError(listError) ??
        "Failed to refresh Facebook Page connections.",
    };
  }

  const keep = new Set(input.keepProviderResourceIds);
  const toDisconnect = (
    (rows ?? []) as Array<{ id: string; provider_resource_id: string | null }>
  )
    .filter(
      (row) =>
        row.provider_resource_id != null &&
        !keep.has(row.provider_resource_id),
    )
    .map((row) => row.id);

  if (toDisconnect.length === 0) {
    return {};
  }

  const { error } = await marketingConnectedAccountsTable(supabase)
    .update({
      status: "disconnected",
      disconnected_at: now,
      last_error: null,
    })
    .in("id", toDisconnect);

  if (error) {
    console.error(
      "[disconnectMissingMarketingConnectedFacebookPages] update failed:",
      {
        companyId: input.companyId,
        code: error.code,
        message: error.message,
      },
    );
    return {
      error:
        mapDatabaseError(error) ??
        "Failed to update stale Facebook Page connections.",
    };
  }

  return {};
}

export async function clearMarketingConnectedFacebookNoPagesPlaceholder(input: {
  companyId: string;
}): Promise<{ error?: string }> {
  const supabase = createServiceRoleClient();

  const { error } = await marketingConnectedAccountsTable(supabase)
    .delete()
    .eq("company_id", input.companyId)
    .eq("provider", "facebook")
    .is("provider_resource_id", null);

  if (error) {
    console.error(
      "[clearMarketingConnectedFacebookNoPagesPlaceholder] delete failed:",
      {
        companyId: input.companyId,
        code: error.code,
        message: error.message,
      },
    );
    return {
      error:
        mapDatabaseError(error) ??
        "Failed to clear placeholder Facebook connection.",
    };
  }

  return {};
}

export async function upsertMarketingConnectedFacebookUserWithoutPages(input: {
  companyId: string;
  connectedBy: string;
  providerAccountId: string;
  providerAccountName: string;
  scopes: string[];
  tokenExpiresAt?: string | null;
  lastError: string;
}): Promise<{ account?: MarketingConnectedAccount; error?: string }> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data: existing, error: lookupError } =
    await marketingConnectedAccountsTable(supabase)
      .select("id")
      .eq("company_id", input.companyId)
      .eq("provider", "facebook")
      .is("provider_resource_id", null)
      .maybeSingle();

  if (lookupError) {
    return {
      error:
        mapDatabaseError(lookupError) ??
        "Failed to look up Facebook connection.",
    };
  }

  const existingId = (existing as { id?: string } | null)?.id;
  const payload = {
    company_id: input.companyId,
    provider: "facebook" as const,
    provider_account_id: input.providerAccountId,
    provider_account_name: input.providerAccountName,
    provider_resource_id: null,
    provider_resource_name: null,
    status: "error" as const,
    scopes: input.scopes,
    token_expires_at: input.tokenExpiresAt ?? null,
    connected_by: input.connectedBy,
    connected_at: now,
    disconnected_at: null,
    last_error: input.lastError,
    metadata: { reason: "no_pages" },
  };

  if (existingId) {
    const { data, error } = await marketingConnectedAccountsTable(supabase)
      .update(payload)
      .eq("id", existingId)
      .select(ACCOUNT_SELECT)
      .single();

    if (error || !data) {
      return {
        error:
          mapDatabaseError(error) ?? "Failed to update Facebook connection.",
      };
    }

    return {
      account: mapMarketingConnectedAccountRow(
        data as MarketingConnectedAccountRow,
      ),
    };
  }

  const { data, error } = await marketingConnectedAccountsTable(supabase)
    .insert(payload)
    .select(ACCOUNT_SELECT)
    .single();

  if (error || !data) {
    return {
      error: mapDatabaseError(error) ?? "Failed to save Facebook connection.",
    };
  }

  return {
    account: mapMarketingConnectedAccountRow(
      data as MarketingConnectedAccountRow,
    ),
  };
}
