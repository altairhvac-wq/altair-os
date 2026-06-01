import { Fragment, useEffect, useMemo, useRef, type ChangeEvent } from "react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { BillingWorkflowListSection } from "@/shared/lib/billing-workflow-list";
import {
  canBatchSendInvoice,
  resolveInvoiceBatchSelectionState,
  type InvoiceBatchSendJobLookup,
} from "@/shared/lib/invoice-batch-send";
import type { Invoice } from "@/shared/types/invoice";
import { BillingWorkflowSectionHeader } from "@/shared/components/billing/BillingWorkflowSectionHeader";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { InvoicesMobileCardList } from "./InvoicesMobileCardList";

type InvoicesTableProps = {
  sections: BillingWorkflowListSection<Invoice>[];
  showSectionHeaders: boolean;
  onSelect: (invoice: Invoice) => void;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  jobsById?: InvoiceBatchSendJobLookup;
  onToggleSelection?: (invoiceId: string) => void;
  onToggleAllVisible?: (selectAll: boolean) => void;
};

function InvoiceSelectCheckbox({
  checked,
  indeterminate = false,
  disabled = false,
  ariaLabel,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  onChange: (checked: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label
      className="flex min-h-10 shrink-0 items-center sm:min-h-0"
      onClick={(event) => event.stopPropagation()}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.checked)
        }
        aria-label={ariaLabel}
        className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
      />
    </label>
  );
}

export function InvoicesTable({
  sections,
  showSectionHeaders,
  onSelect,
  selectionEnabled = false,
  selectedIds,
  jobsById,
  onToggleSelection,
  onToggleAllVisible,
}: InvoicesTableProps) {
  const visibleInvoices = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections],
  );

  const headerSelection = useMemo(
    () =>
      selectionEnabled && selectedIds
        ? resolveInvoiceBatchSelectionState(selectedIds, visibleInvoices, jobsById)
        : null,
    [jobsById, selectedIds, selectionEnabled, visibleInvoices],
  );

  const tableColumnCount = selectionEnabled ? 8 : 7;

  return (
    <>
      <InvoicesMobileCardList
        sections={sections}
        showSectionHeaders={showSectionHeaders}
        onSelect={onSelect}
        selectionEnabled={selectionEnabled}
        selectedIds={selectedIds}
        jobsById={jobsById}
        onToggleSelection={onToggleSelection}
      />

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100/90 bg-slate-50/50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {selectionEnabled ? (
                <th className="w-10 admin-table-cell">
                  {headerSelection && headerSelection.selectableCount > 0 ? (
                    <InvoiceSelectCheckbox
                      checked={headerSelection.allSelected}
                      indeterminate={headerSelection.someSelected}
                      ariaLabel="Select all sendable invoices on this page"
                      onChange={(checked) => onToggleAllVisible?.(checked)}
                    />
                  ) : null}
                </th>
              ) : null}
              <th className="admin-table-cell">Invoice</th>
              <th className="admin-table-cell">Customer</th>
              <th className="hidden admin-table-cell lg:table-cell">Job</th>
              <th className="hidden admin-table-cell xl:table-cell">
                Due date
              </th>
              <th className="admin-table-cell">Total</th>
              <th className="hidden admin-table-cell sm:table-cell">Balance</th>
              <th className="admin-table-cell">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sections.map((section) => (
              <Fragment key={section.id}>
                {showSectionHeaders ? (
                  <BillingWorkflowSectionHeader
                    label={section.label}
                    count={section.items.length}
                    variant="table"
                    colSpan={tableColumnCount}
                  />
                ) : null}
                {section.items.map((invoice) => {
                  const isSelectable =
                    selectionEnabled &&
                    canBatchSendInvoice(invoice, jobsById);
                  const isSelected = selectedIds?.has(invoice.id) ?? false;

                  return (
                    <tr
                      key={invoice.id}
                      onClick={() => onSelect(invoice)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                        isSelected ? "bg-cyan-50/60" : ""
                      }`}
                    >
                      {selectionEnabled ? (
                        <td className="admin-table-cell">
                          {isSelectable ? (
                            <InvoiceSelectCheckbox
                              checked={isSelected}
                              ariaLabel={`Select invoice ${invoice.invoiceNumber}`}
                              onChange={() => onToggleSelection?.(invoice.id)}
                            />
                          ) : null}
                        </td>
                      ) : null}
                      <td className="admin-table-cell">
                        <p className="font-semibold text-slate-900">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(invoice.issueDate)}
                        </p>
                      </td>
                      <td className="admin-table-cell">
                        <p className="truncate font-medium text-slate-900">
                          {invoice.customerName}
                        </p>
                      </td>
                      <td className="hidden admin-table-cell text-slate-600 lg:table-cell">
                        {invoice.jobNumber ?? "—"}
                      </td>
                      <td className="hidden admin-table-cell text-slate-600 xl:table-cell">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="admin-table-cell font-semibold text-slate-900">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="hidden admin-table-cell font-medium text-slate-700 sm:table-cell">
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
