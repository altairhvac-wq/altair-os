"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { BulkSelectCheckbox } from "@/shared/components/bulk/BulkSelectCheckbox";
import { useFormatDemoDisplayName } from "@/shared/components/display/FounderMarketingDisplayContext";
import {
  AltairTable,
  AltairTableBody,
  AltairTableCell,
  AltairTableHead,
  AltairTableHeader,
  AltairTablePrimaryCell,
  AltairTableRow,
  AltairTableSecondaryText,
} from "@/shared/design-system/table";
import { resolveBulkSelectionState } from "@/shared/lib/bulk-selection";
import { isCustomerArchived, isCustomerDeleted } from "@/shared/lib/customer-lifecycle";
import {
  formatCurrency,
  formatDate,
  getCustomerInitials,
  type Customer,
} from "@/shared/types/customer";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { CustomerNameLink } from "./CustomerNameLink";
import { CustomerStatusBadge } from "./CustomerStatusBadge";
import { CustomersMobileCardList } from "./CustomersMobileCardList";

/**
 * Focus ring for the primary customer-name link: the same Paper-surface
 * treatment already used by Input/Select/Textarea (see
 * shared/design-system/components/Input.tsx). Reused rather than inventing a
 * new focus token — ink-on-paper/paper-elevated stay anchored to Paper in
 * both themes, so the ring stays visible and non-cyan regardless of theme.
 */
const customerNameLinkFocusClass =
  "hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated";

type CustomersTableProps = {
  customers: Customer[];
  showRevenueStats?: boolean;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelection?: (customerId: string) => void;
  onToggleAllVisible?: (selectAll: boolean) => void;
  northStar?: boolean;
  canManageCustomers?: boolean;
};

export function CustomersTable({
  customers,
  showRevenueStats = true,
  selectionEnabled = false,
  selectedIds,
  onToggleSelection,
  onToggleAllVisible,
  northStar = false,
  canManageCustomers = false,
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
        <AltairTable className="min-w-[640px]">
          <AltairTableHeader>
            <AltairTableRow className={northStar ? lt.tableHeaderRow : undefined}>
              {selectionEnabled ? (
                <AltairTableHead
                  className={`w-10 ${northStar ? lt.tableHeaderCell : ""}`}
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
                </AltairTableHead>
              ) : null}
              <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                Customer
              </AltairTableHead>
              <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                Status
              </AltairTableHead>
              <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                Location
              </AltairTableHead>
              <AltairTableHead
                align="right"
                className={northStar ? lt.tableHeaderCell : undefined}
              >
                Jobs
              </AltairTableHead>
              {showRevenueStats ? (
                <AltairTableHead
                  align="right"
                  className={northStar ? lt.tableHeaderCell : undefined}
                >
                  Revenue
                </AltairTableHead>
              ) : null}
              <AltairTableHead
                className={`hidden lg:table-cell ${northStar ? lt.tableHeaderCell : ""}`}
              >
                Last service
              </AltairTableHead>
            </AltairTableRow>
          </AltairTableHeader>
          <AltairTableBody>
            {customers.map((customer) => {
              const isBulkSelected = selectedIds?.has(customer.id) ?? false;

              return (
                <AltairTableRow
                  key={customer.id}
                  selected={isBulkSelected}
                  onClick={() => router.push(`/customers/${customer.id}`)}
                  className={northStar ? lt.tableRow : undefined}
                >
                  {selectionEnabled ? (
                    <AltairTableCell>
                      <BulkSelectCheckbox
                        checked={selectedIds?.has(customer.id) ?? false}
                        ariaLabel={`Select ${customer.name}`}
                        onChange={() => onToggleSelection?.(customer.id)}
                        variant={northStar ? "northStar" : "default"}
                      />
                    </AltairTableCell>
                  ) : null}
                  <AltairTablePrimaryCell
                    leading={
                      <div
                        className={
                          northStar
                            ? lt.tableAvatar
                            : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-400 text-xs font-bold text-white"
                        }
                      >
                        {getCustomerInitials(formatDisplayName(customer.name))}
                      </div>
                    }
                    primary={
                      <CustomerNameLink
                        customerId={customer.id}
                        customerName={customer.name}
                        canManageCustomers={canManageCustomers}
                        className={
                          northStar
                            ? lt.tablePrimaryText
                            : "truncate font-semibold text-slate-900"
                        }
                        linkClassName={
                          northStar
                            ? `${lt.tablePrimaryText} ${customerNameLinkFocusClass}`
                            : `truncate font-semibold text-slate-900 ${customerNameLinkFocusClass}`
                        }
                        stopRowNavigation
                      />
                    }
                    trailing={
                      isCustomerDeleted(customer) ? (
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
                      ) : null
                    }
                    secondary={
                      <AltairTableSecondaryText
                        className={
                          northStar
                            ? lt.tableSecondaryText
                            : "truncate text-xs text-slate-500"
                        }
                      >
                        {customer.company ?? customer.email}
                      </AltairTableSecondaryText>
                    }
                  />
                  <AltairTableCell>
                    <CustomerStatusBadge status={customer.status} />
                  </AltairTableCell>
                  <AltairTableCell
                    className={northStar ? "customer-north-star-location-cell" : "text-slate-600"}
                  >
                    {customer.city}, {customer.state}
                  </AltairTableCell>
                  <AltairTableCell
                    align="right"
                    className={
                      northStar
                        ? "customer-north-star-jobs-cell"
                        : "font-medium text-slate-900"
                    }
                  >
                    {customer.totalJobs}
                  </AltairTableCell>
                  {showRevenueStats ? (
                    <AltairTableCell
                      align="right"
                      className={
                        northStar
                          ? "customer-north-star-revenue-cell"
                          : "font-medium text-slate-900"
                      }
                    >
                      {formatCurrency(customer.totalRevenue)}
                    </AltairTableCell>
                  ) : null}
                  <AltairTableCell
                    className={`hidden lg:table-cell ${
                      northStar ? "customer-north-star-date-cell" : "text-slate-500"
                    }`}
                  >
                    {customer.lastServiceDate
                      ? formatDate(customer.lastServiceDate)
                      : "—"}
                  </AltairTableCell>
                </AltairTableRow>
              );
            })}
          </AltairTableBody>
        </AltairTable>
      </div>
    </>
  );
}
