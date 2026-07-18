import { Fragment, useMemo } from "react";
import Link from "next/link";
import type { MouseEvent } from "react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { BillingWorkflowListSection } from "@/shared/lib/billing-workflow-list";
import { resolveBulkSelectionState } from "@/shared/lib/bulk-selection";
import { canSelectInvoiceForBulkLifecycle } from "@/shared/lib/invoice-lifecycle";
import type { Invoice } from "@/shared/types/invoice";
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
import { SearchMatchReason } from "@/shared/components/search/SearchMatchReason";
import { formatInvoiceRelationshipLine } from "@/shared/lib/documents/relationship-labels";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { InvoicesMobileCardList } from "./InvoicesMobileCardList";

/**
 * Focus ring for the primary invoice-number link: the same Paper-surface
 * treatment already used for the Customers and Jobs ledgers' primary-cell
 * links (see CustomersTable.tsx / JobsTable.tsx) — reused rather than
 * inventing a new focus token, so the ring stays non-cyan and visible in
 * both themes.
 */
const invoiceNumberLinkFocusClass =
  "hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated";

function handleInvoiceLinkClick(event: MouseEvent<HTMLAnchorElement>) {
  event.stopPropagation();
}

type InvoicesTableProps = {
  sections: BillingWorkflowListSection<Invoice>[];
  showSectionHeaders: boolean;
  onSelect: (invoice: Invoice) => void;
  canManageCustomers?: boolean;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelection?: (invoiceId: string) => void;
  onToggleAllVisible?: (selectAll: boolean) => void;
  northStar?: boolean;
  matchReasons?: Record<string, string>;
};

export function InvoicesTable({
  sections,
  showSectionHeaders,
  onSelect,
  canManageCustomers = false,
  selectionEnabled = false,
  selectedIds,
  onToggleSelection,
  onToggleAllVisible,
  northStar = false,
  matchReasons,
}: InvoicesTableProps) {
  const visibleInvoices = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections],
  );

  const headerSelection = useMemo(
    () =>
      selectionEnabled && selectedIds
        ? resolveBulkSelectionState(selectedIds, visibleInvoices)
        : null,
    [selectedIds, selectionEnabled, visibleInvoices],
  );

  const tableColumnCount = selectionEnabled ? 8 : 7;

  return (
    <>
      <InvoicesMobileCardList
        sections={sections}
        showSectionHeaders={showSectionHeaders}
        onSelect={onSelect}
        canManageCustomers={canManageCustomers}
        selectionEnabled={selectionEnabled}
        selectedIds={selectedIds}
        onToggleSelection={onToggleSelection}
        northStar={northStar}
        matchReasons={matchReasons}
      />

      <div
        className={`hidden overflow-x-auto md:block${
          northStar ? " invoice-north-star-ledger" : ""
        }`}
      >
        <AltairTable className="min-w-[760px]">
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
                      ariaLabel="Select all invoices on this page"
                      onChange={(checked) => onToggleAllVisible?.(checked)}
                      variant={northStar ? "northStar" : "default"}
                    />
                  ) : null}
                </AltairTableHead>
              ) : null}
              <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                Invoice
              </AltairTableHead>
              <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                Customer
              </AltairTableHead>
              <AltairTableHead
                className={`hidden lg:table-cell ${northStar ? lt.tableHeaderCell : ""}`}
              >
                Job
              </AltairTableHead>
              <AltairTableHead
                className={`hidden xl:table-cell ${northStar ? lt.tableHeaderCell : ""}`}
              >
                Due date
              </AltairTableHead>
              <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                Total
              </AltairTableHead>
              <AltairTableHead
                className={`hidden sm:table-cell ${northStar ? lt.tableHeaderCell : ""}`}
              >
                Balance
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
                {section.items.map((invoice) => {
                  const isSelectable =
                    selectionEnabled &&
                    canSelectInvoiceForBulkLifecycle(invoice);
                  const isSelected = selectedIds?.has(invoice.id) ?? false;

                  return (
                    <AltairTableRow
                      key={invoice.id}
                      selected={isSelected}
                      onClick={() => onSelect(invoice)}
                      className={northStar ? lt.tableRow : undefined}
                    >
                      {selectionEnabled ? (
                        <AltairTableCell>
                          {isSelectable ? (
                            <BulkSelectCheckbox
                              checked={isSelected}
                              ariaLabel={`Select invoice ${invoice.invoiceNumber}`}
                              onChange={() => onToggleSelection?.(invoice.id)}
                              variant={northStar ? "northStar" : "default"}
                            />
                          ) : null}
                        </AltairTableCell>
                      ) : null}
                      <AltairTablePrimaryCell
                        primary={
                          <Link
                            href={`/invoices/${invoice.id}`}
                            onClick={handleInvoiceLinkClick}
                            className={
                              northStar
                                ? `${lt.tablePrimaryText} ${invoiceNumberLinkFocusClass}`
                                : `font-semibold text-slate-900 ${invoiceNumberLinkFocusClass}`
                            }
                          >
                            {invoice.invoiceNumber}
                          </Link>
                        }
                        secondary={
                          <>
                            <AltairTableSecondaryText
                              className={
                                northStar
                                  ? lt.tableMutedText
                                  : "text-xs text-slate-500"
                              }
                            >
                              {formatInvoiceRelationshipLine({
                                jobNumber: invoice.jobNumber,
                                estimateNumber: invoice.estimateNumber,
                                customerName: invoice.customerName,
                              })}
                            </AltairTableSecondaryText>
                            <SearchMatchReason
                              reason={matchReasons?.[invoice.id]}
                              className={
                                northStar
                                  ? `mt-0.5 ${lt.tableMutedText}`
                                  : "mt-0.5 text-xs text-slate-500"
                              }
                            />
                          </>
                        }
                      />
                      <AltairTableCell>
                        <CustomerNameLink
                          customerId={invoice.customerId}
                          customerName={invoice.customerName}
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
                        className={`hidden lg:table-cell ${
                          northStar ? "invoice-north-star-meta-cell" : "text-slate-600"
                        }`}
                      >
                        {invoice.jobNumber ?? "—"}
                      </AltairTableCell>
                      <AltairTableCell
                        className={`hidden xl:table-cell ${
                          northStar ? "invoice-north-star-date-cell" : "text-slate-600"
                        }`}
                      >
                        {formatDate(invoice.dueDate)}
                      </AltairTableCell>
                      <AltairTableCell
                        className={
                          northStar ? lt.tableMetricText : "font-semibold text-slate-900"
                        }
                      >
                        {formatCurrency(invoice.total)}
                      </AltairTableCell>
                      <AltairTableCell
                        className={`hidden sm:table-cell ${
                          northStar
                            ? "invoice-north-star-balance-cell font-semibold tabular-nums"
                            : "font-medium text-slate-700"
                        }`}
                      >
                        {formatCurrency(invoice.balanceDue)}
                      </AltairTableCell>
                      <AltairTableCell>
                        <InvoiceStatusBadge status={invoice.status} />
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
