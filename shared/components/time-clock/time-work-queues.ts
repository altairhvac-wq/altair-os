import {
  getCompanyTimeZone,
  getMonthBoundsInTimeZone,
} from "@/shared/lib/datetime";
import type { TimeEntry } from "@/shared/types/time-entry";

export type TimeWorkQueue = "needs-review" | "approved" | "active" | "past";

export const TIME_WORK_QUEUE_ORDER: readonly TimeWorkQueue[] = [
  "needs-review",
  "approved",
  "active",
  "past",
];

export const TIME_WORK_QUEUE_LABELS: Record<TimeWorkQueue, string> = {
  "needs-review": "Needs review",
  approved: "Approved",
  active: "Active",
  past: "Past",
};

const RECENT_REVIEW_WINDOW_MS = 72 * 60 * 60 * 1000;

export function mergeTimeEntries(
  entries: TimeEntry[],
  activeEntries: TimeEntry[],
): TimeEntry[] {
  const byId = new Map<string, TimeEntry>();

  for (const entry of entries) {
    byId.set(entry.id, entry);
  }

  for (const entry of activeEntries) {
    byId.set(entry.id, entry);
  }

  return Array.from(byId.values());
}

function getEntryPeriodAnchor(entry: TimeEntry): string {
  return entry.endedAt ?? entry.startedAt;
}

export function isTimeEntryInCurrentPayPeriod(
  entry: TimeEntry,
  reference = new Date(),
  timeZone = getCompanyTimeZone(),
): boolean {
  const { start, end } = getMonthBoundsInTimeZone(timeZone, reference);
  const anchor = getEntryPeriodAnchor(entry);

  return anchor >= start && anchor <= end;
}

/** Currently clocked-in or otherwise open time segments. */
export function isTimeEntryActiveQueue(entry: TimeEntry): boolean {
  return !entry.endedAt;
}

/** Rejected, archived, deleted, and previous-period closed entries. */
export function isTimeEntryPastQueue(
  entry: TimeEntry,
  reference = new Date(),
  timeZone = getCompanyTimeZone(),
): boolean {
  if (isTimeEntryActiveQueue(entry)) {
    return false;
  }

  return !isTimeEntryInCurrentPayPeriod(entry, reference, timeZone);
}

/** Closed current-period entries awaiting approval or correction. */
export function isTimeEntryNeedsReviewQueue(
  entry: TimeEntry,
  reference = new Date(),
  timeZone = getCompanyTimeZone(),
): boolean {
  if (isTimeEntryActiveQueue(entry) || isTimeEntryPastQueue(entry, reference, timeZone)) {
    return false;
  }

  if (entry.endedAt && entry.durationMinutes == null) {
    return true;
  }

  if (entry.endedAt) {
    const endedMs = Date.parse(entry.endedAt);
    const reviewCutoff = reference.getTime() - RECENT_REVIEW_WINDOW_MS;

    if (Number.isFinite(endedMs) && endedMs >= reviewCutoff) {
      return true;
    }
  }

  return false;
}

/** Closed current-period entries ready for payroll. */
export function isTimeEntryApprovedQueue(
  entry: TimeEntry,
  reference = new Date(),
  timeZone = getCompanyTimeZone(),
): boolean {
  if (
    isTimeEntryActiveQueue(entry) ||
    isTimeEntryPastQueue(entry, reference, timeZone) ||
    isTimeEntryNeedsReviewQueue(entry, reference, timeZone)
  ) {
    return false;
  }

  return Boolean(entry.endedAt);
}

export function filterTimeEntriesForWorkQueue(
  entries: TimeEntry[],
  queue: TimeWorkQueue,
  reference = new Date(),
  timeZone = getCompanyTimeZone(),
): TimeEntry[] {
  const predicate = {
    "needs-review": (entry: TimeEntry) =>
      isTimeEntryNeedsReviewQueue(entry, reference, timeZone),
    approved: (entry: TimeEntry) =>
      isTimeEntryApprovedQueue(entry, reference, timeZone),
    active: isTimeEntryActiveQueue,
    past: (entry: TimeEntry) => isTimeEntryPastQueue(entry, reference, timeZone),
  }[queue];

  return entries.filter(predicate);
}

export function countTimeEntriesForWorkQueue(
  entries: TimeEntry[],
  queue: TimeWorkQueue,
  reference = new Date(),
  timeZone = getCompanyTimeZone(),
): number {
  return filterTimeEntriesForWorkQueue(entries, queue, reference, timeZone)
    .length;
}

export function resolveDefaultTimeWorkQueue(
  entries: TimeEntry[],
  activeEntries: TimeEntry[],
  reference = new Date(),
  timeZone = getCompanyTimeZone(),
): TimeWorkQueue {
  const mergedEntries = mergeTimeEntries(entries, activeEntries);

  if (countTimeEntriesForWorkQueue(mergedEntries, "needs-review", reference, timeZone) > 0) {
    return "needs-review";
  }

  if (
    countTimeEntriesForWorkQueue(mergedEntries, "active", reference, timeZone) > 0 ||
    activeEntries.length > 0
  ) {
    return "active";
  }

  if (countTimeEntriesForWorkQueue(mergedEntries, "approved", reference, timeZone) > 0) {
    return "approved";
  }

  return "past";
}

function compareTimeEntryRecency(left: TimeEntry, right: TimeEntry): number {
  const leftTime = Date.parse(left.startedAt);
  const rightTime = Date.parse(right.startedAt);

  if (
    Number.isFinite(leftTime) &&
    Number.isFinite(rightTime) &&
    leftTime !== rightTime
  ) {
    return rightTime - leftTime;
  }

  return right.startedAt.localeCompare(left.startedAt);
}

export function sortTimeEntriesForWorkQueue(
  entries: TimeEntry[],
  queue: TimeWorkQueue,
): TimeEntry[] {
  const sorted = [...entries];

  if (queue === "needs-review" || queue === "past") {
    return sorted.sort(compareTimeEntryRecency);
  }

  return sorted;
}

export function filterTimeEntriesBySearch(
  entries: TimeEntry[],
  search: string,
): TimeEntry[] {
  const query = search.trim().toLowerCase();
  if (!query) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.technicianName,
      entry.jobNumber ?? "",
      entry.entryType,
      entry.notes ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}
