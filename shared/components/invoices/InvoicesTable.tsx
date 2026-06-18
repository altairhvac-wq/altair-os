import { Fragment, useMemo } from "react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { BillingWorkflowListSection } from "@/shared/lib/billing-workflow-list";
import { resolveBulkSelectionState } from "@/shared/lib/bulk-selection";
import { canSelectInvoiceForBulkLifecycle } from "@/shared/lib/invoice-lifecycle";
import {
  adminTableRowClass,
  adminTableRowSelectedClass,
} from "@/shared/lib/admin-density";
import type { Invoice } from "@/shared/types/invoice";
import { BulkSelectCheckbox } from "@/shared/components/bulk/BulkSelectCheckbox";
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { BillingWorkflowSectionHeader } from "@/shared/components/billing/BillingWorkflowSectionHeader";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { InvoicesMobileCardList } from "./InvoicesMobileCardList";

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
      />

      <div
        className={`hidden overflow-x-auto md:block${
          northStar ? " invoice-north-star-ledger" : ""
        }`}
      >
        <table className="w-full min-w-[760px] text-left text-sm">
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
                      ariaLabel="Select all invoices on this page"
                      onChange={(checked) => onToggleAllVisible?.(checked)}
                      variant={northStar ? "northStar" : "default"}
                    />
                  ) : null}
                </th>
              ) : null}
              <th className={northStar ? lt.tableHeaderCell : "admin-table-cell"}>
                Invoice
              </th>
              <th className={northStar ? lt.tableHeaderCell : "admin-table-cell"}>
                Customer
              </th>
              <th
                className={`hidden ${northStar ? lt.tableHeaderCell : "admin-table-cell"} lg:table-cell`}
              >
                Job
              </th>
              <th
                className={`hidden ${northStar ? lt.tableHeaderCell : "admin-table-cell"} xl:table-cell`}
              >
                Due date
              </th>
              <th className={northStar ? lt.tableHeaderCell : "admin-table-cell"}>
                Total
              </th>
              <th
                className={`hidden ${northStar ? lt.tableHeaderCell : "admin-table-cell"} sm:table-cell`}
              >
                Balance
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
                {section.items.map((invoice) => {
                  const isSelectable =
                    selectionEnabled &&
                    canSelectInvoiceForBulkLifecycle(invoice);
                  const isSelected = selectedIds?.has(invoice.id) ?? false;

                  return (
                    <tr
                      key={invoice.id}
                      onClick={() => onSelect(invoice)}
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
                              ariaLabel={`Select invoice ${invoice.invoiceNumber}`}
                              onChange={() => onToggleSelection?.(invoice.id)}
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
                          {invoice.invoiceNumber}
                        </p>
                        <p
                          className={
                            northStar ? lt.tableMutedText : "text-xs text-slate-500"
                          }
                        >
                          {formatDate(invoice.issueDate)}
                        </p>
                      </td>
                      <td className="admin-table-cell">
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
                      </td>
                      <td
                        className={`hidden admin-table-cell lg:table-cell ${
                          northStar ? "invoice-north-star-meta-cell" : "text-slate-600"
                        }`}
                      >
                        {invoice.jobNumber ?? "—"}
                      </td>
                      <td
                        className={`hidden admin-table-cell xl:table-cell ${
                          northStar ? "invoice-north-star-date-cell" : "text-slate-600"
                        }`}
                      >
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td
                        className={`admin-table-cell ${
                          northStar ? lt.tableMetricText : "font-semibold text-slate-900"
                        }`}
                      >
                        {formatCurrency(invoice.total)}
                      </td>
                      <td
                        className={`hidden admin-table-cell sm:table-cell ${
                          northStar
                            ? "invoice-north-star-balance-cell font-semibold tabular-nums"
                            : "font-medium text-slate-700"
                        }`}
                      >
                        {formatCurrency(invoice.balanceDue)}
                      </td>
                      <td className="admin-table-cell">
                        <InvoiceStatusBadge status={invoice.status} />
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
