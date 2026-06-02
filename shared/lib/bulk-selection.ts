export type BulkSelectableItem = {
  id: string;
};

export function toggleBulkSelection(
  selectedIds: ReadonlySet<string>,
  itemId: string,
  selected?: boolean,
): Set<string> {
  const next = new Set(selectedIds);
  const shouldSelect = selected ?? !next.has(itemId);

  if (shouldSelect) {
    next.add(itemId);
  } else {
    next.delete(itemId);
  }

  return next;
}

export function toggleGroupBulkSelection<T extends BulkSelectableItem>(
  selectedIds: ReadonlySet<string>,
  items: T[],
  selectAll: boolean,
): Set<string> {
  const next = new Set(selectedIds);

  for (const item of items) {
    if (selectAll) {
      next.add(item.id);
    } else {
      next.delete(item.id);
    }
  }

  return next;
}

export function resolveBulkSelectionState<T extends BulkSelectableItem>(
  selectedIds: ReadonlySet<string>,
  visibleItems: T[],
): {
  allSelected: boolean;
  someSelected: boolean;
  selectedCount: number;
  selectableCount: number;
} {
  const selectableCount = visibleItems.length;

  if (selectableCount === 0) {
    return {
      allSelected: false,
      someSelected: false,
      selectedCount: 0,
      selectableCount: 0,
    };
  }

  let selectedCount = 0;

  for (const item of visibleItems) {
    if (selectedIds.has(item.id)) {
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

export function clearBulkSelection(): Set<string> {
  return new Set();
}

export function pruneBulkSelection(
  selectedIds: ReadonlySet<string>,
  validIds: ReadonlySet<string>,
): Set<string> {
  const next = new Set<string>();

  for (const itemId of selectedIds) {
    if (validIds.has(itemId)) {
      next.add(itemId);
    }
  }

  return next;
}

export function resolveSelectedItems<T extends BulkSelectableItem>(
  items: T[],
  selectedIds: ReadonlySet<string>,
): T[] {
  if (selectedIds.size === 0) {
    return [];
  }

  return items.filter((item) => selectedIds.has(item.id));
}
