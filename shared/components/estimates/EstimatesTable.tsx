import { Fragment, useEffect, useMemo, useRef, type ChangeEvent } from "react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { BillingWorkflowListSection } from "@/shared/lib/billing-workflow-list";
import {
  canBatchSendEstimate,
  resolveEstimateBatchSelectionState,
  type EstimateBatchSendJobLookup,
} from "@/shared/lib/estimate-batch-send";
import type { Estimate } from "@/shared/types/estimate";
import { BillingWorkflowSectionHeader } from "@/shared/components/billing/BillingWorkflowSectionHeader";
import { EstimateStatusBadge } from "./EstimateStatusBadge";
import { EstimatesMobileCardList } from "./EstimatesMobileCardList";

type EstimatesTableProps = {
  sections: BillingWorkflowListSection<Estimate>[];
  showSectionHeaders: boolean;
  onSelect: (estimate: Estimate) => void;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  jobsById?: EstimateBatchSendJobLookup;
  onToggleSelection?: (estimateId: string) => void;
  onToggleAllVisible?: (selectAll: boolean) => void;
};

function EstimateSelectCheckbox({
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

export function EstimatesTable({
  sections,
  showSectionHeaders,
  onSelect,
  selectionEnabled = false,
  selectedIds,
  jobsById,
  onToggleSelection,
  onToggleAllVisible,
}: EstimatesTableProps) {
  const visibleEstimates = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections],
  );

  const headerSelection = useMemo(
    () =>
      selectionEnabled && selectedIds
        ? resolveEstimateBatchSelectionState(
            selectedIds,
            visibleEstimates,
            jobsById,
          )
        : null,
    [jobsById, selectedIds, selectionEnabled, visibleEstimates],
  );

  const tableColumnCount = selectionEnabled ? 7 : 6;

  return (
    <>
      <EstimatesMobileCardList
        sections={sections}
        showSectionHeaders={showSectionHeaders}
        onSelect={onSelect}
        selectionEnabled={selectionEnabled}
        selectedIds={selectedIds}
        jobsById={jobsById}
        onToggleSelection={onToggleSelection}
      />

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100/90 bg-slate-50/50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {selectionEnabled ? (
                <th className="w-10 admin-table-cell">
                  {headerSelection && headerSelection.selectableCount > 0 ? (
                    <EstimateSelectCheckbox
                      checked={headerSelection.allSelected}
                      indeterminate={headerSelection.someSelected}
                      ariaLabel="Select all sendable estimates on this page"
                      onChange={(checked) => onToggleAllVisible?.(checked)}
                    />
                  ) : null}
                </th>
              ) : null}
              <th className="admin-table-cell">Estimate</th>
              <th className="admin-table-cell">Customer</th>
              <th className="hidden admin-table-cell md:table-cell">
                Line items
              </th>
              <th className="hidden admin-table-cell lg:table-cell">
                Valid until
              </th>
              <th className="admin-table-cell">Total</th>
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
                {section.items.map((estimate) => {
                  const lineItemCount =
                    estimate.lineItemCount ?? estimate.lineItems.length;
                  const isSelectable =
                    selectionEnabled &&
                    canBatchSendEstimate(estimate, jobsById);
                  const isSelected = selectedIds?.has(estimate.id) ?? false;

                  return (
                    <tr
                      key={estimate.id}
                      onClick={() => onSelect(estimate)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                        isSelected ? "bg-cyan-50/60" : ""
                      }`}
                    >
                      {selectionEnabled ? (
                        <td className="admin-table-cell">
                          {isSelectable ? (
                            <EstimateSelectCheckbox
                              checked={isSelected}
                              ariaLabel={`Select estimate ${estimate.estimateNumber}`}
                              onChange={() => onToggleSelection?.(estimate.id)}
                            />
                          ) : null}
                        </td>
                      ) : null}
                      <td className="admin-table-cell">
                        <p className="font-semibold text-slate-900">
                          {estimate.estimateNumber}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(estimate.createdAt)}
                        </p>
                      </td>
                      <td className="admin-table-cell">
                        <p className="truncate font-medium text-slate-900">
                          {estimate.customerName}
                        </p>
                      </td>
                      <td className="hidden admin-table-cell text-slate-600 md:table-cell">
                        {lineItemCount} {lineItemCount === 1 ? "item" : "items"}
                      </td>
                      <td className="hidden admin-table-cell text-slate-600 lg:table-cell">
                        {estimate.validUntil
                          ? formatDate(estimate.validUntil)
                          : "—"}
                      </td>
                      <td className="admin-table-cell font-semibold text-slate-900">
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
