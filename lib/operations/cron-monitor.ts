import "server-only";

import * as Sentry from "@sentry/nextjs";
import {
  flushMonitoring,
  isMonitoringConfigured,
} from "@/lib/operations/monitoring";

/**
 * Sentry cron check-ins for the scheduled routes (launch audit H3).
 *
 * ==================== THE GAP THIS CLOSES ====================
 * Every cron route records a `platform_automation_runs` row and reports a
 * thrown failure through `runOperation`. Neither can report the one failure
 * that matters most: the cron NEVER RAN. A Hobby-plan schedule cap, a
 * mis-pasted path in vercel.json, or a disabled deployment leaves no row and
 * throws nothing. A cron monitor is the inverse: the monitor expects a
 * check-in on the schedule and alerts on its absence.
 *
 * ==================== HOW A RUN IS JUDGED ====================
 * `in_progress` when the route starts work, then `ok` or `error` from the
 * HTTP status it is about to return. A 5xx is an error. A 200 whose body says
 * `ok: false` because some companies' sweeps failed is still `ok` here: the
 * cron ran to completion, and the per-company errors are the automation-run
 * record's job (and already reach the monitor through `runOperation` when
 * they throw). Conflating the two would page on normal partial runs.
 *
 * ==================== SCHEDULES ====================
 * Mirrored from vercel.json, which Vercel evaluates in UTC. Kept as a literal
 * table rather than parsed at runtime so a schedule change is a reviewed diff
 * here too; scripts/verify-observability.mjs checks the two agree.
 *
 * With `SENTRY_DSN` unset every function here is a no-op.
 */

export const CRON_MONITOR_SCHEDULES = {
  "billing-maintenance": "15 11 * * *",
  "marketing-ai": "30 12 * * *",
  "marketing-insights": "45 11 * * *",
  "marketing-publish": "0 18 * * *",
  "workflow-reminders": "0 12 * * *",
} as const;

export type CronMonitorSlug = keyof typeof CRON_MONITOR_SCHEDULES;

export type CronCheckIn = {
  slug: CronMonitorSlug;
  checkInId: string;
  startedAtMs: number;
} | null;

/** Minutes late before a missed check-in is reported. Vercel crons can drift. */
const CHECKIN_MARGIN_MINUTES = 30;
/** Minutes a run may stay in_progress; the routes cap themselves at 60 s. */
const MAX_RUNTIME_MINUTES = 5;

function monitorConfig(slug: CronMonitorSlug) {
  return {
    schedule: {
      type: "crontab" as const,
      value: CRON_MONITOR_SCHEDULES[slug],
    },
    checkinMargin: CHECKIN_MARGIN_MINUTES,
    maxRuntime: MAX_RUNTIME_MINUTES,
    timezone: "Etc/UTC",
    failureIssueThreshold: 1,
    recoveryThreshold: 1,
  };
}

/**
 * Opens a check-in. Call after the cron-secret check — an unauthorized probe
 * is not a run — and before the work starts.
 */
export function startCronCheckIn(slug: CronMonitorSlug): CronCheckIn {
  if (!isMonitoringConfigured()) return null;

  try {
    const checkInId = Sentry.captureCheckIn(
      { monitorSlug: slug, status: "in_progress" },
      monitorConfig(slug),
    );
    return { slug, checkInId, startedAtMs: Date.now() };
  } catch {
    // A monitor that cannot check in must never stop the cron from running.
    return null;
  }
}

/**
 * Closes the check-in from the response the route is about to return, flushes
 * the SDK (serverless functions are frozen on return), and hands the response
 * back unchanged so it can be the route's return expression.
 */
export async function finishCronCheckIn<T extends Response>(
  checkIn: CronCheckIn,
  response: T,
): Promise<T> {
  if (!checkIn) return response;

  try {
    Sentry.captureCheckIn(
      {
        checkInId: checkIn.checkInId,
        monitorSlug: checkIn.slug,
        status: response.status >= 500 ? "error" : "ok",
        duration: (Date.now() - checkIn.startedAtMs) / 1000,
      },
      monitorConfig(checkIn.slug),
    );
  } catch {
    // Same rule as above.
  }

  await flushMonitoring();
  return response;
}
