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
        .order("scheduled_at", { ascending: true }),
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

  const rows = [
    ...(scheduledTodayResult.data ?? []),
    ...(carryoverResult.data ?? []),
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
        .order("scheduled_at", { ascending: true }),
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

  const rows = [
    ...(scheduledRangeResult.data ?? []),
    ...(carryoverResult.data ?? []),
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
