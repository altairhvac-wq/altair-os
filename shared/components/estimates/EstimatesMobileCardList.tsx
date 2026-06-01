import { adminListRowClass } from "@/shared/lib/admin-density";
import type { BillingWorkflowListSection } from "@/shared/lib/billing-workflow-list";
import {
  canBatchSendEstimate,
  type EstimateBatchSendJobLookup,
} from "@/shared/lib/estimate-batch-send";
import { ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { Estimate } from "@/shared/types/estimate";
import { BillingWorkflowSectionHeader } from "@/shared/components/billing/BillingWorkflowSectionHeader";
import { EstimateStatusBadge } from "./EstimateStatusBadge";

type EstimatesMobileCardListProps = {
  sections: BillingWorkflowListSection<Estimate>[];
  showSectionHeaders: boolean;
  onSelect: (estimate: Estimate) => void;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  jobsById?: EstimateBatchSendJobLookup;
  onToggleSelection?: (estimateId: string) => void;
};

export function EstimatesMobileCardList({
  sections,
  showSectionHeaders,
  onSelect,
  selectionEnabled = false,
  selectedIds,
  jobsById,
  onToggleSelection,
}: EstimatesMobileCardListProps) {
  return (
    <ul className="divide-y divide-slate-100 md:hidden">
      {sections.map((section) => (
        <li key={section.id} className="list-none">
          {showSectionHeaders ? (
            <BillingWorkflowSectionHeader
              label={section.label}
              count={section.items.length}
            />
          ) : null}

          <ul className="divide-y divide-slate-100">
            {section.items.map((estimate) => {
              const isSelectable =
                selectionEnabled &&
                canBatchSendEstimate(estimate, jobsById);
              const isSelected = selectedIds?.has(estimate.id) ?? false;

              return (
                <li key={estimate.id}>
                  <div
                    className={`flex items-stretch ${
                      isSelected ? "bg-cyan-50/60" : ""
                    }`}
                  >
                    {selectionEnabled ? (
                      <div className="flex shrink-0 items-center pl-3">
                        {isSelectable ? (
                          <label
                            className="flex min-h-11 min-w-11 items-center justify-center"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onToggleSelection?.(estimate.id)}
                              aria-label={`Select estimate ${estimate.estimateNumber}`}
                              className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            />
                          </label>
                        ) : (
                          <div className="min-w-11" aria-hidden="true" />
                        )}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => onSelect(estimate)}
                      className={`${adminListRowClass} min-w-0 flex-1`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {estimate.estimateNumber}
                          </p>
                          <EstimateStatusBadge status={estimate.status} />
                        </div>
                        <p className="mt-0.5 truncate text-sm text-slate-600">
                          {estimate.customerName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(estimate.createdAt)}
                          {estimate.jobNumber ? ` · ${estimate.jobNumber}` : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 pt-0.5">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(estimate.total)}
                        </p>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}
