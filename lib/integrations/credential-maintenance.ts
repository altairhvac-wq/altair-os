import "server-only";

import {
  listRefreshableConnectedAccounts,
  setConnectionMetadata,
} from "@/lib/database/queries/marketing-connected-accounts-admin";
import { readSecretRefreshTokenPresence } from "@/lib/database/queries/marketing-connected-account-secrets";
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
  /**
   * The time budget ran out before this connection was reached. Not a
   * failure of the connection — a fact about the run, reported instead of
   * hidden, exactly as `workflow-reminders` reports `stoppedForTime`. The
   * host route shares Vercel's 60-second Hobby ceiling with the insights
   * collection that runs after this pass, so the pass takes a bounded slice
   * and defers the tail to tomorrow (and to the next publish, which
   * refreshes on its own).
   */
  "deferred",
] as const;
export type CredentialMaintenanceOutcome =
  (typeof CREDENTIAL_MAINTENANCE_OUTCOMES)[number];

/** Default slice of the cron's 60-second ceiling this pass may consume. */
export const CREDENTIAL_MAINTENANCE_BUDGET_MS = 15_000;

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
  /** Milliseconds this pass may spend. Defaults to the 15s budget above. */
  readonly budgetMs?: number;
}): Promise<CredentialMaintenanceSummary> {
  const deadline =
    Date.now() + (input.budgetMs ?? CREDENTIAL_MAINTENANCE_BUDGET_MS);
  const accounts = await listRefreshableConnectedAccounts();

  const tally: Record<CredentialMaintenanceOutcome, number> = {
    fresh: 0,
    refreshed: 0,
    no_refresh_token: 0,
    reauth_required: 0,
    misconfigured: 0,
    transient: 0,
    deferred: 0,
  };
  const attempts: CredentialMaintenanceAttempt[] = [];

  for (const account of accounts) {
    let outcome: CredentialMaintenanceOutcome;
    let reason: CredentialFailure | null = null;
    let detail: string | null = null;

    if (Date.now() >= deadline) {
      // Out of budget. Recorded per-account so the summary still covers
      // every row and "the run was cut short" is visible, not inferred.
      tally.deferred += 1;
      attempts.push({
        connectedAccountId: account.id,
        companyId: account.companyId,
        provider: account.provider,
        outcome: "deferred",
        reason: null,
        detail: null,
      });
      continue;
    }

    let refreshTokenStored = hasStoredRefreshToken(account.metadata);

    if (!refreshTokenStored) {
      // The metadata claim is conservative, and its one corrective write at
      // connect time is best-effort — so this pass re-derives it daily from
      // the presence fact itself (a service-role SELECT of presence, never
      // content). A row whose secret holds a refresh token the metadata
      // denies gets its claim healed here, instead of showing "Reconnect
      // needed" at every expiry until a human obliges.
      const presence = await readSecretRefreshTokenPresence(account.id);
      if (presence.present) {
        refreshTokenStored = true;
        const corrected = await setConnectionMetadata({
          connectedAccountId: account.id,
          metadata: { ...account.metadata, hasRefreshToken: true },
        });
        if (corrected.error) {
          console.error("[credential-maintenance] metadata heal failed:", {
            connectedAccountId: account.id,
          });
        }
      }
    }

    if (!refreshTokenStored) {
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
