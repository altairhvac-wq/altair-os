import type {
  OfficeReviewQueueFilter,
  OfficeReviewQueueSortMode,
} from "@/shared/types/office-review-queue";
import type { OfficeReviewQueuePreferences } from "@/shared/lib/office-review-queue-preferences";
import { DEFAULT_OFFICE_REVIEW_QUEUE_PREFERENCES } from "@/shared/lib/office-review-queue-preferences";

export type OfficeReviewQueuePresetId =
  | "operations_focus"
  | "invoicing_cleanup"
  | "aging_review"
  | "stalled_jobs";

export type OfficeReviewQueuePreset = {
  id: OfficeReviewQueuePresetId;
  label: string;
  description: string;
  filter: Exclude<OfficeReviewQueueFilter, "all">;
  sortMode: OfficeReviewQueueSortMode;
};

/** Static operational entry points — composes existing filter + sort only. */
export const OFFICE_REVIEW_QUEUE_PRESETS: readonly OfficeReviewQueuePreset[] = [
  {
    id: "operations_focus",
    label: "Operations focus",
    description: "Standard follow-up items, highest severity first.",
    filter: "attention",
    sortMode: "severity_first",
  },
  {
    id: "invoicing_cleanup",
    label: "Invoicing cleanup",
    description: "Completed jobs awaiting invoice, oldest first.",
    filter: "invoicing",
    sortMode: "oldest_first",
  },
  {
    id: "aging_review",
    label: "Aging review",
    description: "Items sitting without progress, oldest first.",
    filter: "aging",
    sortMode: "oldest_first",
  },
  {
    id: "stalled_jobs",
    label: "Stalled jobs",
    description: "Inactive pipeline jobs, oldest first.",
    filter: "stalled",
    sortMode: "oldest_first",
  },
] as const;

export const OFFICE_REVIEW_QUEUE_PRESET_LIMITATIONS = [
  "Saved views are browser-local shortcuts only — not synced across users or devices.",
  "Presets are static operational layouts — no custom user-created views yet.",
] as const;

const PRESET_BY_ID = new Map(
  OFFICE_REVIEW_QUEUE_PRESETS.map((preset) => [preset.id, preset]),
);

export function parseQueuePreset(
  value: string | undefined | null,
): OfficeReviewQueuePreset | null {
  if (value == null || value.trim().length === 0) {
    return null;
  }

  return PRESET_BY_ID.get(value.trim() as OfficeReviewQueuePresetId) ?? null;
}

/**
 * Matches the active filter + sort pair to a static preset, if any.
 * Does not inspect URL params directly — callers pass resolved UI state.
 */
export function resolveQueuePreset(input: {
  filter: OfficeReviewQueueFilter;
  sortMode: OfficeReviewQueueSortMode;
}): OfficeReviewQueuePreset | null {
  return (
    OFFICE_REVIEW_QUEUE_PRESETS.find(
      (preset) =>
        preset.filter === input.filter && preset.sortMode === input.sortMode,
    ) ?? null
  );
}

export function isDefaultOfficeReviewQueueView(input: {
  filter: OfficeReviewQueueFilter;
  sortMode: OfficeReviewQueueSortMode;
}): boolean {
  return (
    input.filter === DEFAULT_OFFICE_REVIEW_QUEUE_PREFERENCES.filter &&
    input.sortMode === DEFAULT_OFFICE_REVIEW_QUEUE_PREFERENCES.sortMode
  );
}

/**
 * Returns preference patch + URL params for a preset.
 * Preserves unrelated search params (e.g. range) and collapsed group state.
 */
export function applyQueuePreset(
  preset: OfficeReviewQueuePreset,
  searchParams: URLSearchParams,
): {
  preferences: Pick<OfficeReviewQueuePreferences, "filter" | "sortMode">;
  params: URLSearchParams;
} {
  const params = new URLSearchParams(searchParams.toString());

  params.set("queue", preset.filter);

  if (preset.sortMode === DEFAULT_OFFICE_REVIEW_QUEUE_PREFERENCES.sortMode) {
    params.delete("queueSort");
  } else {
    params.set("queueSort", preset.sortMode);
  }

  return {
    preferences: {
      filter: preset.filter,
      sortMode: preset.sortMode,
    },
    params,
  };
}

/** Resets filter and sort to defaults while preserving other URL params. */
export function applyQueueDefaultView(searchParams: URLSearchParams): {
  preferences: Pick<OfficeReviewQueuePreferences, "filter" | "sortMode">;
  params: URLSearchParams;
} {
  const params = new URLSearchParams(searchParams.toString());

  params.delete("queue");
  params.delete("queueSort");

  return {
    preferences: {
      filter: DEFAULT_OFFICE_REVIEW_QUEUE_PREFERENCES.filter,
      sortMode: DEFAULT_OFFICE_REVIEW_QUEUE_PREFERENCES.sortMode,
    },
    params,
  };
}

// TODO(office-review-queue-presets-v2): User-created saved views stored in profile.
// TODO(office-review-queue-presets-v2): Role-based operational presets by office role.
// TODO(office-review-queue-presets-v3): AI-generated queue focus modes from backlog patterns.
// TODO(office-review-queue-presets-v3): Staffing-aware queue routing presets by capacity.
