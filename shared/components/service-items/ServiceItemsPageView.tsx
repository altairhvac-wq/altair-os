"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import {
  createServiceItemAction,
  updateServiceItemAction,
} from "@/app/actions/service-items";
import {
  bulkArchiveServiceItemsAction,
  bulkMoveServiceItemsToTrashAction,
  bulkPermanentlyDeleteServiceItemsAction,
  bulkRestoreServiceItemsAction,
  bulkRestoreServiceItemsFromTrashAction,
} from "@/app/actions/service-items-bulk-lifecycle";
import { usePageBulkSelection } from "@/shared/hooks/usePageBulkSelection";
import {
  formatBulkLifecycleFailureDetails,
  getBulkLifecycleFailedIds,
  pruneBulkSelectionToFailedIds,
  type BulkLifecycleActionResult,
} from "@/shared/lib/bulk-lifecycle-runner";
import {
  formatBulkServiceItemsResultMessage,
  getServiceItemLifecycleState,
} from "@/shared/lib/service-item-lifecycle";
import { formatActionError } from "@/shared/lib/operational-errors";
import { EntityLifecycleBulkBar } from "@/shared/components/lifecycle/EntityLifecycleBulkBar";
import type {
  ServiceItem,
  ServiceItemFormData,
  ServiceItemLifecycleState,
} from "@/shared/types/service-item";
import {
  MasterListPageLayout,
  MasterPageSurface,
  masterListPagePrimaryActionClass,
  masterListPageScrollRegionClass,
  masterListPageSurfaceClass,
} from "@/shared/design-system/shell";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { ServiceItemDetailPanel } from "./ServiceItemDetailPanel";
import { ServiceItemQueueTabs } from "./ServiceItemQueueTabs";
import { ServiceItemsEmptyState } from "./ServiceItemsEmptyState";
import { ServiceItemsSearchFilterBar } from "./ServiceItemsSearchFilterBar";
import { ServiceItemsTable } from "./ServiceItemsTable";
import {
  countServiceItemsForWorkQueue,
  filterServiceItemsForWorkQueue,
  sortServiceItemsForWorkQueue,
  type ServiceItemWorkQueue,
} from "./service-item-work-queues";

type PanelMode = "create" | "edit" | "empty";

type ServiceItemsPageViewProps = {
  initialServiceItems: ServiceItem[];
  canManagePriceBook: boolean;
};

function filterServiceItemsBySearch(
  serviceItems: ServiceItem[],
  search: string,
): ServiceItem[] {
  const query = search.trim().toLowerCase();
  if (!query) return serviceItems;

  return serviceItems.filter((item) => {
    const haystack = [item.name, item.description ?? "", item.category ?? ""]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function ServiceItemsPageView({
  initialServiceItems,
  canManagePriceBook,
}: ServiceItemsPageViewProps) {
  const [serviceItems, setServiceItems] = useState(initialServiceItems);
  const [search, setSearch] = useState("");
  const [workQueue, setWorkQueue] = useState<ServiceItemWorkQueue>("active");
  const [lifecycleFilter, setLifecycleFilter] =
    useState<ServiceItemLifecycleState>("active");
  const [panelMode, setPanelMode] = useState<PanelMode>("empty");
  const [selectedItem, setSelectedItem] = useState<ServiceItem | null>(null);
  const [createFormKey, setCreateFormKey] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [lifecycleMessage, setLifecycleMessage] = useState<string | null>(null);
  const [lifecycleFailureDetails, setLifecycleFailureDetails] = useState<
    string[] | null
  >(null);
  const [lifecycleTone, setLifecycleTone] = useState<
    "success" | "warning" | "error"
  >("success");
  const [isPending, startTransition] = useTransition();
  const [isBulkArchiving, startBulkArchiveTransition] = useTransition();
  const [isBulkRestoring, startBulkRestoreTransition] = useTransition();
  const [isBulkMovingToTrash, startBulkMoveToTrashTransition] = useTransition();
  const [isBulkRestoringFromTrash, startBulkRestoreFromTrashTransition] =
    useTransition();
  const [isBulkPermanentlyDeleting, startBulkPermanentDeleteTransition] =
    useTransition();
  const router = useRouter();

  useEffect(() => {
    setServiceItems(initialServiceItems);
  }, [initialServiceItems]);

  useEffect(() => {
    setLifecycleFilter(workQueue === "past" ? "archived" : "active");
  }, [workQueue]);

  const queueCounts = useMemo(
    () =>
      ({
        active: countServiceItemsForWorkQueue(serviceItems, "active"),
        "needs-cleanup": countServiceItemsForWorkQueue(
          serviceItems,
          "needs-cleanup",
        ),
        inactive: countServiceItemsForWorkQueue(serviceItems, "inactive"),
        past: countServiceItemsForWorkQueue(serviceItems, "past"),
      }) satisfies Record<ServiceItemWorkQueue, number>,
    [serviceItems],
  );

  const queueScopedServiceItems = useMemo(
    () => filterServiceItemsForWorkQueue(serviceItems, workQueue),
    [serviceItems, workQueue],
  );

  const lifecycleScopedServiceItems = useMemo(() => {
    if (workQueue !== "past") {
      return queueScopedServiceItems;
    }

    return queueScopedServiceItems.filter(
      (item) => getServiceItemLifecycleState(item) === lifecycleFilter,
    );
  }, [queueScopedServiceItems, workQueue, lifecycleFilter]);

  const filteredServiceItems = useMemo(
    () =>
      sortServiceItemsForWorkQueue(
        filterServiceItemsBySearch(lifecycleScopedServiceItems, search),
        workQueue,
      ),
    [lifecycleScopedServiceItems, search, workQueue],
  );

  const selectionEnabled = canManagePriceBook;
  const {
    selectedIds,
    selectedCount,
    selectionState,
    toggleSelection,
    toggleAllVisible,
    clearSelection,
    setSelectedIds,
  } = usePageBulkSelection(filteredServiceItems, [lifecycleFilter, workQueue]);

  useEffect(() => {
    clearSelection();
    setLifecycleMessage(null);
    setLifecycleFailureDetails(null);
  }, [lifecycleFilter, workQueue, clearSelection]);

  function handleClearSelection() {
    clearSelection();
    setLifecycleMessage(null);
    setLifecycleFailureDetails(null);
  }

  function applyBulkLifecycleResult(input: {
    result: BulkLifecycleActionResult;
    actionLabel: string;
  }) {
    const { result, actionLabel } = input;

    if (result.error && result.results.length === 0) {
      setLifecycleTone("error");
      setLifecycleMessage(
        formatActionError(
          result.error,
          "We couldn't update the selected items.",
        ),
      );
      return;
    }

    setSelectedIds((previous) =>
      pruneBulkSelectionToFailedIds(previous, getBulkLifecycleFailedIds(result)),
    );
    setLifecycleFailureDetails(
      formatBulkLifecycleFailureDetails(result).length > 0
        ? formatBulkLifecycleFailureDetails(result)
        : null,
    );
    setLifecycleTone(
      result.successCount > 0
        ? result.failureCount > 0
          ? "warning"
          : "success"
        : "error",
    );
    setLifecycleMessage(
      formatBulkServiceItemsResultMessage({
        successCount: result.successCount,
        failureCount: result.failureCount,
        actionLabel,
      }),
    );

    if (result.successCount > 0) {
      router.refresh();
    }
  }

  function runBulkLifecycle(
    action: (ids: string[]) => Promise<BulkLifecycleActionResult>,
    actionLabel: string,
    startTransitionFn: (callback: () => void) => void,
  ) {
    if (!selectionEnabled || selectedCount === 0) return;
    const ids = [...selectedIds];
    setLifecycleMessage(null);
    setLifecycleFailureDetails(null);
    startTransitionFn(async () => {
      const result = await action(ids);
      applyBulkLifecycleResult({ result, actionLabel });
    });
  }

  function openCreateForm() {
    setPanelMode("create");
    setSelectedItem(null);
    setFormError(null);
    setCreateFormKey((previous) => previous + 1);
  }

  function handleNewItem() {
    if (!canManagePriceBook) return;

    openCreateForm();
  }

  function handleSelectItem(item: ServiceItem) {
    if (!canManagePriceBook) return;

    setSelectedItem(item);
    setPanelMode("edit");
    setFormError(null);
  }

  function handleClosePanel() {
    setPanelMode("empty");
    setSelectedItem(null);
    setFormError(null);
  }

  function mergeServiceItemIntoList(updated: ServiceItem) {
    setServiceItems((previous) => {
      const index = previous.findIndex((item) => item.id === updated.id);
      if (index === -1) {
        return [...previous, updated].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      }

      const next = [...previous];
      next[index] = updated;
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  function handleCreateSubmit(data: ServiceItemFormData) {
    if (isPending) {
      return;
    }

    setFormError(null);

    startTransition(async () => {
      const result = await createServiceItemAction(data);

      if (result.error || !result.serviceItem) {
        setFormError(result.error ?? "Failed to create service item.");
        return;
      }

      mergeServiceItemIntoList(result.serviceItem);
      openCreateForm();
    });
  }

  function handleEditSubmit(data: ServiceItemFormData) {
    if (!selectedItem || isPending) return;

    const editingItemId = selectedItem.id;
    setFormError(null);

    startTransition(async () => {
      const result = await updateServiceItemAction(editingItemId, data);

      if (result.error || !result.serviceItem) {
        setFormError(result.error ?? "Failed to update service item.");
        return;
      }

      mergeServiceItemIntoList(result.serviceItem);
      setSelectedItem(result.serviceItem);
      setPanelMode("edit");
    });
  }

  const hasNoItems = serviceItems.length === 0;
  const hasNoQueueItems = !hasNoItems && queueScopedServiceItems.length === 0;
  const hasNoResults = !hasNoItems && filteredServiceItems.length === 0;
  const northStar = isNorthStarShellEnabled();
  const bulkLifecycleFilter: ServiceItemLifecycleState =
    workQueue === "past" ? lifecycleFilter : "active";

  return (
    <MasterListPageLayout
      title="Price Book"
      subtitle="Manage services, pricing, costs, and taxable items."
      density="compact"
      banners={
        lifecycleMessage ? (
          <SettingsAlertBanner tone={lifecycleTone}>
            <div>
              <p>{lifecycleMessage}</p>
              {lifecycleFailureDetails?.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                  {lifecycleFailureDetails.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </SettingsAlertBanner>
        ) : undefined
      }
      primaryAction={
        canManagePriceBook ? (
          <button
            type="button"
            onClick={handleNewItem}
            className={
              northStar ? lt.primaryAction : masterListPagePrimaryActionClass
            }
          >
            <Plus className="h-3.5 w-3.5" />
            New Service Item
          </button>
        ) : undefined
      }
      className={northStar ? lt.pageCanvas : undefined}
      headerClassName={northStar ? lt.pageHeader : undefined}
      headerSurfaceVariant={northStar ? "northStar" : "default"}
      headerEyebrowClassName={northStar ? lt.pageHeaderEyebrow : undefined}
      headerTitleClassName={northStar ? lt.pageHeaderTitle : undefined}
      headerSubtitleClassName={
        northStar ? lt.pageHeaderSubtitle : undefined
      }
    >
      <MasterPageSurface
        variant={northStar ? "northStarList" : "card"}
        className={`${masterListPageSurfaceClass} ${northStar ? lt.listSurface : ""}`}
      >
        {northStar ? (
          <div aria-hidden="true" className={lt.listSurfaceTopAccent} />
        ) : null}

        <div
          className={
            northStar ? "flex min-h-0 min-w-0 flex-1 flex-col" : "contents"
          }
        >
          {!hasNoItems ? (
            <div
              className={
                northStar
                  ? lt.viewTabsBand
                  : "shrink-0 border-b border-slate-100/90 px-3 py-1.5 sm:px-4"
              }
            >
              <ServiceItemQueueTabs
                activeQueue={workQueue}
                onQueueChange={setWorkQueue}
                counts={queueCounts}
                northStar={northStar}
              />
            </div>
          ) : null}

          {!hasNoItems ? (
            <ServiceItemsSearchFilterBar
              search={search}
              onSearchChange={setSearch}
              resultCount={filteredServiceItems.length}
              lifecycleFilter={lifecycleFilter}
              onLifecycleFilterChange={setLifecycleFilter}
              showLifecycleFilter={canManagePriceBook && workQueue === "past"}
              bulkSelectAllControl={
                selectionEnabled && selectionState.selectableCount > 0
                  ? {
                      selectableCount: selectionState.selectableCount,
                      allSelected: selectionState.allSelected,
                      onSelectAll: () => toggleAllVisible(true),
                      onClearSelection: handleClearSelection,
                    }
                  : undefined
              }
              northStar={northStar}
            />
          ) : null}

          <div className={masterListPageScrollRegionClass}>
            {hasNoItems ? (
              <ServiceItemsEmptyState
                variant="no-items"
                onCreateItem={canManagePriceBook ? handleNewItem : undefined}
                northStar={northStar}
              />
            ) : hasNoQueueItems || hasNoResults ? (
              <ServiceItemsEmptyState variant="no-results" northStar={northStar} />
            ) : (
              <ServiceItemsTable
                serviceItems={filteredServiceItems}
                selectedItemId={selectedItem?.id}
                onSelectItem={handleSelectItem}
                selectionEnabled={selectionEnabled}
                selectedIds={selectedIds}
                onToggleSelection={toggleSelection}
                onToggleAllVisible={toggleAllVisible}
                northStar={northStar}
              />
            )}

            {selectionEnabled && selectedCount > 0 ? (
              <EntityLifecycleBulkBar
                entityLabel="item"
                selectedCount={selectedCount}
                lifecycleFilter={bulkLifecycleFilter}
                northStar={northStar}
                isArchiving={isBulkArchiving}
                isRestoring={isBulkRestoring}
                isMovingToTrash={isBulkMovingToTrash}
                isRestoringFromTrash={isBulkRestoringFromTrash}
                isPermanentlyDeleting={isBulkPermanentlyDeleting}
                showArchive={bulkLifecycleFilter === "active"}
                showMoveToTrash={
                  bulkLifecycleFilter === "active" ||
                  bulkLifecycleFilter === "archived"
                }
                showRestore={bulkLifecycleFilter === "archived"}
                showRestoreFromTrash={bulkLifecycleFilter === "deleted"}
                showPermanentDelete={bulkLifecycleFilter === "deleted"}
                onArchive={() =>
                  runBulkLifecycle(
                    bulkArchiveServiceItemsAction,
                    "Archive",
                    startBulkArchiveTransition,
                  )
                }
                onRestore={() =>
                  runBulkLifecycle(
                    bulkRestoreServiceItemsAction,
                    "Restore",
                    startBulkRestoreTransition,
                  )
                }
                onMoveToTrash={() =>
                  runBulkLifecycle(
                    bulkMoveServiceItemsToTrashAction,
                    "Move to Recently Deleted",
                    startBulkMoveToTrashTransition,
                  )
                }
                onRestoreFromTrash={() =>
                  runBulkLifecycle(
                    bulkRestoreServiceItemsFromTrashAction,
                    "Restore from Recently Deleted",
                    startBulkRestoreFromTrashTransition,
                  )
                }
                onPermanentDelete={() =>
                  runBulkLifecycle(
                    bulkPermanentlyDeleteServiceItemsAction,
                    "Permanent delete",
                    startBulkPermanentDeleteTransition,
                  )
                }
                onClearSelection={handleClearSelection}
              />
            ) : null}
          </div>
        </div>
      </MasterPageSurface>

      <ServiceItemDetailPanel
        mode={panelMode}
        serviceItem={selectedItem}
        createFormKey={createFormKey}
        onClose={handleClosePanel}
        onCreateSubmit={handleCreateSubmit}
        onEditSubmit={handleEditSubmit}
        onCancel={handleClosePanel}
        error={formError}
        isSubmitting={isPending}
        canManagePriceBook={canManagePriceBook}
        onLifecycleDeleted={handleClosePanel}
      />
    </MasterListPageLayout>
  );
}
