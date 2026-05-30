import { createClient } from "@/lib/supabase/server";
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
    let query = supabase
      .from("jobs")
      .select(select)
      .eq("company_id", options.companyId)
      .neq("status", "cancelled");

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

/** Week board query: scheduled work Mon–Sun plus today's carryover and completions. */
export async function fetchOperationalWeekJobRows<
  T extends { id: string; scheduled_at: string },
>(
  select: string,
  options: FetchOperationalDayJobsOptions,
): Promise<{ rows: T[]; error: Error | null }> {
  const supabase = await createClient();
  const { start: weekStart, end: weekEnd } = getOperationalWeekBounds(options);
  const { start: todayStart, end: todayEnd } = getScheduledTodayBounds(options);

  const baseQuery = () => {
    let query = supabase
      .from("jobs")
      .select(select)
      .eq("company_id", options.companyId)
      .neq("status", "cancelled");

    if (options.assignedTechnicianId) {
      query = query.eq(
        "assigned_technician_id",
        options.assignedTechnicianId,
      );
    }

    return query;
  };

  const [scheduledWeekResult, carryoverResult, completedTodayResult] =
    await Promise.all([
      baseQuery()
        .gte("scheduled_at", weekStart)
        .lte("scheduled_at", weekEnd)
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
    scheduledWeekResult.error ??
    carryoverResult.error ??
    completedTodayResult.error;

  if (queryError) {
    return {
      rows: [],
      error: new Error(queryError.message),
    };
  }

  const rows = [
    ...(scheduledWeekResult.data ?? []),
    ...(carryoverResult.data ?? []),
    ...(completedTodayResult.data ?? []),
  ] as unknown as T[];

  return {
    rows: dedupeJobRowsById(rows),
    error: null,
  };
}
