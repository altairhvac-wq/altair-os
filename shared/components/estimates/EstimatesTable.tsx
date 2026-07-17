import { Fragment, useMemo } from "react";
import Link from "next/link";
import type { MouseEvent } from "react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { BillingWorkflowListSection } from "@/shared/lib/billing-workflow-list";
import { resolveBulkSelectionState } from "@/shared/lib/bulk-selection";
import { canSelectEstimateForBulkLifecycle } from "@/shared/lib/estimate-lifecycle";
import type { Estimate } from "@/shared/types/estimate";
import { BulkSelectCheckbox } from "@/shared/components/bulk/BulkSelectCheckbox";
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
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
import { BillingWorkflowSectionHeader } from "@/shared/components/billing/BillingWorkflowSectionHeader";
import { EstimateStatusBadge } from "./EstimateStatusBadge";
import { EstimatesMobileCardList } from "./EstimatesMobileCardList";

/**
 * Focus ring for the primary estimate-number link: the same Paper-surface
 * treatment already used for the Customers/Jobs/Invoices ledgers' primary-cell
 * links (see CustomersTable.tsx / JobsTable.tsx / InvoicesTable.tsx) — reused
 * rather than inventing a new focus token, so the ring stays non-cyan and
 * visible in both themes.
 */
const estimateNumberLinkFocusClass =
  "hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated";

function handleEstimateLinkClick(event: MouseEvent<HTMLAnchorElement>) {
  event.stopPropagation();
}

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
        <AltairTable className="min-w-[720px]">
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
                      ariaLabel="Select all estimates on this page"
                      onChange={(checked) => onToggleAllVisible?.(checked)}
                      variant={northStar ? "northStar" : "default"}
                    />
                  ) : null}
                </AltairTableHead>
              ) : null}
              <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                Estimate
              </AltairTableHead>
              <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                Customer
              </AltairTableHead>
              <AltairTableHead
                className={`hidden md:table-cell ${northStar ? lt.tableHeaderCell : ""}`}
              >
                Line items
              </AltairTableHead>
              <AltairTableHead
                className={`hidden lg:table-cell ${northStar ? lt.tableHeaderCell : ""}`}
              >
                Valid until
              </AltairTableHead>
              <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                Total
              </AltairTableHead>
              <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                Status
              </AltairTableHead>
            </AltairTableRow>
          </AltairTableHeader>
          <AltairTableBody>
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
                    <AltairTableRow
                      key={estimate.id}
                      selected={isSelected}
                      onClick={() => onSelect(estimate)}
                      className={northStar ? lt.tableRow : undefined}
                    >
                      {selectionEnabled ? (
                        <AltairTableCell>
                          {isSelectable ? (
                            <BulkSelectCheckbox
                              checked={isSelected}
                              ariaLabel={`Select estimate ${estimate.estimateNumber}`}
                              onChange={() => onToggleSelection?.(estimate.id)}
                              variant={northStar ? "northStar" : "default"}
                            />
                          ) : null}
                        </AltairTableCell>
                      ) : null}
                      <AltairTablePrimaryCell
                        primary={
                          <Link
                            href={`/estimates/${estimate.id}`}
                            onClick={handleEstimateLinkClick}
                            className={
                              northStar
                                ? `${lt.tablePrimaryText} ${estimateNumberLinkFocusClass}`
                                : `font-semibold text-slate-900 ${estimateNumberLinkFocusClass}`
                            }
                          >
                            {estimate.estimateNumber}
                          </Link>
                        }
                        secondary={
                          <AltairTableSecondaryText
                            className={
                              northStar ? lt.tableMutedText : "text-xs text-slate-500"
                            }
                          >
                            {formatDate(estimate.createdAt)}
                          </AltairTableSecondaryText>
                        }
                      />
                      <AltairTableCell>
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
                      </AltairTableCell>
                      <AltairTableCell
                        className={`hidden md:table-cell ${
                          northStar ? "estimate-north-star-meta-cell" : "text-slate-600"
                        }`}
                      >
                        {lineItemCount} {lineItemCount === 1 ? "item" : "items"}
                      </AltairTableCell>
                      <AltairTableCell
                        className={`hidden lg:table-cell ${
                          northStar ? "estimate-north-star-date-cell" : "text-slate-600"
                        }`}
                      >
                        {estimate.validUntil
                          ? formatDate(estimate.validUntil)
                          : "—"}
                      </AltairTableCell>
                      <AltairTableCell
                        className={
                          northStar ? lt.tableMetricText : "font-semibold text-slate-900"
                        }
                      >
                        {formatCurrency(estimate.total)}
                      </AltairTableCell>
                      <AltairTableCell>
                        <EstimateStatusBadge status={estimate.status} />
                      </AltairTableCell>
                    </AltairTableRow>
                  );
                })}
              </Fragment>
            ))}
          </AltairTableBody>
        </AltairTable>
      </div>
    </>
  );
}
