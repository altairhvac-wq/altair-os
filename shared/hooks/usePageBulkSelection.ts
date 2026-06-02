"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearBulkSelection,
  resolveBulkSelectionState,
  toggleBulkSelection,
  toggleGroupBulkSelection,
  type BulkSelectableItem,
} from "@/shared/lib/bulk-selection";

export function usePageBulkSelection<T extends BulkSelectableItem>(
  visibleItems: T[],
  resetKeys: readonly unknown[],
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setSelectedIds(clearBulkSelection());
  }, resetKeys);

  const selectionState = useMemo(
    () => resolveBulkSelectionState(selectedIds, visibleItems),
    [selectedIds, visibleItems],
  );

  const toggleSelection = useCallback((itemId: string) => {
    setSelectedIds((previous) => toggleBulkSelection(previous, itemId));
  }, []);

  const toggleAllVisible = useCallback(
    (selectAll: boolean) => {
      setSelectedIds((previous) =>
        toggleGroupBulkSelection(previous, visibleItems, selectAll),
      );
    },
    [visibleItems],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(clearBulkSelection());
  }, []);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    selectionState,
    toggleSelection,
    toggleAllVisible,
    clearSelection,
    setSelectedIds,
  };
}
