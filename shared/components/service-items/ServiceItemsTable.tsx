"use client";

import { useMemo } from "react";
import { BulkSelectCheckbox } from "@/shared/components/bulk/BulkSelectCheckbox";
import { resolveBulkSelectionState } from "@/shared/lib/bulk-selection";
import {
  adminTableRowClass,
  adminTableRowSelectedClass,
} from "@/shared/lib/admin-density";
import { formatCurrency } from "@/shared/types/customer";
import type { ServiceItem } from "@/shared/types/service-item";

type ServiceItemsTableProps = {
  serviceItems: ServiceItem[];
  selectedItemId?: string;
  onSelectItem: (item: ServiceItem) => void;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelection?: (itemId: string) => void;
  onToggleAllVisible?: (selectAll: boolean) => void;
};

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-slate-100 text-slate-600",
} as const;

export function ServiceItemsTable({
  serviceItems,
  selectedItemId,
  onSelectItem,
  selectionEnabled = false,
  selectedIds,
  onToggleSelection,
  onToggleAllVisible,
}: ServiceItemsTableProps) {
  const headerSelection = useMemo(
    () =>
      selectionEnabled && selectedIds
        ? resolveBulkSelectionState(selectedIds, serviceItems)
        : null,
    [selectedIds, selectionEnabled, serviceItems],
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100/90 bg-white text-xs font-semibold uppercase tracking-wide text-slate-500">
            {selectionEnabled ? (
              <th className="w-10 px-4 py-3">
                {headerSelection && headerSelection.selectableCount > 0 ? (
                  <BulkSelectCheckbox
                    checked={headerSelection.allSelected}
                    indeterminate={headerSelection.someSelected}
                    ariaLabel="Select all visible items"
                    onChange={(checked) => onToggleAllVisible?.(checked)}
                  />
                ) : null}
              </th>
            ) : null}
            <th className="px-4 py-3">Item</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3 text-right">Internal cost</th>
            <th className="px-4 py-3 text-right">Customer price</th>
            <th className="px-4 py-3">Taxable</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {serviceItems.map((item) => {
            const isSelected = item.id === selectedItemId;
            const isBulkSelected = selectedIds?.has(item.id) ?? false;

            return (
              <tr
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`${adminTableRowClass} ${
                  isSelected || isBulkSelected ? adminTableRowSelectedClass : ""
                }`}
              >
                {selectionEnabled ? (
                  <td className="px-4 py-3">
                    <BulkSelectCheckbox
                      checked={isBulkSelected}
                      ariaLabel={`Select item ${item.name}`}
                      onChange={() => onToggleSelection?.(item.id)}
                    />
                  </td>
                ) : null}
                <td className="px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {item.name}
                    </p>
                    {item.description ? (
                      <p className="truncate text-xs text-slate-500">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {item.category ?? "—"}
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-700">
                  {item.unitCost == null ? "—" : formatCurrency(item.unitCost)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {item.taxable ? "Yes" : "No"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                      item.isActive
                        ? statusStyles.active
                        : statusStyles.inactive
                    }`}
                  >
                    {item.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
