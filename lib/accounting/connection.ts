import "server-only";

import { HttpQboApi } from "@/lib/accounting/quickbooks/http-api";
import { QboError } from "@/lib/accounting/quickbooks/errors";
import {
  refreshQuickBooksTokens,
  revokeQuickBooksToken,
  type QuickBooksTokens,
} from "@/lib/accounting/quickbooks/oauth";
import type { QuickBooksEnvironment } from "@/lib/accounting/quickbooks/env";
import type { Database } from "@/lib/database/types/database";
import { decryptIntegrationSecret, encryptIntegrationSecret } from "@/lib/integrations/crypto";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * The one module that reads, refreshes and deletes a company's QuickBooks
 * keys. Everything here runs with the service role and is called only after
 * the caller has been authorised (app/actions/quickbooks.ts, the callback
 * route, the cron route).
 *
 * ============================== NOTHING LEAKS ==============================
 * No returned value, thrown message or log line contains a token. Errors are
 * QboError kinds or fixed prose, the discipline lib/integrations/credentials.ts
 * holds for the marketing channels.
 *
 * ============================== ONE REFRESH AT A TIME ==============================
 * Intuit rolls the refresh token forward on every refresh and may revoke it
 * when two refreshes race. A refresh first claims refresh_lock_until with a
 * conditional update. A caller that loses the claim waits for the winner's
 * new token instead of refreshing again.
 */

export type AccountingConnectionRow = Database["public"]["Tables"]["accounting_connections"]["Row"];

const ACCESS_TOKEN_MARGIN_MS = 5 * 60_000;
const REFRESH_LOCK_MS = 30_000;
const REFRESH_WAIT_STEPS_MS = [500, 1000, 1500, 2500, 4000];
/** Refresh a quiet connection before Intuit's 100-day idle limit. */
export const KEEPALIVE_AFTER_DAYS = 30;

function db() {
  return createServiceRoleClient();
}

export async function getAccountingConnection(companyId: string): Promise<AccountingConnectionRow | null> {
  const { data, error } = await db()
    .from("accounting_connections")
    .select("*")
    .eq("company_id", companyId)
    .eq("provider", "quickbooks_online")
    .maybeSingle();
  if (error) throw new Error("Could not read the QuickBooks connection.");
  return data;
}

/**
 * Store a fresh sign-in. A new QuickBooks company starts over at setup; the
 * same company reconnecting after its keys lapsed carries on where it was.
 */
export async function saveQuickBooksSignIn(input: {
  companyId: string;
  userId: string;
  realmId: string;
  environment: QuickBooksEnvironment;
  tokens: QuickBooksTokens;
  companyName: string | null;
  taxMode: "automated" | "manual" | "none";
  customDocNumbers: boolean;
}): Promise<AccountingConnectionRow> {
  const client = db();
  const existing = await getAccountingConnection(input.companyId);
  const sameCompanyResuming =
    existing &&
    existing.realm_id === input.realmId &&
    existing.environment === input.environment &&
    existing.status === "reauth_required";

  let connection: AccountingConnectionRow;
  if (existing) {
    if (!sameCompanyResuming) {
      // A different QuickBooks company, or a fresh start: nothing Altair
      // remembered about the old one applies.
      await client.from("accounting_sync_records").delete().eq("connection_id", existing.id);
    }
    const { data, error } = await client
      .from("accounting_connections")
      .update({
        environment: input.environment,
        realm_id: input.realmId,
        external_company_name: input.companyName,
        status: sameCompanyResuming ? "active" : "setup",
        tax_mode: input.taxMode,
        custom_doc_numbers: input.customDocNumbers,
        ...(sameCompanyResuming
          ? {}
          : {
              start_mode: null,
              started_at: null,
              income_account_ref: null,
              income_account_name: null,
              deposit_account_ref: null,
              deposit_account_name: null,
              manual_tax_code_ref: null,
              manual_tax_code_name: null,
              general_item_ref: null,
            }),
        connected_by: input.userId,
        connected_at: new Date().toISOString(),
        disconnected_by: null,
        disconnected_at: null,
        sync_lock_until: null,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error || !data) throw new Error("Could not save the QuickBooks connection.");
    connection = data;
  } else {
    const { data, error } = await client
      .from("accounting_connections")
      .insert({
        company_id: input.companyId,
        provider: "quickbooks_online",
        environment: input.environment,
        realm_id: input.realmId,
        external_company_name: input.companyName,
        status: "setup",
        tax_mode: input.taxMode,
        custom_doc_numbers: input.customDocNumbers,
        connected_by: input.userId,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error("Could not save the QuickBooks connection.");
    connection = data;
  }

  await writeTokens(connection, input.tokens);
  return connection;
}

async function writeTokens(connection: Pick<AccountingConnectionRow, "id" | "company_id">, tokens: QuickBooksTokens): Promise<void> {
  const { error } = await db()
    .from("accounting_connection_secrets")
    .upsert(
      {
        connection_id: connection.id,
        company_id: connection.company_id,
        access_token_ciphertext: encryptIntegrationSecret(tokens.accessToken),
        access_token_expires_at: tokens.accessTokenExpiresAt.toISOString(),
        refresh_token_ciphertext: encryptIntegrationSecret(tokens.refreshToken),
        refresh_token_expires_at: tokens.refreshTokenExpiresAt?.toISOString() ?? null,
        refresh_lock_until: null,
      },
      { onConflict: "connection_id" },
    );
  if (error) throw new Error("Could not store the QuickBooks keys.");
}

type SecretRow = Database["public"]["Tables"]["accounting_connection_secrets"]["Row"];

async function readSecrets(connectionId: string): Promise<SecretRow | null> {
  const { data, error } = await db()
    .from("accounting_connection_secrets")
    .select("*")
    .eq("connection_id", connectionId)
    .maybeSingle();
  if (error) throw new Error("Could not read the QuickBooks keys.");
  return data;
}

export async function markReauthRequired(connectionId: string): Promise<void> {
  await db()
    .from("accounting_connections")
    .update({ status: "reauth_required", sync_lock_until: null })
    .eq("id", connectionId)
    .in("status", ["active", "setup"]);
}

/**
 * A valid access token for this connection, refreshing if it is within five
 * minutes of expiry (or if `force`). Throws QboError "auth" and marks the
 * connection when Intuit refuses: the owner must connect again.
 */
export async function getValidAccessToken(
  connection: Pick<AccountingConnectionRow, "id" | "company_id">,
  options: { force?: boolean } = {},
): Promise<string> {
  const secrets = await readSecrets(connection.id);
  if (!secrets) {
    await markReauthRequired(connection.id);
    throw new QboError({ kind: "auth" });
  }
  const fresh = new Date(secrets.access_token_expires_at).getTime() - Date.now() > ACCESS_TOKEN_MARGIN_MS;
  if (fresh && !options.force) return decryptIntegrationSecret(secrets.access_token_ciphertext);

  const client = db();
  const now = new Date();
  const { data: claimed } = await client
    .from("accounting_connection_secrets")
    .update({ refresh_lock_until: new Date(now.getTime() + REFRESH_LOCK_MS).toISOString() })
    .eq("connection_id", connection.id)
    .or(`refresh_lock_until.is.null,refresh_lock_until.lt.${now.toISOString()}`)
    .select("connection_id");

  if (!claimed || claimed.length === 0) {
    // Somebody else is refreshing: wait for their new token.
    for (const wait of REFRESH_WAIT_STEPS_MS) {
      await new Promise((resolve) => setTimeout(resolve, wait));
      const latest = await readSecrets(connection.id);
      if (latest && latest.updated_at !== secrets.updated_at && !latest.refresh_lock_until) {
        return decryptIntegrationSecret(latest.access_token_ciphertext);
      }
    }
    throw new QboError({ kind: "server" });
  }

  try {
    const tokens = await refreshQuickBooksTokens(decryptIntegrationSecret(secrets.refresh_token_ciphertext));
    await writeTokens(connection, tokens);
    return tokens.accessToken;
  } catch (error) {
    await client.from("accounting_connection_secrets").update({ refresh_lock_until: null }).eq("connection_id", connection.id);
    if (error instanceof QboError && error.kind === "auth") {
      await markReauthRequired(connection.id);
    }
    throw error;
  }
}

/** The API for this connection, with a token that refreshes itself. */
export function apiForConnection(connection: AccountingConnectionRow): HttpQboApi {
  return new HttpQboApi({
    realmId: connection.realm_id,
    environment: connection.environment,
    getAccessToken: () => getValidAccessToken(connection),
  });
}

/** True when the keys have not been refreshed for KEEPALIVE_AFTER_DAYS. */
export async function needsKeepalive(connectionId: string): Promise<boolean> {
  const secrets = await readSecrets(connectionId);
  if (!secrets) return false;
  return Date.now() - new Date(secrets.updated_at).getTime() > KEEPALIVE_AFTER_DAYS * 86_400_000;
}

/**
 * Disconnect: tell Intuit, then delete the keys and everything Altair
 * remembered about that QuickBooks company (Intuit's terms: within 30 days;
 * here, at once). What is already in QuickBooks stays there.
 */
export async function disconnectQuickBooks(input: { companyId: string; userId: string }): Promise<void> {
  const connection = await getAccountingConnection(input.companyId);
  if (!connection) return;
  const client = db();
  const secrets = await readSecrets(connection.id);
  if (secrets) {
    try {
      await revokeQuickBooksToken(decryptIntegrationSecret(secrets.refresh_token_ciphertext));
    } catch {
      // Best effort. The keys are deleted below either way.
    }
  }
  await client.from("accounting_connection_secrets").delete().eq("connection_id", connection.id);
  await client.from("accounting_sync_records").delete().eq("connection_id", connection.id);
  const { error } = await client
    .from("accounting_connections")
    .update({
      status: "disconnected",
      disconnected_by: input.userId,
      disconnected_at: new Date().toISOString(),
      sync_lock_until: null,
      start_mode: null,
      started_at: null,
      general_item_ref: null,
    })
    .eq("id", connection.id);
  if (error) throw new Error("Could not record the disconnect.");
}
