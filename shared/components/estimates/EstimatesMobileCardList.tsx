import { adminListRowClass, adminListRowWrapSelectedClass } from "@/shared/lib/admin-density";
import type { BillingWorkflowListSection } from "@/shared/lib/billing-workflow-list";
import { canSelectEstimateForBulkLifecycle } from "@/shared/lib/estimate-lifecycle";
import { ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { Estimate } from "@/shared/types/estimate";
import { BulkSelectCheckbox } from "@/shared/components/bulk/BulkSelectCheckbox";
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import { BillingWorkflowSectionHeader } from "@/shared/components/billing/BillingWorkflowSectionHeader";
import { EstimateStatusBadge } from "./EstimateStatusBadge";

type EstimatesMobileCardListProps = {
  sections: BillingWorkflowListSection<Estimate>[];
  showSectionHeaders: boolean;
  onSelect: (estimate: Estimate) => void;
  canManageCustomers?: boolean;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelection?: (estimateId: string) => void;
};

export function EstimatesMobileCardList({
  sections,
  showSectionHeaders,
  onSelect,
  canManageCustomers = false,
  selectionEnabled = false,
  selectedIds,
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
                canSelectEstimateForBulkLifecycle(estimate);
              const isSelected = selectedIds?.has(estimate.id) ?? false;

              return (
                <li key={estimate.id}>
                  <div
                    className={`flex items-stretch ${
                      isSelected ? adminListRowWrapSelectedClass : ""
                    }`}
                  >
                    {selectionEnabled ? (
                      <div className="flex shrink-0 items-center pl-3">
                        {isSelectable ? (
                          <label
                            className="flex min-h-11 min-w-11 items-center justify-center"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <BulkSelectCheckbox
                              checked={isSelected}
                              ariaLabel={`Select estimate ${estimate.estimateNumber}`}
                              onChange={() => onToggleSelection?.(estimate.id)}
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
                          <CustomerNameLink
                            customerId={estimate.customerId}
                            customerName={estimate.customerName}
                            canManageCustomers={canManageCustomers}
                            linkClassName="text-sm text-slate-600 transition-colors hover:text-cyan-700"
                            stopRowNavigation
                          />
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
