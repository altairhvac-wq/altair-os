import { createClient } from "@/lib/supabase/server";
import { applyOperationalLifecycleFilters } from "@/lib/database/queries/entity-lifecycle-shared";
import {
  ACTIVE_CARRYOVER_JOB_STATUSES,
  dedupeJobRowsById,
  getOperationalWeekBounds,
  getScheduledTodayBounds,
  type ScheduledTodayOptions,
} from "@/shared/lib/scheduled-today";

export type FetchOperationalDayJobsOptions = ScheduledTodayOptions & {
  companyId: string;
  assignedTechnicianId?: string;
};

/**
 * A ceiling on the carryover query, and why it needs one.
 *
 * ============================== THE RULE, AND ITS EDGE ==============================
 * A job in dispatched / arrived / in_progress belongs on today's board whatever
 * date it was scheduled for — that is the point of carryover, and it is why the
 * query has no date filter. In a healthy tenant that is a handful of jobs.
 *
 * But "no date filter" is also "every one ever", and PostgREST silently caps a
 * response at 1,000 rows. Measured on the scale-seeded tenant: 695 dispatched
 * plus 699 in_progress, so the carryover query alone returned 1,000 job rows
 * into every /work and /schedule render — about 3 MB of the 3.56 MB page — and
 * the 394 it could not fit vanished with no error and no warning.
 *
 * ============================== WHY A LIMIT IS THE RIGHT SHAPE HERE ==============================
 * Paging is wrong for this one: it is not a list a person scrolls, it is the
 * membership rule for a board. The board needs the jobs that are stuck, and it
 * needs to say so when there are more than it can show.
 *
 * scheduled_at ASCENDING is deliberate and unchanged: the oldest carryover is
 * the most overdue, so a cap keeps the work that has been waiting longest. The
 * silent version kept the same rows — the difference is that this one reports
 * the truncation instead of pretending the board is complete.
 */
const CARRYOVER_LIMIT = 200;

function reportCarryoverTruncation(
  label: string,
  companyId: string,
  rows: unknown[],
): void {
  if (rows.length <= CARRYOVER_LIMIT) return;
  console.warn(
    `[${label}] more than ${CARRYOVER_LIMIT} carryover jobs are open; the board ` +
      `shows the ${CARRYOVER_LIMIT} oldest. This is an operational signal, not a ` +
      `display problem: that many jobs are sitting in dispatched/arrived/in_progress.`,
    { companyId },
  );
}

export async function fetchOperationalDayJobRows<
  T extends { id: string; scheduled_at: string },
>(
  select: string,
  options: FetchOperationalDayJobsOptions,
): Promise<{ rows: T[]; error: Error | null }> {
  const supabase = await createClient();
  const { start, end } = getScheduledTodayBounds(options);

  const baseQuery = () => {
    let query = applyOperationalLifecycleFilters(
      supabase
        .from("jobs")
        .select(select)
        .eq("company_id", options.companyId)
        .neq("status", "cancelled"),
    );

    if (options.assignedTechnicianId) {
      query = query.eq(
        "assigned_technician_id",
        options.assignedTechnicianId,
      );
    }

    return query;
  };

  const [scheduledTodayResult, carryoverResult, completedTodayResult] =
    await Promise.all([
      baseQuery()
        .gte("scheduled_at", start)
        .lte("scheduled_at", end)
        .order("scheduled_at", { ascending: true }),
      baseQuery()
        .in("status", [...ACTIVE_CARRYOVER_JOB_STATUSES])
        .order("scheduled_at", { ascending: true })
        .limit(CARRYOVER_LIMIT + 1),
      baseQuery()
        .eq("status", "completed")
        .gte("completed_at", start)
        .lte("completed_at", end)
        .order("completed_at", { ascending: false }),
    ]);

  const queryError =
    scheduledTodayResult.error ??
    carryoverResult.error ??
    completedTodayResult.error;

  if (queryError) {
    return {
      rows: [],
      error: new Error(queryError.message),
    };
  }

  const carryover = carryoverResult.data ?? [];
  reportCarryoverTruncation(
    "fetchOperationalDayJobRows",
    options.companyId,
    carryover,
  );

  const rows = [
    ...(scheduledTodayResult.data ?? []),
    ...carryover.slice(0, CARRYOVER_LIMIT),
    ...(completedTodayResult.data ?? []),
  ] as unknown as T[];

  return {
    rows: dedupeJobRowsById(rows),
    error: null,
  };
}

export type FetchOperationalRangeJobsOptions = FetchOperationalDayJobsOptions & {
  /** Inclusive ISO start for `scheduled_at` window. */
  rangeStart: string;
  /** Inclusive ISO end for `scheduled_at` window. */
  rangeEnd: string;
};

/**
 * Scheduled work in an arbitrary company-TZ range, plus today's carryover and
 * completions (same operational membership pattern as the week board).
 */
export async function fetchOperationalRangeJobRows<
  T extends { id: string; scheduled_at: string },
>(
  select: string,
  options: FetchOperationalRangeJobsOptions,
): Promise<{ rows: T[]; error: Error | null }> {
  const supabase = await createClient();
  const { start: todayStart, end: todayEnd } = getScheduledTodayBounds(options);

  const baseQuery = () => {
    let query = applyOperationalLifecycleFilters(
      supabase
        .from("jobs")
        .select(select)
        .eq("company_id", options.companyId)
        .neq("status", "cancelled"),
    );

    if (options.assignedTechnicianId) {
      query = query.eq(
        "assigned_technician_id",
        options.assignedTechnicianId,
      );
    }

    return query;
  };

  const [scheduledRangeResult, carryoverResult, completedTodayResult] =
    await Promise.all([
      baseQuery()
        .gte("scheduled_at", options.rangeStart)
        .lte("scheduled_at", options.rangeEnd)
        .order("scheduled_at", { ascending: true }),
      baseQuery()
        .in("status", [...ACTIVE_CARRYOVER_JOB_STATUSES])
        .order("scheduled_at", { ascending: true })
        .limit(CARRYOVER_LIMIT + 1),
      baseQuery()
        .eq("status", "completed")
        .gte("completed_at", todayStart)
        .lte("completed_at", todayEnd)
        .order("completed_at", { ascending: false }),
    ]);

  const queryError =
    scheduledRangeResult.error ??
    carryoverResult.error ??
    completedTodayResult.error;

  if (queryError) {
    return {
      rows: [],
      error: new Error(queryError.message),
    };
  }

  const rangeCarryover = carryoverResult.data ?? [];
  reportCarryoverTruncation(
    "fetchOperationalRangeJobRows",
    options.companyId,
    rangeCarryover,
  );

  const rows = [
    ...(scheduledRangeResult.data ?? []),
    ...rangeCarryover.slice(0, CARRYOVER_LIMIT),
    ...(completedTodayResult.data ?? []),
  ] as unknown as T[];

  return {
    rows: dedupeJobRowsById(rows),
    error: null,
  };
}

/** Week board query: scheduled work Mon–Sun plus today's carryover and completions. */
export async function fetchOperationalWeekJobRows<
  T extends { id: string; scheduled_at: string },
>(
  select: string,
  options: FetchOperationalDayJobsOptions,
): Promise<{ rows: T[]; error: Error | null }> {
  const { start, end } = getOperationalWeekBounds(options);
  return fetchOperationalRangeJobRows<T>(select, {
    ...options,
    rangeStart: start,
    rangeEnd: end,
  });
}
