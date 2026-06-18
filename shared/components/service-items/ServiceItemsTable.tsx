"use client";

import { useMemo } from "react";
import { BulkSelectCheckbox } from "@/shared/components/bulk/BulkSelectCheckbox";
import { resolveBulkSelectionState } from "@/shared/lib/bulk-selection";
import {
  adminTableRowClass,
  adminTableRowSelectedClass,
} from "@/shared/lib/admin-density";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
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
  northStar?: boolean;
};

const legacyStatusStyles = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-slate-100 text-slate-600",
} as const;

const northStarStatusStyles = {
  active:
    "bg-[rgba(4,120,87,0.10)] text-[#047857] ring-1 ring-[rgba(4,120,87,0.18)]",
  inactive: `${lt.badgeArchived}`,
} as const;

const northStarMissingValueClass =
  "text-xs font-medium italic text-[#6B6255]";

function getCategoryLabel(category: string | undefined, northStar: boolean) {
  const trimmed = category?.trim();
  if (trimmed) {
    return { text: trimmed, missing: false };
  }

  return {
    text: northStar ? "No category" : "—",
    missing: true,
  };
}

function getCostLabel(unitCost: number | null | undefined, northStar: boolean) {
  if (unitCost == null) {
    return {
      text: northStar ? "Cost not set" : "—",
      missing: true,
    };
  }

  return {
    text: formatCurrency(unitCost),
    missing: false,
  };
}

export function ServiceItemsTable({
  serviceItems,
  selectedItemId,
  onSelectItem,
  selectionEnabled = false,
  selectedIds,
  onToggleSelection,
  onToggleAllVisible,
  northStar = false,
}: ServiceItemsTableProps) {
  const headerSelection = useMemo(
    () =>
      selectionEnabled && selectedIds
        ? resolveBulkSelectionState(selectedIds, serviceItems)
        : null,
    [selectedIds, selectionEnabled, serviceItems],
  );

  const statusStyles = northStar ? northStarStatusStyles : legacyStatusStyles;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr
            className={
              northStar
                ? lt.tableHeaderRow
                : "border-b border-slate-100/90 bg-white text-xs font-semibold uppercase tracking-wide text-slate-500"
            }
          >
            {selectionEnabled ? (
              <th
                className={`w-10 ${northStar ? lt.tableHeaderCell : "px-4 py-3"}`}
              >
                {headerSelection && headerSelection.selectableCount > 0 ? (
                  <BulkSelectCheckbox
                    checked={headerSelection.allSelected}
                    indeterminate={headerSelection.someSelected}
                    ariaLabel="Select all visible items"
                    onChange={(checked) => onToggleAllVisible?.(checked)}
                    variant={northStar ? "northStar" : "default"}
                  />
                ) : null}
              </th>
            ) : null}
            <th className={northStar ? lt.tableHeaderCell : "px-4 py-3"}>Item</th>
            <th className={northStar ? lt.tableHeaderCell : "px-4 py-3"}>
              Category
            </th>
            <th
              className={`${northStar ? lt.tableHeaderCell : "px-4 py-3"} text-right`}
            >
              Internal cost
            </th>
            <th
              className={`${northStar ? lt.tableHeaderCell : "px-4 py-3"} text-right`}
            >
              Customer price
            </th>
            <th className={northStar ? lt.tableHeaderCell : "px-4 py-3"}>
              Taxable
            </th>
            <th className={northStar ? lt.tableHeaderCell : "px-4 py-3"}>
              Status
            </th>
          </tr>
        </thead>
        <tbody
          className={
            northStar
              ? "divide-y divide-[rgba(138,99,36,0.12)]"
              : "divide-y divide-slate-50"
          }
        >
          {serviceItems.map((item) => {
            const isSelected = item.id === selectedItemId;
            const isBulkSelected = selectedIds?.has(item.id) ?? false;
            const category = getCategoryLabel(item.category, northStar);
            const internalCost = getCostLabel(item.unitCost, northStar);

            return (
              <tr
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={
                  northStar
                    ? `${lt.tableRow} ${
                        isSelected || isBulkSelected ? lt.tableRowSelected : ""
                      }`
                    : `${adminTableRowClass} ${
                        isSelected || isBulkSelected
                          ? adminTableRowSelectedClass
                          : ""
                      }`
                }
              >
                {selectionEnabled ? (
                  <td className={northStar ? "admin-table-cell" : "px-4 py-3"}>
                    <BulkSelectCheckbox
                      checked={isBulkSelected}
                      ariaLabel={`Select item ${item.name}`}
                      onChange={() => onToggleSelection?.(item.id)}
                      variant={northStar ? "northStar" : "default"}
                    />
                  </td>
                ) : null}
                <td className={northStar ? "admin-table-cell" : "px-4 py-3"}>
                  <div className="min-w-0">
                    <p
                      className={
                        northStar
                          ? lt.tablePrimaryText
                          : "truncate font-semibold text-slate-900"
                      }
                    >
                      {item.name}
                    </p>
                    {item.description ? (
                      <p
                        className={
                          northStar ? lt.tableMutedText : "truncate text-xs text-slate-500"
                        }
                      >
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </td>
                <td
                  className={
                    northStar
                      ? `admin-table-cell ${
                          category.missing
                            ? northStarMissingValueClass
                            : lt.tableSecondaryText
                        }`
                      : "px-4 py-3 text-slate-600"
                  }
                >
                  {category.text}
                </td>
                <td
                  className={`${
                    northStar ? "admin-table-cell text-right" : "px-4 py-3 text-right"
                  } ${
                    internalCost.missing
                      ? northStar
                        ? northStarMissingValueClass
                        : "font-medium text-slate-700"
                      : northStar
                        ? lt.tableMetricText
                        : "font-medium text-slate-700"
                  }`}
                >
                  {internalCost.text}
                </td>
                <td
                  className={`${
                    northStar
                      ? `admin-table-cell text-right ${lt.tableMetricText}`
                      : "px-4 py-3 text-right font-medium text-slate-900"
                  }`}
                >
                  {formatCurrency(item.unitPrice)}
                </td>
                <td
                  className={
                    northStar
                      ? `admin-table-cell ${lt.tableSecondaryText}`
                      : "px-4 py-3 text-slate-600"
                  }
                >
                  {item.taxable ? "Yes" : "No"}
                </td>
                <td className={northStar ? "admin-table-cell" : "px-4 py-3"}>
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
