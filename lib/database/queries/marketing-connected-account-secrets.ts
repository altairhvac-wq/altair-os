import "server-only";

import { createHash } from "crypto";
import { encryptIntegrationSecret } from "@/lib/integrations/crypto";
import { mapDatabaseError } from "@/lib/database/errors";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Service-role-only writes for marketing_connected_account_secrets.
 *
 * RLS/GRANT (migration 090): authenticated and anon have no privileges;
 * only service_role may read/write. Never call this from Client Components
 * or expose decrypted tokens through Server Actions / Route Handlers.
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
