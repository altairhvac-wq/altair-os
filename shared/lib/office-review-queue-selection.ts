import {
  buildQueueBatchPreview,
  type OfficeReviewQueueBulkActionId,
} from "@/shared/lib/office-review-queue-batch-preview";
import {
  isValidOfficeReviewQueueJobId,
  type OfficeReviewQueueItem,
} from "@/shared/types/office-review-queue";

export type { OfficeReviewQueueBulkActionId } from "@/shared/lib/office-review-queue-batch-preview";

export type OfficeReviewQueueBulkActionAvailability = {
  id: OfficeReviewQueueBulkActionId;
  label: string;
  /** Heuristic applicability count for display — actions remain disabled in V1. */
  applicableCount: number;
  disabled: true;
};

export const OFFICE_REVIEW_QUEUE_SELECTION_LIMITATIONS = [
  "Queue item selection is UI-only — no bulk workflow execution yet.",
  "Batch previews show what future actions would affect — previews do not execute writes.",
  "Preview eligibility is heuristic only — not permission-aware and not a substitute for approval routing.",
  "Selected items are not persisted across page refreshes or devices.",
] as const;

/** Rows with a valid in-app job link — the only rows eligible for bulk selection. */
export function getSelectableQueueItems(
  items: OfficeReviewQueueItem[],
): OfficeReviewQueueItem[] {
  return items.filter((item) => isValidOfficeReviewQueueJobId(item.jobId));
}

export function toggleQueueSelection(
  selectedIds: ReadonlySet<string>,
  jobId: string,
  selected?: boolean,
): Set<string> {
  const next = new Set(selectedIds);
  const shouldSelect = selected ?? !next.has(jobId);

  if (shouldSelect) {
    next.add(jobId);
  } else {
    next.delete(jobId);
  }

  return next;
}

export function toggleGroupQueueSelection(
  selectedIds: ReadonlySet<string>,
  groupItems: OfficeReviewQueueItem[],
  selectAll: boolean,
): Set<string> {
  const next = new Set(selectedIds);

  for (const item of getSelectableQueueItems(groupItems)) {
    if (selectAll) {
      next.add(item.jobId);
    } else {
      next.delete(item.jobId);
    }
  }

  return next;
}

export function clearQueueSelection(): Set<string> {
  return new Set();
}

/** Drops selections for jobs no longer present in the underlying queue report. */
export function pruneQueueSelection(
  selectedIds: ReadonlySet<string>,
  validJobIds: ReadonlySet<string>,
): Set<string> {
  const next = new Set<string>();

  for (const jobId of selectedIds) {
    if (validJobIds.has(jobId)) {
      next.add(jobId);
    }
  }

  return next;
}

export function resolveGroupSelectionState(
  selectedIds: ReadonlySet<string>,
  groupItems: OfficeReviewQueueItem[],
): {
  allSelected: boolean;
  someSelected: boolean;
  selectedCount: number;
  selectableCount: number;
} {
  const selectable = getSelectableQueueItems(groupItems);
  const selectableCount = selectable.length;

  if (selectableCount === 0) {
    return {
      allSelected: false,
      someSelected: false,
      selectedCount: 0,
      selectableCount: 0,
    };
  }

  let selectedCount = 0;

  for (const item of selectable) {
    if (selectedIds.has(item.jobId)) {
      selectedCount += 1;
    }
  }

  return {
    allSelected: selectedCount === selectableCount,
    someSelected: selectedCount > 0 && selectedCount < selectableCount,
    selectedCount,
    selectableCount,
  };
}

export function resolveSelectedQueueItems(
  items: OfficeReviewQueueItem[],
  selectedIds: ReadonlySet<string>,
): OfficeReviewQueueItem[] {
  if (selectedIds.size === 0) {
    return [];
  }

  return getSelectableQueueItems(items).filter((item) =>
    selectedIds.has(item.jobId),
  );
}

/**
 * Read-only heuristic for future bulk workflows — preview-only in V1, no execution.
 */
export function resolveBulkQueueActionAvailability(
  selectedItems: OfficeReviewQueueItem[],
): OfficeReviewQueueBulkActionAvailability[] {
  return (
    [
      "create_invoices",
      "review_expenses",
      "review_labor",
      "open_jobs",
    ] as const
  ).map((id) => {
    const preview = buildQueueBatchPreview(selectedItems, id);

    return {
      id,
      label: preview.label,
      applicableCount: preview.eligibleCount,
      disabled: true,
    };
  });
}

// TODO(office-review-queue-bulk-v2): Bulk invoicing workflow for selected awaiting-invoicing rows.
// TODO(office-review-queue-bulk-v2): Bulk review assignment and ownership routing.
// TODO(office-review-queue-bulk-v2): AI batch prioritization suggestions for multi-select.
// TODO(office-review-queue-bulk-v2): Operational queue batching — grouped navigation and writes.
