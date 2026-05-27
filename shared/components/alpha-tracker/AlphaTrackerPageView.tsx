"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  createAlphaTrackerItemAction,
  updateAlphaTrackerItemAction,
  updateAlphaTrackerItemStatusAction,
} from "@/app/actions/alpha-tracker";
import type {
  AlphaTrackerItem,
  AlphaTrackerItemEditFormData,
  AlphaTrackerItemFormData,
  AlphaTrackerSeverity,
  AlphaTrackerStatus,
  AlphaTrackerType,
} from "@/shared/types/alpha-tracker";
import { AlphaTrackerFilterBar } from "./AlphaTrackerFilterBar";
import { AlphaTrackerItemForm } from "./AlphaTrackerItemForm";
import { AlphaTrackerItemList } from "./AlphaTrackerItemList";

type AlphaTrackerPageViewProps = {
  initialItems: AlphaTrackerItem[];
  currentUserId: string;
  canManageCompany: boolean;
};

const SEVERITY_SORT_ORDER: Record<AlphaTrackerSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const STATUS_SORT_ORDER: Record<AlphaTrackerStatus, number> = {
  open: 0,
  in_progress: 0,
  deferred: 1,
  fixed: 2,
};

function sortAlphaTrackerItems(items: AlphaTrackerItem[]): AlphaTrackerItem[] {
  return [...items].sort((a, b) => {
    const statusDiff = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;

    const severityDiff =
      SEVERITY_SORT_ORDER[a.severity] - SEVERITY_SORT_ORDER[b.severity];
    if (severityDiff !== 0) return severityDiff;

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function filterAlphaTrackerItems(
  items: AlphaTrackerItem[],
  search: string,
  typeFilter: AlphaTrackerType | "all",
  severityFilter: AlphaTrackerSeverity | "all",
  statusFilter: AlphaTrackerStatus | "all",
): AlphaTrackerItem[] {
  const query = search.trim().toLowerCase();

  return items.filter((item) => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (severityFilter !== "all" && item.severity !== severityFilter) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;

    if (!query) return true;

    const haystack = [
      item.title,
      item.description ?? "",
      item.pageOrArea ?? "",
      item.notes ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function AlphaTrackerPageView({
  initialItems,
  currentUserId,
  canManageCompany,
}: AlphaTrackerPageViewProps) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AlphaTrackerType | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<
    AlphaTrackerSeverity | "all"
  >("all");
  const [statusFilter, setStatusFilter] = useState<AlphaTrackerStatus | "all">(
    "open",
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredItems = useMemo(
    () =>
      sortAlphaTrackerItems(
        filterAlphaTrackerItems(
          items,
          search,
          typeFilter,
          severityFilter,
          statusFilter,
        ),
      ),
    [items, search, typeFilter, severityFilter, statusFilter],
  );

  function handleCreateSubmit(data: AlphaTrackerItemFormData) {
    setFormError(null);

    startTransition(async () => {
      const result = await createAlphaTrackerItemAction(data);

      if (result.error || !result.item) {
        setFormError(result.error ?? "Failed to create tracker item.");
        return;
      }

      setItems((previous) => [result.item!, ...previous]);
      setShowCreateForm(false);
    });
  }

  function handleEdit(itemId: string) {
    setShowCreateForm(false);
    setFormError(null);
    setEditingItemId(itemId);
    setEditError(null);
  }

  function handleEditCancel() {
    setEditingItemId(null);
    setEditError(null);
  }

  function handleEditSubmit(itemId: string, data: AlphaTrackerItemEditFormData) {
    setEditError(null);

    startTransition(async () => {
      const result = await updateAlphaTrackerItemAction(itemId, data);

      if (result.error || !result.item) {
        setEditError(result.error ?? "Failed to update tracker item.");
        return;
      }

      setItems((previous) =>
        previous.map((item) => (item.id === itemId ? result.item! : item)),
      );
      setEditingItemId(null);
    });
  }

  function handleStatusChange(itemId: string, status: AlphaTrackerStatus) {
    setStatusUpdatingId(itemId);

    startTransition(async () => {
      const result = await updateAlphaTrackerItemStatusAction(itemId, status);

      setStatusUpdatingId(null);

      if (result.error || !result.item) {
        return;
      }

      setItems((previous) =>
        previous.map((item) =>
          item.id === itemId ? result.item! : item,
        ),
      );
    });
  }

  const hasNoItems = items.length === 0;
  const hasNoResults = !hasNoItems && filteredItems.length === 0;

  return (
    <div className="admin-card flex min-w-0 max-w-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Alpha Tracker</h2>
          <p className="text-xs text-slate-500">
            Internal bug and feature tracking for alpha testing
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreateForm((previous) => !previous);
            setFormError(null);
            setEditingItemId(null);
            setEditError(null);
          }}
          className="inline-flex shrink-0 items-center gap-2 admin-btn-primary"
        >
          <Plus className="h-4 w-4" />
          {showCreateForm ? "Close form" : "New item"}
        </button>
      </div>

      {showCreateForm ? (
        <AlphaTrackerItemForm
          onSubmit={handleCreateSubmit}
          onCancel={() => {
            setShowCreateForm(false);
            setFormError(null);
          }}
          error={formError}
          isSubmitting={isPending}
        />
      ) : null}

      {!hasNoItems ? (
        <AlphaTrackerFilterBar
          search={search}
          typeFilter={typeFilter}
          severityFilter={severityFilter}
          statusFilter={statusFilter}
          onSearchChange={setSearch}
          onTypeFilterChange={setTypeFilter}
          onSeverityFilterChange={setSeverityFilter}
          onStatusFilterChange={setStatusFilter}
          resultCount={filteredItems.length}
        />
      ) : null}

      <div className="min-h-0 min-w-0 flex-1 overflow-x-auto lg:overflow-y-auto">
        {hasNoItems ? (
          <AlphaTrackerItemList
            items={[]}
            currentUserId={currentUserId}
            canManageCompany={canManageCompany}
            onStatusChange={handleStatusChange}
            statusUpdatingId={statusUpdatingId}
            editingItemId={editingItemId}
            editError={editError}
            isEditSubmitting={isPending}
            onEdit={handleEdit}
            onEditCancel={handleEditCancel}
            onEditSubmit={handleEditSubmit}
          />
        ) : hasNoResults ? (
          <div className="px-6 py-16 text-center text-sm text-slate-500">
            No items match the current filters.
          </div>
        ) : (
          <AlphaTrackerItemList
            items={filteredItems}
            currentUserId={currentUserId}
            canManageCompany={canManageCompany}
            onStatusChange={handleStatusChange}
            statusUpdatingId={statusUpdatingId}
            editingItemId={editingItemId}
            editError={editError}
            isEditSubmitting={isPending}
            onEdit={handleEdit}
            onEditCancel={handleEditCancel}
            onEditSubmit={handleEditSubmit}
          />
        )}
      </div>
    </div>
  );
}
