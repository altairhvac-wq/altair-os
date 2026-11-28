"use client";

import { useMemo } from "react";
import { STATUS_TONE_CLASS } from "@/shared/design-system/components/status-tone";
import { BulkSelectCheckbox } from "@/shared/components/bulk/BulkSelectCheckbox";
import { resolveBulkSelectionState } from "@/shared/lib/bulk-selection";
import {
  adminTableRowClass,
  adminTableRowSelectedClass,
} from "@/shared/lib/admin-density";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { formatCurrencyExact } from "@/shared/types/customer";
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

/* `active` was raw Tailwind emerald-700 (#047857) on a wash of itself — a
 * pre-remap literal the palette migration never reached, measured 4.19:1 in the
 * open panel. A sellable item is the `success` case, so it takes the shared
 * tone rather than a second private green. */
const northStarStatusStyles = {
  active: STATUS_TONE_CLASS.success,
  inactive: `${lt.badgeArchived}`,
} as const;

const northStarTableHeaderRow =
  "border-b border-[rgba(119,89,27,0.12)] bg-[#FBF7EF] text-xs font-semibold text-[#4F4638]";

const northStarTableHeaderCell = "admin-table-cell text-xs font-semibold text-[#4F4638]";

// On a phone the name wraps instead of pushing the price off the screen.
const northStarItemNameClass =
  "truncate text-sm font-bold text-[#17130E] max-sm:whitespace-normal max-sm:break-words";

const northStarItemDescriptionClass =
  "mt-0.5 line-clamp-2 text-sm leading-snug text-[#4F4638]";

const northStarCategoryChipClass =
  "inline-flex rounded-md bg-[#EFE4CB] px-2 py-0.5 text-xs font-semibold text-[#4F4638] ring-1 ring-[rgba(119,89,27,0.14)]";

const northStarMissingValueClass = "text-sm text-[#786D53]";

const northStarMissingCostBadgeClass =
  "inline-flex rounded-md bg-[#F5F0E4] px-2 py-0.5 text-xs font-medium text-[#4F4638] ring-1 ring-[rgba(119,89,27,0.12)]";

const northStarInternalCostClass = "text-sm font-medium tabular-nums text-[#4F4638]";

const northStarCustomerPriceClass = "text-sm font-bold tabular-nums text-[#17130E]";

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
      text: northStar ? "Missing cost" : "—",
      missing: true,
    };
  }

  return {
    text: formatCurrencyExact(unitCost),
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
      {/*
       * On a phone the table is two columns: the item and its price. It used
       * to keep its 720px desktop width, so only the Item column was on
       * screen and the price was off the right edge (UI audit 2026-11-12:
       * "no prices on a phone"). Category, a missing cost and an inactive
       * state move under the item name; the full columns return from 640px.
       */}
      <table className="w-full text-left text-sm max-sm:table-fixed sm:min-w-[720px]">
        <thead>
          <tr
            className={
              northStar
                ? northStarTableHeaderRow
                : "border-b border-slate-100/90 bg-white text-xs font-semibold uppercase tracking-wide text-altair-ink-on-paper-muted"
            }
          >
            {selectionEnabled ? (
              <th
                className={`w-10 ${northStar ? northStarTableHeaderCell : "px-4 py-3"}`}
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
            <th className={northStar ? northStarTableHeaderCell : "px-4 py-3"}>Item</th>
            <th className={`${northStar ? northStarTableHeaderCell : "px-4 py-3"} max-sm:hidden`}>
              Category
            </th>
            <th
              className={`${northStar ? northStarTableHeaderCell : "px-4 py-3"} text-right max-sm:hidden`}
            >
              Internal cost
            </th>
            <th
              className={`${northStar ? northStarTableHeaderCell : "px-4 py-3"} text-right max-sm:w-[6rem]`}
            >
              <span className="sm:hidden">Price</span>
              <span className="max-sm:hidden">Customer price</span>
            </th>
            <th className={`${northStar ? northStarTableHeaderCell : "px-4 py-3"} max-sm:hidden`}>
              Taxable
            </th>
            <th className={`${northStar ? northStarTableHeaderCell : "px-4 py-3"} max-sm:hidden`}>
              Status
            </th>
          </tr>
        </thead>
        <tbody
          className={
            northStar
              ? "divide-y divide-[rgba(119,89,27,0.12)]"
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
                    {/* The row's onClick is pointer-only by design — the table
                        primitive's contract puts keyboard semantics on a real
                        control inside a cell, never on the <tr>. Without this
                        button the price book was unreachable by keyboard: the
                        row was the only way in. */}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectItem(item);
                      }}
                      className={`block min-w-0 max-w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                        northStar
                          ? northStarItemNameClass
                          : "truncate font-semibold text-slate-900"
                      }`}
                    >
                      {item.name}
                    </button>
                    {item.description ? (
                      <p
                        className={
                          northStar
                            ? northStarItemDescriptionClass
                            : "truncate text-xs text-altair-ink-on-paper-muted"
                        }
                      >
                        {item.description}
                      </p>
                    ) : null}
                    {/* Phone only: what the hidden columns would have said. */}
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-altair-ink-on-paper-secondary sm:hidden">
                      <span>{category.text}</span>
                      {internalCost.missing ? (
                        <span className="font-semibold text-altair-warning-foreground">Missing cost</span>
                      ) : null}
                      {item.isActive ? null : <span className="font-semibold">Inactive</span>}
                    </p>
                  </div>
                </td>
                <td className={`${northStar ? "admin-table-cell" : "px-4 py-3 text-slate-600"} max-sm:hidden`}>
                  {northStar && !category.missing ? (
                    <span className={northStarCategoryChipClass}>{category.text}</span>
                  ) : (
                    <span
                      className={
                        northStar && category.missing ? northStarMissingValueClass : ""
                      }
                    >
                      {category.text}
                    </span>
                  )}
                </td>
                <td
                  className={`max-sm:hidden ${
                    northStar ? "admin-table-cell text-right" : "px-4 py-3 text-right"
                  } ${
                    internalCost.missing
                      ? northStar
                        ? ""
                        : "font-medium text-slate-700"
                      : northStar
                        ? northStarInternalCostClass
                        : "font-medium text-slate-700"
                  }`}
                >
                  {northStar && internalCost.missing ? (
                    <span className={northStarMissingCostBadgeClass}>
                      {internalCost.text}
                    </span>
                  ) : (
                    internalCost.text
                  )}
                </td>
                <td
                  className={`${
                    northStar
                      ? `admin-table-cell text-right ${northStarCustomerPriceClass}`
                      : "px-4 py-3 text-right font-medium text-slate-900"
                  }`}
                >
                  {formatCurrencyExact(item.unitPrice)}
                </td>
                <td
                  className={`max-sm:hidden ${
                    northStar
                      ? `admin-table-cell ${lt.tableSecondaryText}`
                      : "px-4 py-3 text-slate-600"
                  }`}
                >
                  {item.taxable ? "Yes" : "No"}
                </td>
                <td className={`${northStar ? "admin-table-cell" : "px-4 py-3"} max-sm:hidden`}>
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
