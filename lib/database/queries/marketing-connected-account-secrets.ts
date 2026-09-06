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
  /**
   * Three meanings, and the difference is a stored credential's life:
   *
   *   a string    the provider issued (or rotated) a refresh token — store it
   *   undefined   the provider SAID NOTHING — keep whatever is stored.
   *               Google routinely returns no refresh token on a repeat
   *               authorization and on every ordinary refresh; writing null
   *               for "not mentioned" is how a working connection loses the
   *               only credential that can refresh it and dies at the next
   *               expiry with nothing able to say why.
   *   null        the provider said there is none — clear it
   */
  refreshTokenPlaintext?: string | null;
  encryptionKeyVersion?: number;
  /**
   * Compare-and-swap guard: the `updated_at` the caller read before deciding
   * to write. When set, the write lands only if the row is still exactly
   * that version; a concurrent writer having landed first comes back as
   * `{ conflict: true }` with the row untouched — never as a stale
   * credential silently overwriting a newer one.
   *
   * CAS is an UPDATE, so it also refuses to create a row: a caller holding
   * an expected version read one, and a row that has since vanished is a
   * conflict too (a disconnect won the race).
   */
  expectedUpdatedAt?: string;
};

export type UpsertMarketingConnectedAccountSecretResult = {
  error?: string;
  /** CAS only: another writer landed first. Nothing was written. */
  conflict?: boolean;
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

  const payload: Record<string, unknown> = {
    connected_account_id: connectedAccountId,
    access_token_encrypted: accessTokenEncrypted,
    encryption_key_version: input.encryptionKeyVersion ?? 1,
    token_hash: hashTokenForLookup(accessTokenPlaintext),
  };

  // Only when the provider actually spoke. An omitted column preserves the
  // stored value on a conflict-update and stays null on a fresh insert —
  // exactly the "keep what you already hold" semantics `undefined` means.
  if (input.refreshTokenPlaintext !== undefined) {
    payload.refresh_token_encrypted = refreshTokenEncrypted;
  }

  const supabase = createServiceRoleClient();

  if (input.expectedUpdatedAt !== undefined) {
    // The CAS path. `updated_at` moves on every write (trigger, migration
    // 090), so matching the value read earlier is matching "nobody wrote
    // since I looked".
    const { connected_account_id: _omit, ...updatePayload } = payload;
    void _omit;
    const { data, error } = await marketingConnectedAccountSecretsTable(
      supabase,
    )
      .update(updatePayload)
      .eq("connected_account_id", connectedAccountId)
      .eq("updated_at", input.expectedUpdatedAt)
      .select("connected_account_id")
      .maybeSingle();

    if (error) {
      console.error("[upsertMarketingConnectedAccountSecret] CAS failed:", {
        connectedAccountId,
        code: error.code,
        message: error.message,
      });
      return {
        error:
          mapDatabaseError(error) ?? "Failed to save connected account secret.",
      };
    }

    if (!data) {
      return { conflict: true };
    }

    return {};
  }

  const { error } = await marketingConnectedAccountSecretsTable(supabase).upsert(
    payload,
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

/**
 * Whether a refresh token ciphertext is stored for this account — presence
 * only, never content. This is the non-secret fact the connect flows project
 * into `metadata.hasRefreshToken` so user-scoped surfaces can render an
 * expiry honestly without touching this table.
 */
export async function readSecretRefreshTokenPresence(
  connectedAccountId: string,
): Promise<{ present?: boolean; error?: string }> {
  const normalizedId = connectedAccountId.trim();
  if (!normalizedId) {
    return { error: "Connected account id is required." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await marketingConnectedAccountSecretsTable(supabase)
    .select("refresh_token_encrypted")
    .eq("connected_account_id", normalizedId)
    .maybeSingle();

  if (error) {
    console.error("[readSecretRefreshTokenPresence] lookup failed:", {
      connectedAccountId: normalizedId,
      code: error.code,
      message: error.message,
    });
    return {
      error:
        mapDatabaseError(error) ?? "Failed to read connected account secret.",
    };
  }

  const encrypted = (
    data as { refresh_token_encrypted?: string | null } | null
  )?.refresh_token_encrypted?.trim();

  return { present: Boolean(encrypted) };
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
