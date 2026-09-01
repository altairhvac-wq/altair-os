import "server-only";

/**
 * The credential seam — the one place a stored integration secret is read,
 * decrypted, refreshed and written back.
 *
 * ===================== WHAT THIS FILE IS FOR =====================
 * `marketing_connected_account_secrets` is the most sensitive table in the
 * schema: service-role only, no `company_id` of its own (tenancy comes from
 * the parent account row via `on delete cascade`), and every row is an
 * access token that can post to a real brand account. Before this module,
 * "who may read it?" was answered by grepping for the table name. Now it is
 * answered by reading one file.
 *
 * Provider adapters never see this module. They are handed a plaintext token
 * for the duration of one call and hand back a result — the same discipline
 * `channel-publish-requests.ts` states for its builders, and for the same
 * reason: a module that can obtain a credential on its own cannot be tested
 * without one.
 *
 * ====================== NOTHING LEAKS FROM HERE ======================
 * No returned string, no thrown message and no log line produced by this
 * file may contain a plaintext access token, a refresh token, or key
 * material. Three mechanisms, not one promise:
 *
 *   1. Operator-facing text is built from FIXED prose in this file plus
 *      non-secret identifiers (a company id, an account id, a provider name,
 *      a key VERSION NUMBER, an env var NAME). Never from a provider's or a
 *      database's response body.
 *   2. A provider's or a database's own words are never forwarded, only
 *      classified. Scrubbing known plaintexts out of them and passing on the
 *      remainder was tried and is a denylist: a hostile adapter echoing a
 *      token this row does not store defeats it, because a denylist can only
 *      remove what it already knows. `describeRequestForLog` redacts by
 *      position, not by value, for the same reason.
 *   3. Decryption failures are logged with the KEY VERSION and the error's
 *      class name, never the error's message. `crypto.ts` sets that posture
 *      explicitly: "Failures name the key version and nothing else — enough
 *      to diagnose a rotation, useless to anyone who obtains the log."
 *
 * ============ WHY THE QUERIES LIVE HERE AND NOT IN lib/database ============
 * `lib/integrations/oauth-state.ts` already owns its table directly for the
 * same reason: these rows are not domain data that a page renders, they are
 * the credential machinery of this directory, and splitting the read from
 * the decrypt across two modules is what makes "who can reach a token"
 * unanswerable. Writes of the ciphertext itself still go through the
 * existing `upsertMarketingConnectedAccountSecret`, which owns the one
 * cipher call and the token hash.
 */
import { upsertMarketingConnectedAccountSecret } from "@/lib/database/queries/marketing-connected-account-secrets";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { isTokenExpired } from "@/shared/types/marketing-channel-connection";
import type {
  IntegrationKind,
  IntegrationProvider,
} from "@/shared/types/integration-provider";
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
  readIntegrationSecretKeyVersion,
} from "./crypto";
import type { RefreshCredentialResult } from "./port";
import { resolveIntegrationAdapter } from "./registry";

/**
 * How far ahead of expiry a token counts as expired.
 *
 * A token that is valid now and dies in forty seconds is not valid for the
 * ninety-second resumable upload about to start — and that upload happens
 * INSIDE a delivery claim, so dying halfway leaves an unsettled `in_flight`
 * row, which `decideDelivery` correctly refuses to auto-retry. Refreshing at
 * a horizon costs one extra provider call; not refreshing costs a human
 * reconciling with the provider by hand.
 *
 * Well under `DELIVERY_IN_FLIGHT_GRACE_MS` (5 min), so the horizon can never
 * be the reason a claim outlives its grace period.
 */
export const CREDENTIAL_REFRESH_HORIZON_MS = 2 * 60_000;

/**
 * Mirrors the `refresh_failure_count <= 1000` CHECK in migration 181.
 *
 * Clamped rather than trusted: without this, the 1001st consecutive failure
 * makes the UPDATE itself fail the constraint, and a provider failure that
 * was being recorded honestly becomes one that is not recorded at all.
 */
export const REFRESH_FAILURE_CEILING = 1000;

/**
 * Matches the `capability_probe_error <= 500` CHECK in migration 181, so a
 * detail produced here can be persisted verbatim by a caller. Same reasoning
 * as `clampFailureDetail` in `marketing-delivery.ts`, one bound tighter.
 */
export const CREDENTIAL_DETAIL_MAX = 500;

const SECRET_COLUMNS =
  "access_token_encrypted, refresh_token_encrypted, encryption_key_version, refresh_expires_at, refresh_failure_count, last_refreshed_at";

/** Non-secret, fixed, and never stored. See `currentSecretKeyVersion`. */
const KEY_VERSION_PROBE = "integration-key-version-probe";

/* ------------------------------------------------------------------ types */

/**
 * What this module needs to know about a connection, all of it already
 * loaded — and therefore already tenant-scoped — by the caller.
 *
 * The secrets table has no `company_id`; it inherits tenancy from the
 * account row it is keyed by. So the company boundary is enforced where the
 * account is read, and passing `companyId` in here is what lets a log line
 * name the tenant without this module doing a second lookup to find it.
 */
export type CredentialAccountFacts = {
  readonly connectedAccountId: string;
  readonly companyId: string;
  readonly provider: IntegrationProvider;
  readonly integrationKind: IntegrationKind;
  readonly tokenExpiresAt: string | null;
};

export const CREDENTIAL_FAILURES = [
  /** An Altair-owned surface. There is no credential, by design. */
  "FIRST_PARTY_NO_CREDENTIAL",
  /** The account exists; no secret row does. */
  "NO_SECRET_STORED",
  /**
   * Only a human reconnecting will fix this. Spelled exactly as the
   * `MarketingChannelState` of the same name so the Integrations page can
   * render the copy it already has for that state.
   */
  "REAUTH_REQUIRED",
  /** This deployment cannot refresh this provider (no adapter, or no hop). */
  "REFRESH_UNAVAILABLE",
  /** The provider was asked and said no. The count was incremented. */
  "REFRESH_FAILED",
  /** Ciphertext is present and unreadable — usually a rotation gone wrong. */
  "DECRYPT_FAILED",
  /** The cipher is not configured, so a new credential could not be stored. */
  "ENCRYPTION_UNAVAILABLE",
  /** The secrets table could not be read or written. */
  "LOOKUP_FAILED",
] as const;
export type CredentialFailure = (typeof CREDENTIAL_FAILURES)[number];

export type CredentialResult =
  | {
      readonly ok: true;
      /** Plaintext. Hand it to one call; never persist or log it. */
      readonly accessToken: string;
      readonly refreshed: boolean;
      /**
       * The expiry that now applies.
       *
       * PERSIST THIS when `refreshed` is true. This module writes only the
       * secrets table it owns; `marketing_connected_accounts.token_expires_at`
       * is what `deriveMarketingChannelState` reads, and leaving it stale
       * makes the Integrations page report TOKEN_EXPIRED for a connection
       * that was just refreshed.
       */
      readonly tokenExpiresAt: string | null;
    }
  | {
      readonly ok: false;
      readonly reason: CredentialFailure;
      /** Operator-facing, secret-free, and within `CREDENTIAL_DETAIL_MAX`. */
      readonly detail: string;
    };

type SecretRow = {
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  encryption_key_version: number | null;
  refresh_expires_at: string | null;
  refresh_failure_count: number | null;
  last_refreshed_at: string | null;
};

type SecretsClient = ReturnType<typeof createServiceRoleClient>;

function secretsTable(client: SecretsClient) {
  // marketing_connected_account_secrets: migration 090 — wire into Database
  // types on next gen types run, as the sibling query modules do.
  return (
    client as SecretsClient & {
      from(table: "marketing_connected_account_secrets"): ReturnType<
        SecretsClient["from"]
      >;
    }
  ).from("marketing_connected_account_secrets");
}

/* ------------------------------------------------------------- redaction */

function clampDetail(detail: string): string {
  const trimmed = detail.trim().replace(/\s+/g, " ");
  return trimmed.length <= CREDENTIAL_DETAIL_MAX
    ? trimmed
    : `${trimmed.slice(0, CREDENTIAL_DETAIL_MAX - 1)}…`;
}

/**
 * The only logger in this file. Every field is a non-secret identifier by
 * construction — ids, a provider name, a key VERSION, an error class name.
 * Nothing that ever held plaintext is passed in, including caught errors,
 * whose messages routinely quote what they failed on.
 */
function logCredentialEvent(
  event: string,
  account: CredentialAccountFacts,
  extra: Readonly<Record<string, string | number | null>> = {},
): void {
  console.error(`[integration-credentials] ${event}`, {
    companyId: account.companyId,
    connectedAccountId: account.connectedAccountId,
    provider: account.provider,
    ...extra,
  });
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "unknown";
}

/* ------------------------------------------------------------ key version */

/**
 * The key version the NEXT write will actually carry.
 *
 * ==================== THE DEFECT THIS AVOIDS ====================
 * `upsertMarketingConnectedAccountSecret` defaults `encryption_key_version`
 * to the literal `1`. Every caller today omits the field, so after a key
 * rotation the ciphertext prefix says `v2` while the column claims `v1` —
 * and the column is exactly what an operator and
 * `scripts/rotate-integration-secrets.mjs` read to decide which rows still
 * need re-encrypting. The rows that most need attention are the ones that
 * look finished.
 *
 * Asking the cipher rather than reading the version env var a second time is
 * deliberate: `encryptIntegrationSecret` stamps the version it actually used
 * into the payload, and `readIntegrationSecretKeyVersion` is the same parser
 * decryption uses. The number therefore cannot disagree with the ciphertext
 * about to be written, which two independent env reads can. The probe
 * plaintext is a fixed non-secret marker and the payload is discarded.
 *
 * Returning null is also the pre-flight: an unconfigured or malformed key
 * means the refreshed credential could not be stored, and that has to be
 * known BEFORE the provider is asked to rotate one.
 */
function currentSecretKeyVersion(): number | null {
  try {
    return readIntegrationSecretKeyVersion(
      encryptIntegrationSecret(KEY_VERSION_PROBE),
    );
  } catch {
    // Deliberately not logged. The thrown message names the env var and, in
    // a misconfiguration, can quote what it was handed.
    return null;
  }
}

/* --------------------------------------------------------------- refusals */

/**
 * A first-party surface has no delegated credential — migration 181 forbids
 * even a `token_expires_at` on the row.
 *
 * Returned BEFORE any query, and that ordering is the rule, not an
 * optimisation. Reading the secrets table for a connection that provably has
 * no secret is a service-role read of the most sensitive table in the schema
 * performed for no reason, and every such read is one more place a
 * credential path can be pointed at a row it has no business seeing.
 */
function firstPartyRefusal(
  account: CredentialAccountFacts,
): CredentialResult {
  return {
    ok: false,
    reason: "FIRST_PARTY_NO_CREDENTIAL",
    detail: clampDetail(
      `${account.provider} is an Altair-owned surface and holds no third-party credential. Nothing needs to be decrypted to write to it.`,
    ),
  };
}

function reauthRequired(
  account: CredentialAccountFacts,
  because: string,
): CredentialResult {
  return {
    ok: false,
    reason: "REAUTH_REQUIRED",
    detail: clampDetail(
      `Access to ${account.provider} expired and cannot be refreshed because ${because}. Reconnect it.`,
    ),
  };
}

/* -------------------------------------------------------------- the reads */

type SecretRead =
  | { readonly ok: true; readonly row: SecretRow }
  | { readonly ok: false; readonly failure: CredentialResult };

async function readSecretRow(
  account: CredentialAccountFacts,
): Promise<SecretRead> {
  const connectedAccountId = account.connectedAccountId.trim();
  if (!connectedAccountId) {
    return {
      ok: false,
      failure: {
        ok: false,
        reason: "LOOKUP_FAILED",
        detail: "A connected account id is required to load a credential.",
      },
    };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await secretsTable(supabase)
    .select(SECRET_COLUMNS)
    .eq("connected_account_id", connectedAccountId)
    .maybeSingle();

  if (error) {
    logCredentialEvent("secret lookup failed", account, {
      code: error.code ?? null,
      message: error.message ?? null,
    });
    return {
      ok: false,
      failure: {
        ok: false,
        reason: "LOOKUP_FAILED",
        detail: clampDetail(
          `The stored ${account.provider} credential could not be read. Try again; if it persists, reconnect ${account.provider}.`,
        ),
      },
    };
  }

  const row = data as SecretRow | null;
  if (!row) {
    return {
      ok: false,
      failure: {
        ok: false,
        reason: "NO_SECRET_STORED",
        detail: clampDetail(
          `No ${account.provider} credential is stored for this connection. Reconnect ${account.provider}.`,
        ),
      },
    };
  }

  return { ok: true, row };
}

function decryptStoredAccessToken(
  account: CredentialAccountFacts,
  row: SecretRow,
): CredentialResult {
  const encrypted = row.access_token_encrypted?.trim();
  if (!encrypted) {
    return {
      ok: false,
      reason: "NO_SECRET_STORED",
      detail: clampDetail(
        `No ${account.provider} access token is stored for this connection. Reconnect ${account.provider}.`,
      ),
    };
  }

  let accessToken: string;
  try {
    accessToken = decryptIntegrationSecret(encrypted).trim();
  } catch (error) {
    // The key VERSION and the error's class, never its message: the message
    // is where a misconfiguration quotes what it was given.
    logCredentialEvent("access token decrypt failed", account, {
      payloadKeyVersion: readIntegrationSecretKeyVersion(encrypted),
      columnKeyVersion: row.encryption_key_version,
      errorName: errorName(error),
    });
    return {
      ok: false,
      reason: "DECRYPT_FAILED",
      detail: clampDetail(
        "The stored credential could not be decrypted. Check INTEGRATIONS_ENCRYPTION_KEY, and INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS if a rotation is in progress, then reconnect.",
      ),
    };
  }

  if (!accessToken) {
    return {
      ok: false,
      reason: "NO_SECRET_STORED",
      detail: clampDetail(
        `The stored ${account.provider} access token is empty. Reconnect ${account.provider}.`,
      ),
    };
  }

  return {
    ok: true,
    accessToken,
    refreshed: false,
    tokenExpiresAt: account.tokenExpiresAt,
  };
}

/**
 * Load and decrypt the stored access token. Never refreshes, never contacts
 * a provider, never writes.
 *
 * Use this on a read path — a capability probe, an insights collection —
 * where an expired token should be reported rather than silently rotated.
 * The publish path wants `refreshIfNeeded`.
 */
export async function getAccessTokenForAccount(
  account: CredentialAccountFacts,
): Promise<CredentialResult> {
  if (account.integrationKind === "first_party") {
    return firstPartyRefusal(account);
  }

  const read = await readSecretRow(account);
  if (!read.ok) return read.failure;

  return decryptStoredAccessToken(account, read.row);
}

/* ------------------------------------------------------------ the writes */

/**
 * Records that the provider refused to refresh.
 *
 * ============ WHY THIS UPDATE TOUCHES EXACTLY ONE COLUMN ============
 * A refresh that failed must leave the stored credential byte-for-byte as it
 * was. The convenient shape — reuse the upsert helper — re-encrypts from
 * whatever plaintext this function happens to hold, and on the branch where
 * the refresh token could not be decrypted that is nothing at all: it would
 * write null over ciphertext that is merely unreadable with today's key, and
 * a recoverable rotation mistake would become permanent data loss.
 *
 * A failure to record the failure is logged and swallowed. The caller is
 * already being told the refresh failed, and turning a health counter into a
 * second error class helps nobody.
 */
async function recordRefreshFailure(
  account: CredentialAccountFacts,
  row: SecretRow,
): Promise<void> {
  const current = Math.max(0, row.refresh_failure_count ?? 0);
  const next = Math.min(current + 1, REFRESH_FAILURE_CEILING);

  const supabase = createServiceRoleClient();
  const { error } = await secretsTable(supabase)
    .update({ refresh_failure_count: next })
    .eq("connected_account_id", account.connectedAccountId.trim())
    .select("connected_account_id")
    .maybeSingle();

  if (error) {
    logCredentialEvent("refresh failure count not recorded", account, {
      code: error.code ?? null,
      message: error.message ?? null,
    });
  }
}

/**
 * Clears the failure counter and stamps the refresh lifecycle columns.
 *
 * Runs AFTER the ciphertext is safely stored, and its own failure is
 * swallowed: the credential is valid and in the table, so refusing to return
 * it because a health timestamp did not land would break a publish over
 * bookkeeping.
 *
 * `refresh_expires_at` is only written when the provider reported one.
 * `undefined` means "not mentioned" and keeps whatever is stored; `null`
 * means the provider said there is none. Collapsing the two would clear
 * TikTok's refresh-token expiry on every ordinary Google refresh.
 */
async function recordRefreshSuccess(
  account: CredentialAccountFacts,
  row: SecretRow,
  outcome: Extract<RefreshCredentialResult, { ok: true }>,
  nowIso: string,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await secretsTable(supabase)
    .update({
      refresh_failure_count: 0,
      last_refreshed_at: nowIso,
      refresh_expires_at:
        outcome.refreshExpiresAt === undefined
          ? row.refresh_expires_at
          : outcome.refreshExpiresAt,
    })
    .eq("connected_account_id", account.connectedAccountId.trim())
    .select("connected_account_id")
    .maybeSingle();

  if (error) {
    logCredentialEvent("refresh lifecycle not recorded", account, {
      code: error.code ?? null,
      message: error.message ?? null,
    });
  }
}

/* ----------------------------------------------------------- the refresh */

function refreshHorizonIso(nowIso: string): string {
  const now = Date.parse(nowIso);
  if (Number.isNaN(now)) return nowIso;
  return new Date(now + CREDENTIAL_REFRESH_HORIZON_MS).toISOString();
}

/**
 * Return a usable access token, refreshing first if the stored one is spent.
 *
 * ===================== THE ORDER IS THE DESIGN =====================
 * Everything that can fail locally is resolved BEFORE the provider is
 * contacted — the same lesson `app/actions/marketing-publish.ts` learned
 * when a local validation `return` after the delivery claim stranded rows
 * `in_flight`. Here the stranding is worse than a row: providers that rotate
 * refresh tokens (Google, TikTok) invalidate the old one the moment the new
 * one is issued, so a refresh we cannot persist has silently destroyed the
 * only credential that could have refreshed again. Establishing that a write
 * is possible first is what keeps that window shut.
 *
 * ================== AND IT IS ASKED EXACTLY ONCE ==================
 * No retry loop around `refreshCredential`, deliberately. A second call with
 * a refresh token the provider has already consumed is, to Google and
 * TikTok, evidence of a replayed or stolen token — the documented response
 * is to revoke the entire grant family, which turns a transient failure into
 * a mandatory reconnect. A failed refresh is recorded and reported; the next
 * publish attempt tries again with whatever is then stored.
 */
export async function refreshIfNeeded(input: {
  readonly account: CredentialAccountFacts;
  readonly nowIso: string;
}): Promise<CredentialResult> {
  const { account, nowIso } = input;

  if (account.integrationKind === "first_party") {
    return firstPartyRefusal(account);
  }

  const read = await readSecretRow(account);
  if (!read.ok) return read.failure;
  const row = read.row;

  // Not expired, and not about to be. Nothing to do, and nobody to ask.
  if (!isTokenExpired(account.tokenExpiresAt, refreshHorizonIso(nowIso))) {
    return decryptStoredAccessToken(account, row);
  }

  // ------------------------------------------------------------------
  // From here the token is spent. Every branch below that ends in
  // REAUTH_REQUIRED or REFRESH_UNAVAILABLE returns WITHOUT contacting the
  // provider: there is nothing to send, and an authorization call made with
  // nothing to authorize is how a dead connection generates provider error
  // traffic on every publish attempt forever.
  // ------------------------------------------------------------------
  const refreshCiphertext = row.refresh_token_encrypted?.trim();
  if (!refreshCiphertext) {
    return reauthRequired(account, "no refresh token was ever stored for it");
  }

  // TikTok's refresh token expires too — the fact migration 181 added a
  // column for, precisely so this branch could exist instead of a connection
  // failing with nothing able to say it was foreseeable.
  if (isTokenExpired(row.refresh_expires_at, nowIso)) {
    return reauthRequired(account, "the refresh token itself has expired");
  }

  const keyVersion = currentSecretKeyVersion();
  if (keyVersion == null) {
    logCredentialEvent("refresh aborted before contacting provider", account, {
      cause: "encryption unavailable",
    });
    return {
      ok: false,
      reason: "ENCRYPTION_UNAVAILABLE",
      detail: clampDetail(
        "A refreshed credential could not be stored because integration encryption is not configured, so the provider was not asked. Set INTEGRATIONS_ENCRYPTION_KEY and try again.",
      ),
    };
  }

  const resolution = await resolveIntegrationAdapter(account.provider);
  if (!resolution.ok) {
    return {
      ok: false,
      reason: "REFRESH_UNAVAILABLE",
      detail: clampDetail(
        `Access to ${account.provider} expired and this deployment cannot refresh it. ${resolution.detail}`,
      ),
    };
  }

  const adapter = resolution.adapter;
  if (!adapter.refreshCredential) {
    return {
      ok: false,
      reason: "REFRESH_UNAVAILABLE",
      detail: clampDetail(
        `The ${account.provider} adapter does not implement a refresh hop, so this credential can only be replaced by reconnecting.`,
      ),
    };
  }

  let refreshPlaintext: string;
  try {
    refreshPlaintext = decryptIntegrationSecret(refreshCiphertext).trim();
  } catch (error) {
    logCredentialEvent("refresh token decrypt failed", account, {
      payloadKeyVersion: readIntegrationSecretKeyVersion(refreshCiphertext),
      columnKeyVersion: row.encryption_key_version,
      errorName: errorName(error),
    });
    return {
      ok: false,
      reason: "DECRYPT_FAILED",
      detail: clampDetail(
        "The stored refresh token could not be decrypted, so the provider was not contacted. Check INTEGRATIONS_ENCRYPTION_KEY, and INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS if a rotation is in progress, then reconnect.",
      ),
    };
  }

  if (!refreshPlaintext) {
    return reauthRequired(account, "the stored refresh token is empty");
  }

  let outcome: RefreshCredentialResult;
  try {
    outcome = await adapter.refreshCredential({
      connectedAccountId: account.connectedAccountId,
      refreshTokenPlaintext: refreshPlaintext,
      nowIso,
    });
  } catch (error) {
    // An adapter that throws is a contract violation — the port says refresh
    // returns a union — but a violated contract must not become an unhandled
    // rejection inside a publish path. The message is not kept: it is the
    // most likely place for a provider library to echo the token it was
    // handed.
    logCredentialEvent("refresh adapter threw", account, {
      errorName: errorName(error),
    });
    outcome = {
      ok: false,
      reason: "PROVIDER_ERROR",
      detail: "The provider could not be reached.",
    };
  }

  if (!outcome.ok) {
    await recordRefreshFailure(account, row);

    // ============ THE PROVIDER'S PROSE NEVER LEAVES THIS FUNCTION ============
    // An earlier version scrubbed the plaintexts this connection holds out of
    // `outcome.detail` and forwarded the remainder. That is a denylist, and a
    // denylist can only remove what it already knows: a verifier driving a
    // hostile adapter proved it, by echoing an access token this row does not
    // store. Scrubbing removed the refresh token and left the other one
    // standing.
    //
    // There is no scrub set that fixes that, because the flaw is the posture.
    // So the provider's message is not forwarded at all — the operator gets
    // the REASON, which is ours and is enough to act on, exactly as the
    // database path already refuses to forward the database's own words and
    // as `crypto.ts` refuses to say more than a key version. Diagnostics go
    // to the server log as an error CLASS, never a message body.
    logCredentialEvent("refresh refused by provider", account, {
      providerReason: outcome.reason,
    });

    if (outcome.reason === "REAUTH_REQUIRED") {
      return reauthRequired(
        account,
        "the provider rejected the refresh",
      );
    }

    return {
      ok: false,
      reason: "REFRESH_FAILED",
      detail: clampDetail(
        `Refreshing ${account.provider} access failed. Re-check the connection, ` +
          `and reconnect ${account.provider} if it keeps failing.`,
      ),
    };
  }

  const accessToken = outcome.accessTokenPlaintext.trim();
  if (!accessToken) {
    await recordRefreshFailure(account, row);
    return {
      ok: false,
      reason: "REFRESH_FAILED",
      detail: clampDetail(
        `The ${account.provider} refresh returned no access token.`,
      ),
    };
  }

  // A provider that returns an access token ALONE has not revoked the
  // refresh token — Google and TikTok both do this routinely. Passing the
  // existing plaintext back through keeps it stored: omitting it would write
  // null into `refresh_token_encrypted` and leave the connection
  // unrefreshable, which is the same clobbering the failure path avoids.
  const nextRefreshPlaintext =
    outcome.refreshTokenPlaintext?.trim() || refreshPlaintext;

  const write = await upsertMarketingConnectedAccountSecret({
    connectedAccountId: account.connectedAccountId,
    accessTokenPlaintext: accessToken,
    refreshTokenPlaintext: nextRefreshPlaintext,
    // Never the helper's default of `1`. See `currentSecretKeyVersion`.
    encryptionKeyVersion: keyVersion,
  });

  if (write.error) {
    // The dangerous window, now closed as honestly as it can be: the
    // provider has issued a new credential and may already have invalidated
    // the old one, and we could not store it. Say so plainly — the returned
    // string is fixed prose, because `write.error` comes from
    // `mapDatabaseError`, which forwards some raw database text.
    logCredentialEvent("refreshed credential could not be stored", account, {
      keyVersion,
    });
    return {
      ok: false,
      reason: "LOOKUP_FAILED",
      detail: clampDetail(
        `${account.provider} issued a new credential but it could not be saved, so the stored one may no longer work. Reconnect ${account.provider}.`,
      ),
    };
  }

  await recordRefreshSuccess(account, row, outcome, nowIso);

  return {
    ok: true,
    accessToken,
    refreshed: true,
    tokenExpiresAt: outcome.tokenExpiresAt,
  };
}
