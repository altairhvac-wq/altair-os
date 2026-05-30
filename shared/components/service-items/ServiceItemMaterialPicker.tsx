"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { formatCurrency } from "@/shared/types/customer";
import {
  filterActiveServiceItemsForSearch,
  type ServiceItem,
} from "@/shared/types/service-item";

type ServiceItemMaterialPickerProps = {
  serviceItems: ServiceItem[];
  selectedServiceItemId: string | null;
  onSelect: (serviceItemId: string | null) => void;
  disabled?: boolean;
  inputClass?: string;
  labelClass?: string;
  showUnitCost?: boolean;
};

export function ServiceItemMaterialPicker({
  serviceItems,
  selectedServiceItemId,
  onSelect,
  disabled = false,
  inputClass = "w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 sm:text-sm",
  labelClass = "mb-1.5 block text-xs font-semibold text-slate-600",
  showUnitCost = false,
}: ServiceItemMaterialPickerProps) {
  const [search, setSearch] = useState("");

  const selectedItem = useMemo(
    () =>
      selectedServiceItemId
        ? serviceItems.find((item) => item.id === selectedServiceItemId) ?? null
        : null,
    [selectedServiceItemId, serviceItems],
  );

  const filteredItems = useMemo(
    () => filterActiveServiceItemsForSearch(serviceItems, search),
    [serviceItems, search],
  );

  function handleClearSelection() {
    setSearch("");
    onSelect(null);
  }

  if (selectedItem) {
    return (
      <div>
        <label className={labelClass}>Price book item</label>
        <div className="flex min-w-0 items-start gap-2 rounded-xl border border-cyan-200 bg-cyan-50/50 px-3.5 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {selectedItem.name}
            </p>
            {selectedItem.description ? (
              <p className="mt-0.5 truncate text-xs text-slate-600">
                {selectedItem.description}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-slate-500">
              Customer charge: {formatCurrency(selectedItem.unitPrice)}
              {showUnitCost && selectedItem.unitCost != null
                ? ` · Internal cost: ${formatCurrency(selectedItem.unitCost)}`
                : null}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            disabled={disabled}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-slate-700 disabled:opacity-60"
            aria-label="Clear selected price book item"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="material-service-item-search" className={labelClass}>
        Price book item
      </label>

      {serviceItems.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-600">
          No price book items yet — enter a custom material below.
        </p>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="material-service-item-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search price book..."
              disabled={disabled}
              autoComplete="off"
              className={`${inputClass} pl-10`}
            />
          </div>

          <ul
            className="mt-2 max-h-44 space-y-1 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-1"
            role="listbox"
            aria-label="Price book items"
          >
            <li>
              <button
                type="button"
                onClick={() => onSelect(null)}
                disabled={disabled}
                className="flex min-h-11 w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
              >
                Custom material
              </button>
            </li>
            {filteredItems.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-slate-500">
                No matching items — use custom material.
              </li>
            ) : (
              filteredItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    onClick={() => {
                      setSearch("");
                      onSelect(item.id);
                    }}
                    disabled={disabled}
                    className="flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50 disabled:opacity-60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {item.name}
                      </span>
                      {item.category ? (
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {item.category}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-right text-xs tabular-nums text-slate-600">
                      {formatCurrency(item.unitPrice)}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </div>
  );
}
