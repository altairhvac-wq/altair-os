import { adminListRowClass, adminListRowWrapSelectedClass } from "@/shared/lib/admin-density";
import type { BillingWorkflowListSection } from "@/shared/lib/billing-workflow-list";
import { canSelectEstimateForBulkLifecycle } from "@/shared/lib/estimate-lifecycle";
import { ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { Estimate } from "@/shared/types/estimate";
import { BulkSelectCheckbox } from "@/shared/components/bulk/BulkSelectCheckbox";
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
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
  northStar?: boolean;
};

export function EstimatesMobileCardList({
  sections,
  showSectionHeaders,
  onSelect,
  canManageCustomers = false,
  selectionEnabled = false,
  selectedIds,
  onToggleSelection,
  northStar = false,
}: EstimatesMobileCardListProps) {
  return (
    <ul
      className={`md:hidden ${
        northStar
          ? "estimate-north-star-mobile-list divide-y divide-[rgba(138,99,36,0.12)]"
          : "divide-y divide-slate-100"
      }`}
    >
      {sections.map((section) => (
        <li key={section.id} className="list-none">
          {showSectionHeaders ? (
            <BillingWorkflowSectionHeader
              label={section.label}
              count={section.items.length}
              northStar={northStar}
            />
          ) : null}

          <ul
            className={
              northStar
                ? "divide-y divide-[rgba(138,99,36,0.12)]"
                : "divide-y divide-slate-100"
            }
          >
            {section.items.map((estimate) => {
              const isSelectable =
                selectionEnabled &&
                canSelectEstimateForBulkLifecycle(estimate);
              const isSelected = selectedIds?.has(estimate.id) ?? false;

              return (
                <li key={estimate.id}>
                  <div
                    className={`flex items-stretch ${
                      isSelected
                        ? northStar
                          ? "estimate-north-star-row-selected"
                          : adminListRowWrapSelectedClass
                        : ""
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
                              variant={northStar ? "northStar" : "default"}
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
                      className={`${
                        northStar
                          ? "flex w-full min-w-0 items-start gap-2.5"
                          : adminListRowClass
                      } min-w-0 flex-1 px-3 py-3 text-left transition-colors`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={
                              northStar
                                ? `truncate ${lt.tablePrimaryText}`
                                : "truncate text-sm font-bold text-slate-900"
                            }
                          >
                            {estimate.estimateNumber}
                          </p>
                          <EstimateStatusBadge status={estimate.status} />
                        </div>
                        <p className="mt-0.5 truncate text-sm">
                          <CustomerNameLink
                            customerId={estimate.customerId}
                            customerName={estimate.customerName}
                            canManageCustomers={canManageCustomers}
                            linkClassName={
                              northStar
                                ? "text-sm font-medium text-[#4F4638] transition-colors hover:text-[#8A6324]"
                                : "text-sm text-slate-600 transition-colors hover:text-cyan-700"
                            }
                            stopRowNavigation
                          />
                        </p>
                        <p
                          className={
                            northStar
                              ? `mt-1 ${lt.tableMutedText}`
                              : "mt-1 text-xs text-slate-500"
                          }
                        >
                          {formatDate(estimate.createdAt)}
                          {estimate.jobNumber ? ` · ${estimate.jobNumber}` : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 pt-0.5">
                        <p
                          className={
                            northStar
                              ? lt.tableMetricText
                              : "text-sm font-semibold text-slate-900"
                          }
                        >
                          {formatCurrency(estimate.total)}
                        </p>
                        <ChevronRight
                          className={
                            northStar ? "h-4 w-4 text-[#8A6324]" : "h-4 w-4 text-slate-300"
                          }
                        />
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
