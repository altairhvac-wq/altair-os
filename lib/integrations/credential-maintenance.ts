import "server-only";

import { listRefreshableConnectedAccounts } from "@/lib/database/queries/marketing-connected-accounts-admin";
import { hasStoredRefreshToken } from "@/shared/types/marketing-channel-connection";
import type { CredentialFailure } from "./credentials";
import { getUsableAccessToken } from "./credential-lifecycle";

/**
 * The daily credential heartbeat — the scheduled half of token durability.
 *
 * ================== THE GAP THIS CLOSES ==================
 * Refresh ran in exactly one place: inside a publish. A connection that
 * published nothing for a day held an access token that expired an hour
 * after consent and then sat expired until the next publish — which for
 * YouTube meant indefinitely, because nothing scheduled ever targeted it.
 * The Integrations page (with its own defect, since fixed) rendered that
 * ordinary expiry as "Reconnect needed", and the owner obliged: reconnect,
 * expire, reconnect, daily. The connection was never broken. Nothing was
 * maintaining it.
 *
 * This runs from the existing daily cron (`/api/cron/marketing-insights`) —
 * deliberately NOT a new scheduler — and walks every third-party publisher
 * connection whose token can expire, asking the credential seam for a
 * usable token. The seam does the rest: refresh within the horizon, CAS
 * against concurrent writers, preserve an unmentioned refresh token, mark
 * the account terminally on `invalid_grant`. One pass a day therefore
 * proves, for every connection, either "still refreshable" or exactly
 * which human action is needed — instead of both facts being unknown until
 * a publish fails.
 *
 * ================== WHAT A RESULT NEVER CARRIES ==================
 * No access token leaves this module. The seam hands one back and it is
 * dropped on the floor here, deliberately: the caller is a cron route whose
 * JSON response is logged by the platform, and a summary that could carry a
 * token is a summary that one day will. Outcomes, ids, providers and the
 * seam's own fixed operator prose only.
 *
 * ================== OUTCOME VOCABULARY ==================
 * Maps onto the connection-state contract:
 *
 *   fresh              CONNECTED — token valid, provider not contacted
 *   refreshed          a real refresh cycle completed and persisted
 *   no_refresh_token   REAUTH_REQUIRED (derived) — nothing stored to refresh
 *                      with; display already steers to reconnect
 *   reauth_required    REAUTH_REQUIRED (proven) — provider rejected the
 *                      refresh terminally; the seam marked the row
 *   misconfigured      MISCONFIGURED — encryption or adapter unavailable on
 *                      this deployment; a deploy problem, not a Google one
 *   transient          DEGRADED_TRANSIENT — provider/network/db hiccup;
 *                      failure count incremented, retried tomorrow and on
 *                      the next publish
 */

export const CREDENTIAL_MAINTENANCE_OUTCOMES = [
  "fresh",
  "refreshed",
  "no_refresh_token",
  "reauth_required",
  "misconfigured",
  "transient",
] as const;
export type CredentialMaintenanceOutcome =
  (typeof CREDENTIAL_MAINTENANCE_OUTCOMES)[number];

export type CredentialMaintenanceAttempt = {
  readonly connectedAccountId: string;
  readonly companyId: string;
  readonly provider: string;
  readonly outcome: CredentialMaintenanceOutcome;
  /** The seam's failure reason, when there was one. A closed vocabulary. */
  readonly reason: CredentialFailure | null;
  /** The seam's fixed operator-facing prose. Secret-free by construction. */
  readonly detail: string | null;
};

export type CredentialMaintenanceSummary = {
  readonly attempted: number;
  readonly counts: Readonly<Record<CredentialMaintenanceOutcome, number>>;
  readonly attempts: readonly CredentialMaintenanceAttempt[];
};

function outcomeForFailure(reason: CredentialFailure): {
  outcome: CredentialMaintenanceOutcome;
} {
  switch (reason) {
    case "REAUTH_REQUIRED":
      return { outcome: "reauth_required" };
    // The account row exists with no usable secret behind it — only a
    // reconnect stores one, so the human action is the reauth action even
    // though no provider proved anything.
    case "NO_SECRET_STORED":
    case "FIRST_PARTY_NO_CREDENTIAL":
      return { outcome: "no_refresh_token" };
    case "DECRYPT_FAILED":
    case "ENCRYPTION_UNAVAILABLE":
    case "REFRESH_UNAVAILABLE":
      return { outcome: "misconfigured" };
    case "REFRESH_FAILED":
    case "LOOKUP_FAILED":
      return { outcome: "transient" };
  }
}

/**
 * One pass over every maintainable connection. Read the module comment for
 * what "maintainable" excludes and why.
 */
export async function maintainIntegrationCredentials(input: {
  readonly nowIso: string;
}): Promise<CredentialMaintenanceSummary> {
  const accounts = await listRefreshableConnectedAccounts();

  const tally: Record<CredentialMaintenanceOutcome, number> = {
    fresh: 0,
    refreshed: 0,
    no_refresh_token: 0,
    reauth_required: 0,
    misconfigured: 0,
    transient: 0,
  };
  const attempts: CredentialMaintenanceAttempt[] = [];

  for (const account of accounts) {
    let outcome: CredentialMaintenanceOutcome;
    let reason: CredentialFailure | null = null;
    let detail: string | null = null;

    if (!hasStoredRefreshToken(account.metadata)) {
      // Without a refresh token the seam would refuse before contacting
      // Google, and the display already derives REAUTH_REQUIRED at expiry.
      // Recording the fact daily keeps it visible without generating a
      // provider-facing call that cannot succeed.
      outcome = "no_refresh_token";
    } else {
      const result = await getUsableAccessToken({
        account: {
          connectedAccountId: account.id,
          companyId: account.companyId,
          provider: account.provider,
          integrationKind: account.integrationKind,
          tokenExpiresAt: account.tokenExpiresAt ?? null,
        },
        nowIso: input.nowIso,
      });

      if (result.ok) {
        // The token itself is dropped HERE and never leaves this module.
        outcome = result.refreshed ? "refreshed" : "fresh";
      } else {
        ({ outcome } = outcomeForFailure(result.reason));
        reason = result.reason;
        detail = result.detail;
      }
    }

    tally[outcome] += 1;
    attempts.push({
      connectedAccountId: account.id,
      companyId: account.companyId,
      provider: account.provider,
      outcome,
      reason,
      detail,
    });
  }

  return { attempted: accounts.length, counts: tally, attempts };
}
