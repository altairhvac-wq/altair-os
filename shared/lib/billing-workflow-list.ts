import { getCompanyTimeZone, getDateOnlyInTimeZone } from "@/shared/lib/datetime";
import {
  getScheduledTodayBounds,
  type ScheduledTodayOptions,
} from "@/shared/lib/scheduled-today";

export type BillingWorkflowListSection<T> = {
  id: string;
  label: string;
  items: T[];
};

export type BillingOperationalDayOptions = ScheduledTodayOptions;

export function formatBillingWorkflowSectionLabel(
  label: string,
  count: number,
): string {
  return `${label} (${count})`;
}

/** Compare a YYYY-MM-DD field to today's calendar date in company timezone. */
export function isDateOnlyOnOperationalDay(
  dateOnly: string | undefined | null,
  options?: BillingOperationalDayOptions,
): boolean {
  if (!dateOnly?.trim()) {
    return false;
  }

  const timeZone = options?.timeZone ?? getCompanyTimeZone();
  const reference = options?.reference ?? new Date();

  return dateOnly.trim() === getDateOnlyInTimeZone(reference, timeZone);
}

/** Compare an ISO timestamp to today's operational-day bounds in company timezone. */
export function isTimestampOnOperationalDay(
  timestamp: string | undefined | null,
  options?: BillingOperationalDayOptions,
): boolean {
  if (!timestamp?.trim()) {
    return false;
  }

  const { start, end } = getScheduledTodayBounds(options);
  const value = new Date(timestamp).getTime();

  if (Number.isNaN(value)) {
    return false;
  }

  return (
    value >= new Date(start).getTime() && value <= new Date(end).getTime()
  );
}
