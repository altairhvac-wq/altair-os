import "server-only";

import { createHash } from "crypto";
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
} from "@/lib/integrations/crypto";
import { mapDatabaseError } from "@/lib/database/errors";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Service-role-only read/write for marketing_connected_account_secrets.
 *
 * RLS/GRANT (migration 090): authenticated and anon have no privileges;
 * only service_role may read/write. Never call this from Client Components
 * or return decrypted tokens to the browser.
 */

type MarketingConnectedAccountSecretsClient = ReturnType<
  typeof createServiceRoleClient
>;

function marketingConnectedAccountSecretsTable(
  client: MarketingConnectedAccountSecretsClient,
) {
  // marketing_connected_account_secrets: migration 090 — wire into Database types on next gen types run
  return (
    client as MarketingConnectedAccountSecretsClient & {
      from(table: "marketing_connected_account_secrets"): ReturnType<
        MarketingConnectedAccountSecretsClient["from"]
      >;
    }
  ).from("marketing_connected_account_secrets");
}

function hashTokenForLookup(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export type UpsertMarketingConnectedAccountSecretInput = {
  connectedAccountId: string;
  /** Plaintext access token — encrypted here; never persisted in plaintext. */
  accessTokenPlaintext: string;
  refreshTokenPlaintext?: string | null;
  encryptionKeyVersion?: number;
};

export type UpsertMarketingConnectedAccountSecretResult = {
  error?: string;
};

/**
 * Encrypts and upserts OAuth tokens for a connected account.
 * Accepts plaintext only at this server-only boundary; stores ciphertext only.
 */
export async function upsertMarketingConnectedAccountSecret(
  input: UpsertMarketingConnectedAccountSecretInput,
): Promise<UpsertMarketingConnectedAccountSecretResult> {
  const connectedAccountId = input.connectedAccountId.trim();
  const accessTokenPlaintext = input.accessTokenPlaintext.trim();

  if (!connectedAccountId) {
    return { error: "Connected account id is required." };
  }

  if (!accessTokenPlaintext) {
    return { error: "Access token is required." };
  }

  let accessTokenEncrypted: string;
  let refreshTokenEncrypted: string | null = null;

  try {
    accessTokenEncrypted = encryptIntegrationSecret(accessTokenPlaintext);

    const refreshPlain = input.refreshTokenPlaintext?.trim();
    if (refreshPlain) {
      refreshTokenEncrypted = encryptIntegrationSecret(refreshPlain);
    }
  } catch (error) {
    console.error("[upsertMarketingConnectedAccountSecret] encrypt failed:", {
      connectedAccountId,
      error,
    });
    return { error: "Failed to encrypt integration secret." };
  }

  const supabase = createServiceRoleClient();
  const { error } = await marketingConnectedAccountSecretsTable(supabase).upsert(
    {
      connected_account_id: connectedAccountId,
      access_token_encrypted: accessTokenEncrypted,
      refresh_token_encrypted: refreshTokenEncrypted,
      encryption_key_version: input.encryptionKeyVersion ?? 1,
      token_hash: hashTokenForLookup(accessTokenPlaintext),
    },
    { onConflict: "connected_account_id" },
  );

  if (error) {
    console.error("[upsertMarketingConnectedAccountSecret] upsert failed:", {
      connectedAccountId,
      code: error.code,
      message: error.message,
    });
    return {
      error:
        mapDatabaseError(error) ??
        "Failed to save connected account secret.",
    };
  }

  return {};
}

export type GetMarketingConnectedAccountAccessTokenResult = {
  accessToken?: string;
  error?: string;
};

/**
 * Loads and decrypts a Page/user access token for server-side Graph calls.
 * Service-role only — callers must already authorize the company/user and
 * must never return the plaintext token to clients.
 */
export async function getMarketingConnectedAccountAccessToken(
  connectedAccountId: string,
): Promise<GetMarketingConnectedAccountAccessTokenResult> {
  const normalizedId = connectedAccountId.trim();

  if (!normalizedId) {
    return { error: "Connected account id is required." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await marketingConnectedAccountSecretsTable(supabase)
    .select("access_token_encrypted")
    .eq("connected_account_id", normalizedId)
    .maybeSingle();

  if (error) {
    console.error(
      "[getMarketingConnectedAccountAccessToken] lookup failed:",
      {
        connectedAccountId: normalizedId,
        code: error.code,
        message: error.message,
      },
    );
    return {
      error:
        mapDatabaseError(error) ??
        "Failed to load connected account secret.",
    };
  }

  const encrypted = (
    data as { access_token_encrypted?: string | null } | null
  )?.access_token_encrypted?.trim();

  if (!encrypted) {
    return {
      error:
        "No access token is stored for this connected account. Reconnect Facebook.",
    };
  }

  try {
    const accessToken = decryptIntegrationSecret(encrypted).trim();
    if (!accessToken) {
      return { error: "Stored access token is empty. Reconnect Facebook." };
    }

    return { accessToken };
  } catch (decryptError) {
    console.error(
      "[getMarketingConnectedAccountAccessToken] decrypt failed:",
      {
        connectedAccountId: normalizedId,
        error: decryptError,
      },
    );
    return {
      error:
        "Failed to decrypt the stored access token. Check INTEGRATIONS_ENCRYPTION_KEY, then reconnect Facebook.",
    };
  }
}
