"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { BulkSelectCheckbox } from "@/shared/components/bulk/BulkSelectCheckbox";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
import { useFormatDemoDisplayName } from "@/shared/components/display/FounderMarketingDisplayContext";
import {
  adminTableRowClass,
  adminTableRowSelectedClass,
} from "@/shared/lib/admin-density";
import { resolveBulkSelectionState } from "@/shared/lib/bulk-selection";
import { isCustomerArchived, isCustomerDeleted } from "@/shared/lib/customer-lifecycle";
import {
  formatCurrency,
  formatDate,
  getCustomerInitials,
  type Customer,
} from "@/shared/types/customer";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { CustomerStatusBadge } from "./CustomerStatusBadge";
import { CustomersMobileCardList } from "./CustomersMobileCardList";

type CustomersTableProps = {
  customers: Customer[];
  showRevenueStats?: boolean;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelection?: (customerId: string) => void;
  onToggleAllVisible?: (selectAll: boolean) => void;
  northStar?: boolean;
};

export function CustomersTable({
  customers,
  showRevenueStats = true,
  selectionEnabled = false,
  selectedIds,
  onToggleSelection,
  onToggleAllVisible,
  northStar = false,
}: CustomersTableProps) {
  const router = useRouter();
  const formatDisplayName = useFormatDemoDisplayName();

  const headerSelection = useMemo(
    () =>
      selectionEnabled && selectedIds
        ? resolveBulkSelectionState(selectedIds, customers)
        : null,
    [customers, selectedIds, selectionEnabled],
  );

  return (
    <>
      <CustomersMobileCardList customers={customers} northStar={northStar} />

      <div
        className={`hidden max-w-full overflow-x-auto md:block${
          northStar ? " customer-north-star-ledger" : ""
        }`}
      >
        <table className="w-full min-w-[640px] text-left text-sm">
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
                className={`w-10 ${northStar ? lt.tableHeaderCell : "admin-table-cell"}`}
              >
                {headerSelection && headerSelection.selectableCount > 0 ? (
                  <BulkSelectCheckbox
                    checked={headerSelection.allSelected}
                    indeterminate={headerSelection.someSelected}
                    ariaLabel="Select all visible customers"
                    onChange={(checked) => onToggleAllVisible?.(checked)}
                    variant={northStar ? "northStar" : "default"}
                  />
                ) : null}
              </th>
            ) : null}
            <th className={northStar ? lt.tableHeaderCell : "admin-table-cell"}>
              Customer
            </th>
            <th className={northStar ? lt.tableHeaderCell : "admin-table-cell"}>
              Status
            </th>
            <th className={northStar ? lt.tableHeaderCell : "admin-table-cell"}>
              Location
            </th>
            <th
              className={`${northStar ? lt.tableHeaderCell : "admin-table-cell"} text-right`}
            >
              Jobs
            </th>
            {showRevenueStats ? (
              <th
                className={`${northStar ? lt.tableHeaderCell : "admin-table-cell"} text-right`}
              >
                Revenue
              </th>
            ) : null}
            <th
              className={`hidden ${northStar ? lt.tableHeaderCell : "admin-table-cell"} lg:table-cell`}
            >
              Last service
            </th>
          </tr>
        </thead>
        <tbody
          className={
            northStar
              ? "divide-y divide-[rgba(79,70,56,0.08)]"
              : "divide-y divide-slate-50"
          }
        >
          {customers.map((customer) => {
            const isBulkSelected = selectedIds?.has(customer.id) ?? false;

            return (
            <tr
              key={customer.id}
              onClick={() => router.push(`/customers/${customer.id}`)}
              className={
                northStar
                  ? `${lt.tableRow} ${
                      isBulkSelected ? lt.tableRowSelected : ""
                    }`
                  : `${adminTableRowClass} ${
                      isBulkSelected ? adminTableRowSelectedClass : ""
                    }`
              }
            >
              {selectionEnabled ? (
                <td className="admin-table-cell">
                  <BulkSelectCheckbox
                    checked={selectedIds?.has(customer.id) ?? false}
                    ariaLabel={`Select ${customer.name}`}
                    onChange={() => onToggleSelection?.(customer.id)}
                    variant={northStar ? "northStar" : "default"}
                  />
                </td>
              ) : null}
              <td className="admin-table-cell">
                <div className="flex items-center gap-3">
                  <div
                    className={
                      northStar
                        ? lt.tableAvatar
                        : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-400 text-xs font-bold text-white"
                    }
                  >
                    {getCustomerInitials(formatDisplayName(customer.name))}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={
                          northStar
                            ? lt.tablePrimaryText
                            : "truncate font-semibold text-slate-900"
                        }
                      >
                        <DemoDisplayName>{customer.name}</DemoDisplayName>
                      </p>
                      {isCustomerDeleted(customer) ? (
                        <span
                          className={
                            northStar
                              ? lt.badgeDeleted
                              : "inline-flex shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-800"
                          }
                        >
                          Deleted
                        </span>
                      ) : isCustomerArchived(customer) ? (
                        <span
                          className={
                            northStar
                              ? lt.badgeArchived
                              : "inline-flex shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600"
                          }
                        >
                          Archived
                        </span>
                      ) : null}
                    </div>
                    <p
                      className={
                        northStar
                          ? lt.tableSecondaryText
                          : "truncate text-xs text-slate-500"
                      }
                    >
                      {customer.company ?? customer.email}
                    </p>
                  </div>
                </div>
              </td>
              <td className="admin-table-cell">
                <CustomerStatusBadge status={customer.status} />
              </td>
              <td
                className={`admin-table-cell${
                  northStar
                    ? " customer-north-star-location-cell"
                    : " text-slate-600"
                }`}
              >
                {customer.city}, {customer.state}
              </td>
              <td
                className={`admin-table-cell text-right${
                  northStar
                    ? " customer-north-star-jobs-cell"
                    : " font-medium text-slate-900"
                }`}
              >
                {customer.totalJobs}
              </td>
              {showRevenueStats ? (
                <td
                  className={`admin-table-cell text-right${
                    northStar
                      ? " customer-north-star-revenue-cell"
                      : " font-medium text-slate-900"
                  }`}
                >
                  {formatCurrency(customer.totalRevenue)}
                </td>
              ) : null}
              <td
                className={`hidden admin-table-cell lg:table-cell${
                  northStar
                    ? " customer-north-star-date-cell"
                    : " text-slate-500"
                }`}
              >
                {customer.lastServiceDate
                  ? formatDate(customer.lastServiceDate)
                  : "—"}
              </td>
            </tr>
            );
          })}
        </tbody>
        </table>
      </div>
    </>
  );
}
