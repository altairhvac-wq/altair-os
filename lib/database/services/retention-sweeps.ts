import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Retention sweeps for the two tables that grow with every public request
 * (launch audit M10).
 *
 *   public_request_rate_limits  migration 173 — counters older than this many
 *                               hours can no longer influence a decision.
 *   security_audit_events       migration 174 — the retention period the
 *                               migration deliberately left unscheduled. 180
 *                               days is the migration's own default; this is
 *                               the one place it is now decided, in code
 *                               review rather than silently.
 *
 * Both functions are service_role-only SECURITY DEFINER sweeps that return
 * the number of rows deleted. Called daily from /api/cron/billing-maintenance.
 */

export const RATE_LIMIT_SWEEP_OLDER_THAN_HOURS = 24;
export const SECURITY_AUDIT_RETENTION_DAYS = 180;

export type RetentionSweepResult = {
  rateLimitRowsDeleted: number;
  auditEventsDeleted: number;
  /** Human-readable, no row data; safe for the automation run record. */
  errors: string[];
};

export async function runRetentionSweeps(): Promise<RetentionSweepResult> {
  const client = createServiceRoleClient();
  const result: RetentionSweepResult = {
    rateLimitRowsDeleted: 0,
    auditEventsDeleted: 0,
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

  return result;
}
