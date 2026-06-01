"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  createServiceItemAction,
  updateServiceItemAction,
} from "@/app/actions/service-items";
import type {
  ServiceItem,
  ServiceItemFormData,
} from "@/shared/types/service-item";
import { ListCommandCenterLayout } from "@/shared/components/layout/ListCommandCenterLayout";
import { ServiceItemDetailPanel } from "./ServiceItemDetailPanel";
import { ServiceItemsEmptyState } from "./ServiceItemsEmptyState";
import { ServiceItemsSearchFilterBar } from "./ServiceItemsSearchFilterBar";
import { ServiceItemsTable } from "./ServiceItemsTable";

type PanelMode = "create" | "edit" | "empty";

type ServiceItemsPageViewProps = {
  initialServiceItems: ServiceItem[];
  canManagePriceBook: boolean;
};

function filterServiceItems(
  serviceItems: ServiceItem[],
  search: string,
  statusFilter: "all" | "active" | "inactive",
): ServiceItem[] {
  const query = search.trim().toLowerCase();

  return serviceItems.filter((item) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? item.isActive : !item.isActive);

    if (!matchesStatus) return false;
    if (!query) return true;

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
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("active");
  const [panelMode, setPanelMode] = useState<PanelMode>("empty");
  const [selectedItem, setSelectedItem] = useState<ServiceItem | null>(null);
  const [createFormKey, setCreateFormKey] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredServiceItems = useMemo(
    () => filterServiceItems(serviceItems, search, statusFilter),
    [serviceItems, search, statusFilter],
  );

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
  const hasNoResults = !hasNoItems && filteredServiceItems.length === 0;
  const isPanelOpen = panelMode !== "empty";

  return (
    <ListCommandCenterLayout
      title="Price book"
      subtitle="Reusable services and parts for estimate line items"
      primaryAction={
        canManagePriceBook ? (
          <button
            type="button"
            onClick={handleNewItem}
            className="inline-flex shrink-0 items-center gap-2 admin-btn-primary"
          >
            <Plus className="h-4 w-4" />
            New item
          </button>
        ) : undefined
      }
      className={
        isPanelOpen
          ? "max-lg:h-[calc(100dvh-7rem)] max-lg:min-h-0 max-lg:overflow-hidden"
          : undefined
      }
    >
      <section
        className={`flex min-h-[16rem] min-w-0 flex-1 flex-col overflow-hidden admin-card lg:min-h-0 ${
          isPanelOpen ? "max-lg:hidden" : ""
        }`}
      >
        {!hasNoItems ? (
          <ServiceItemsSearchFilterBar
            search={search}
            statusFilter={statusFilter}
            onSearchChange={setSearch}
            onStatusFilterChange={setStatusFilter}
            resultCount={filteredServiceItems.length}
          />
        ) : null}

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden lg:overflow-y-auto">
          {hasNoItems ? (
            <ServiceItemsEmptyState
              variant="no-items"
              onCreateItem={canManagePriceBook ? handleNewItem : undefined}
            />
          ) : hasNoResults ? (
            <ServiceItemsEmptyState variant="no-results" />
          ) : (
            <ServiceItemsTable
              serviceItems={filteredServiceItems}
              selectedItemId={selectedItem?.id}
              onSelectItem={handleSelectItem}
            />
          )}
        </div>
      </section>

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
      />
    </ListCommandCenterLayout>
  );
}
