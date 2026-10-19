import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Retention sweeps for the tables that grow with every public request
 * (launch audit M10, migration 203).
 *
 *   public_request_rate_limits  migration 173 — counters older than this many
 *                               hours can no longer influence a decision.
 *   security_audit_events       migration 174 — the retention period the
 *                               migration deliberately left unscheduled. 180
 *                               days is the migration's own default; this is
 *                               the one place it is now decided, in code
 *                               review rather than silently.
 *   web_analytics_events        migration 202 — first-party analytics. Kept 25
 *                               months: the analytics page's longest range is
 *                               12 months, so this keeps that window and the
 *                               year before it, plus a month of slack. Swept
 *                               in small batches (migration 203), see below.
 *
 * All three are service_role-only sweeps that return the number of rows
 * deleted. Called daily from /api/cron/billing-maintenance.
 */

export const RATE_LIMIT_SWEEP_OLDER_THAN_HOURS = 24;
export const SECURITY_AUDIT_RETENTION_DAYS = 180;
export const WEB_ANALYTICS_RETENTION_MONTHS = 25;

/**
 * Each call deletes at most this many of the oldest expired analytics rows in
 * its own short transaction, so the beacon's inserts never wait behind one
 * long delete. The loop stops at the first short batch (nothing left), after
 * MAX_BATCHES, or once the time budget is spent. The budget is small because
 * this rides after the overdue sweep's 45s inside a 60s function; a backlog it
 * does not clear is picked up the next day and the run is recorded "partial".
 */
export const WEB_ANALYTICS_SWEEP_BATCH_SIZE = 2_000;
export const WEB_ANALYTICS_SWEEP_MAX_BATCHES = 50;
export const WEB_ANALYTICS_SWEEP_TIME_BUDGET_MS = 5_000;

export type RetentionSweepResult = {
  rateLimitRowsDeleted: number;
  auditEventsDeleted: number;
  webAnalyticsEventsDeleted: number;
  /** False when expired analytics rows remain for the next run. */
  webAnalyticsSweepComplete: boolean;
  /**
   * False when migration 203 (or 202) is not applied yet. That is a deploy
   * order, not a fault: nothing can have been recorded, so nothing is due.
   */
  webAnalyticsSweepInstalled: boolean;
  /** Human-readable, no row data; safe for the automation run record. */
  errors: string[];
};

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

/**
 * PGRST202 / 42883: function missing. 42P01: table missing. All mean the
 * migration is not applied yet.
 */
function isNotInstalledError(error: { code?: string } | null): boolean {
  return error?.code === "PGRST202" || error?.code === "42P01" || error?.code === "42883";
}

export async function sweepWebAnalyticsEvents(
  client: ServiceClient,
  options?: {
    retainMonths?: number;
    batchSize?: number;
    maxBatches?: number;
    timeBudgetMs?: number;
  },
): Promise<{
  deleted: number;
  batches: number;
  complete: boolean;
  installed: boolean;
  error: string | null;
}> {
  const retainMonths = options?.retainMonths ?? WEB_ANALYTICS_RETENTION_MONTHS;
  const batchSize = options?.batchSize ?? WEB_ANALYTICS_SWEEP_BATCH_SIZE;
  const maxBatches = options?.maxBatches ?? WEB_ANALYTICS_SWEEP_MAX_BATCHES;
  const timeBudgetMs = options?.timeBudgetMs ?? WEB_ANALYTICS_SWEEP_TIME_BUDGET_MS;
  const startedAt = Date.now();

  let deleted = 0;
  let batches = 0;

  while (batches < maxBatches && Date.now() - startedAt < timeBudgetMs) {
    const { data, error } = await client.rpc("sweep_web_analytics_events", {
      p_retain_months: retainMonths,
      p_batch_size: batchSize,
    });

    if (error) {
      if (batches === 0 && isNotInstalledError(error)) {
        console.warn("[retention-sweeps] web analytics sweep not installed:", {
          code: error.code,
        });
        return { deleted, batches, complete: true, installed: false, error: null };
      }
      console.error("[retention-sweeps] web analytics sweep failed:", {
        code: error.code,
        batches,
      });
      return {
        deleted,
        batches,
        complete: false,
        installed: true,
        error: "web analytics sweep failed",
      };
    }

    batches += 1;
    const batchDeleted = Number(data ?? 0);
    deleted += batchDeleted;

    if (batchDeleted < batchSize) {
      return { deleted, batches, complete: true, installed: true, error: null };
    }
  }

  return { deleted, batches, complete: false, installed: true, error: null };
}

export async function runRetentionSweeps(): Promise<RetentionSweepResult> {
  const client = createServiceRoleClient();
  const result: RetentionSweepResult = {
    rateLimitRowsDeleted: 0,
    auditEventsDeleted: 0,
    webAnalyticsEventsDeleted: 0,
    webAnalyticsSweepComplete: true,
    webAnalyticsSweepInstalled: true,
    errors: [],
  };

  const rateLimits = await client.rpc("sweep_public_request_rate_limits", {
    p_older_than_hours: RATE_LIMIT_SWEEP_OLDER_THAN_HOURS,
  });

  if (rateLimits.error) {
    console.error("[retention-sweeps] rate-limit sweep failed:", {
      code: rateLimits.error.code,
    });
    result.errors.push("rate-limit sweep failed");
  } else {
    result.rateLimitRowsDeleted = Number(rateLimits.data ?? 0);
  }

  const audit = await client.rpc("sweep_security_audit_events", {
    p_retain_days: SECURITY_AUDIT_RETENTION_DAYS,
  });

  if (audit.error) {
    console.error("[retention-sweeps] security audit sweep failed:", {
      code: audit.error.code,
    });
    result.errors.push("security audit sweep failed");
  } else {
    result.auditEventsDeleted = Number(audit.data ?? 0);
  }

  const analytics = await sweepWebAnalyticsEvents(client);
  result.webAnalyticsEventsDeleted = analytics.deleted;
  result.webAnalyticsSweepComplete = analytics.complete;
  result.webAnalyticsSweepInstalled = analytics.installed;
  if (analytics.error) result.errors.push(analytics.error);

  return result;
}
