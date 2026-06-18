import { Fragment, useMemo } from "react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { BillingWorkflowListSection } from "@/shared/lib/billing-workflow-list";
import { resolveBulkSelectionState } from "@/shared/lib/bulk-selection";
import { canSelectEstimateForBulkLifecycle } from "@/shared/lib/estimate-lifecycle";
import {
  adminTableRowClass,
  adminTableRowSelectedClass,
} from "@/shared/lib/admin-density";
import type { Estimate } from "@/shared/types/estimate";
import { BulkSelectCheckbox } from "@/shared/components/bulk/BulkSelectCheckbox";
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { BillingWorkflowSectionHeader } from "@/shared/components/billing/BillingWorkflowSectionHeader";
import { EstimateStatusBadge } from "./EstimateStatusBadge";
import { EstimatesMobileCardList } from "./EstimatesMobileCardList";

type EstimatesTableProps = {
  sections: BillingWorkflowListSection<Estimate>[];
  showSectionHeaders: boolean;
  onSelect: (estimate: Estimate) => void;
  canManageCustomers?: boolean;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelection?: (estimateId: string) => void;
  onToggleAllVisible?: (selectAll: boolean) => void;
  northStar?: boolean;
};

export function EstimatesTable({
  sections,
  showSectionHeaders,
  onSelect,
  canManageCustomers = false,
  selectionEnabled = false,
  selectedIds,
  onToggleSelection,
  onToggleAllVisible,
  northStar = false,
}: EstimatesTableProps) {
  const visibleEstimates = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections],
  );

  const headerSelection = useMemo(
    () =>
      selectionEnabled && selectedIds
        ? resolveBulkSelectionState(selectedIds, visibleEstimates)
        : null,
    [selectedIds, selectionEnabled, visibleEstimates],
  );

  const tableColumnCount = selectionEnabled ? 7 : 6;

  return (
    <>
      <EstimatesMobileCardList
        sections={sections}
        showSectionHeaders={showSectionHeaders}
        onSelect={onSelect}
        canManageCustomers={canManageCustomers}
        selectionEnabled={selectionEnabled}
        selectedIds={selectedIds}
        onToggleSelection={onToggleSelection}
        northStar={northStar}
      />

      <div
        className={`hidden overflow-x-auto md:block${
          northStar ? " estimate-north-star-ledger" : ""
        }`}
      >
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr
              className={
                northStar
                  ? lt.tableHeaderRow
                  : "border-b border-slate-100/90 bg-slate-50/50 text-xs font-semibold uppercase tracking-wide text-slate-500"
              }
            >
              {selectionEnabled ? (
                <th
                  className={`w-10 ${northStar ? lt.tableHeaderCell : "admin-table-cell"}`}
                >
                  {headerSelection && headerSelection.selectableCount > 0 ? (
                    <BulkSelectCheckbox
                      checked={headerSelection.allSelected}
                      indeterminate={headerSelection.someSelected}
                      ariaLabel="Select all estimates on this page"
                      onChange={(checked) => onToggleAllVisible?.(checked)}
                      variant={northStar ? "northStar" : "default"}
                    />
                  ) : null}
                </th>
              ) : null}
              <th className={northStar ? lt.tableHeaderCell : "admin-table-cell"}>
                Estimate
              </th>
              <th className={northStar ? lt.tableHeaderCell : "admin-table-cell"}>
                Customer
              </th>
              <th
                className={`hidden ${northStar ? lt.tableHeaderCell : "admin-table-cell"} md:table-cell`}
              >
                Line items
              </th>
              <th
                className={`hidden ${northStar ? lt.tableHeaderCell : "admin-table-cell"} lg:table-cell`}
              >
                Valid until
              </th>
              <th className={northStar ? lt.tableHeaderCell : "admin-table-cell"}>
                Total
              </th>
              <th className={northStar ? lt.tableHeaderCell : "admin-table-cell"}>
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
            {sections.map((section) => (
              <Fragment key={section.id}>
                {showSectionHeaders ? (
                  <BillingWorkflowSectionHeader
                    label={section.label}
                    count={section.items.length}
                    variant="table"
                    colSpan={tableColumnCount}
                    northStar={northStar}
                  />
                ) : null}
                {section.items.map((estimate) => {
                  const lineItemCount =
                    estimate.lineItemCount ?? estimate.lineItems.length;
                  const isSelectable =
                    selectionEnabled &&
                    canSelectEstimateForBulkLifecycle(estimate);
                  const isSelected = selectedIds?.has(estimate.id) ?? false;

                  return (
                    <tr
                      key={estimate.id}
                      onClick={() => onSelect(estimate)}
                      className={
                        northStar
                          ? `${lt.tableRow} ${isSelected ? lt.tableRowSelected : ""}`
                          : `${adminTableRowClass} ${
                              isSelected ? adminTableRowSelectedClass : ""
                            }`
                      }
                    >
                      {selectionEnabled ? (
                        <td className="admin-table-cell">
                          {isSelectable ? (
                            <BulkSelectCheckbox
                              checked={isSelected}
                              ariaLabel={`Select estimate ${estimate.estimateNumber}`}
                              onChange={() => onToggleSelection?.(estimate.id)}
                              variant={northStar ? "northStar" : "default"}
                            />
                          ) : null}
                        </td>
                      ) : null}
                      <td className="admin-table-cell">
                        <p
                          className={
                            northStar
                              ? lt.tablePrimaryText
                              : "font-semibold text-slate-900"
                          }
                        >
                          {estimate.estimateNumber}
                        </p>
                        <p
                          className={
                            northStar ? lt.tableMutedText : "text-xs text-slate-500"
                          }
                        >
                          {formatDate(estimate.createdAt)}
                        </p>
                      </td>
                      <td className="admin-table-cell">
                        <CustomerNameLink
                          customerId={estimate.customerId}
                          customerName={estimate.customerName}
                          canManageCustomers={canManageCustomers}
                          className={
                            northStar
                              ? `${lt.tablePrimaryText} truncate font-medium`
                              : "truncate font-medium text-slate-900"
                          }
                          stopRowNavigation
                        />
                      </td>
                      <td
                        className={`hidden admin-table-cell md:table-cell ${
                          northStar ? "estimate-north-star-meta-cell" : "text-slate-600"
                        }`}
                      >
                        {lineItemCount} {lineItemCount === 1 ? "item" : "items"}
                      </td>
                      <td
                        className={`hidden admin-table-cell lg:table-cell ${
                          northStar ? "estimate-north-star-date-cell" : "text-slate-600"
                        }`}
                      >
                        {estimate.validUntil
                          ? formatDate(estimate.validUntil)
                          : "—"}
                      </td>
                      <td
                        className={`admin-table-cell ${
                          northStar ? lt.tableMetricText : "font-semibold text-slate-900"
                        }`}
                      >
                        {formatCurrency(estimate.total)}
                      </td>
                      <td className="admin-table-cell">
                        <EstimateStatusBadge status={estimate.status} />
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
