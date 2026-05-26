import {
  parseOfficeReviewQueueFilter,
  type OfficeReviewQueueFilter,
  type OfficeReviewQueueGroup,
  type OfficeReviewQueueSortMode,
} from "@/shared/types/office-review-queue";

const STORAGE_KEY = "altair:office-review-queue-preferences:v1";

const VALID_SORT_MODES: OfficeReviewQueueSortMode[] = [
  "severity_first",
  "blockers_first",
  "readiness_highest_first",
  "readiness_lowest_first",
  "oldest_first",
  "newest_first",
];

const VALID_QUEUE_GROUPS: OfficeReviewQueueGroup[] = [
  "critical",
  "needs_attention",
  "aging",
];

export type OfficeReviewQueuePreferences = {
  filter: OfficeReviewQueueFilter;
  sortMode: OfficeReviewQueueSortMode;
  collapsedGroups: OfficeReviewQueueGroup[];
};

export const DEFAULT_OFFICE_REVIEW_QUEUE_PREFERENCES: OfficeReviewQueuePreferences =
  {
    filter: "all",
    sortMode: "severity_first",
    collapsedGroups: [],
  };

export function parseQueueSortMode(
  value: string | undefined | null,
): OfficeReviewQueueSortMode {
  if (
    value != null &&
    (VALID_SORT_MODES as readonly string[]).includes(value)
  ) {
    return value as OfficeReviewQueueSortMode;
  }

  return DEFAULT_OFFICE_REVIEW_QUEUE_PREFERENCES.sortMode;
}

export function parseCollapsedQueueGroups(
  value: string | undefined | null,
): OfficeReviewQueueGroup[] {
  if (value == null || value.trim().length === 0) {
    return [];
  }

  const seen = new Set<OfficeReviewQueueGroup>();
  const groups: OfficeReviewQueueGroup[] = [];

  for (const segment of value.split(",")) {
    const trimmed = segment.trim();
    if (
      (VALID_QUEUE_GROUPS as readonly string[]).includes(trimmed) &&
      !seen.has(trimmed as OfficeReviewQueueGroup)
    ) {
      const group = trimmed as OfficeReviewQueueGroup;
      seen.add(group);
      groups.push(group);
    }
  }

  return groups;
}

function parseStoredCollapsedGroups(value: unknown): OfficeReviewQueueGroup[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<OfficeReviewQueueGroup>();
  const groups: OfficeReviewQueueGroup[] = [];

  for (const entry of value) {
    if (
      typeof entry === "string" &&
      (VALID_QUEUE_GROUPS as readonly string[]).includes(entry) &&
      !seen.has(entry as OfficeReviewQueueGroup)
    ) {
      const group = entry as OfficeReviewQueueGroup;
      seen.add(group);
      groups.push(group);
    }
  }

  return groups;
}

export function loadQueuePreferences(): OfficeReviewQueuePreferences {
  if (typeof window === "undefined") {
    return { ...DEFAULT_OFFICE_REVIEW_QUEUE_PREFERENCES };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null || raw.trim().length === 0) {
      return { ...DEFAULT_OFFICE_REVIEW_QUEUE_PREFERENCES };
    }

    const parsed: unknown = JSON.parse(raw);
    if (parsed == null || typeof parsed !== "object") {
      return { ...DEFAULT_OFFICE_REVIEW_QUEUE_PREFERENCES };
    }

    const record = parsed as Record<string, unknown>;

    return {
      filter: parseOfficeReviewQueueFilter(
        typeof record.filter === "string" ? record.filter : undefined,
      ),
      sortMode: parseQueueSortMode(
        typeof record.sortMode === "string" ? record.sortMode : undefined,
      ),
      collapsedGroups: parseStoredCollapsedGroups(record.collapsedGroups),
    };
  } catch {
    return { ...DEFAULT_OFFICE_REVIEW_QUEUE_PREFERENCES };
  }
}

export function persistQueuePreferences(
  patch: Partial<OfficeReviewQueuePreferences>,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const current = loadQueuePreferences();
    const next: OfficeReviewQueuePreferences = {
      filter: patch.filter ?? current.filter,
      sortMode: patch.sortMode ?? current.sortMode,
      collapsedGroups: patch.collapsedGroups ?? current.collapsedGroups,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota or privacy mode — preference memory is best-effort only.
  }
}

// TODO(office-review-queue-preferences-v2): User profile preferences synced server-side.
// TODO(office-review-queue-preferences-v2): Role-based queue presets by office role.
// TODO(office-review-queue-preferences-v2): AI-driven queue personalization suggestions.
// TODO(office-review-queue-preferences-v2): Saved operational views (named filter/sort layouts).
