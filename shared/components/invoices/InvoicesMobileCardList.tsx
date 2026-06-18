import { adminListRowClass, adminListRowWrapSelectedClass } from "@/shared/lib/admin-density";
import type { BillingWorkflowListSection } from "@/shared/lib/billing-workflow-list";
import { canSelectInvoiceForBulkLifecycle } from "@/shared/lib/invoice-lifecycle";
import { ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { Invoice } from "@/shared/types/invoice";
import { BulkSelectCheckbox } from "@/shared/components/bulk/BulkSelectCheckbox";
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { BillingWorkflowSectionHeader } from "@/shared/components/billing/BillingWorkflowSectionHeader";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

type InvoicesMobileCardListProps = {
  sections: BillingWorkflowListSection<Invoice>[];
  showSectionHeaders: boolean;
  onSelect: (invoice: Invoice) => void;
  canManageCustomers?: boolean;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelection?: (invoiceId: string) => void;
  northStar?: boolean;
};

export function InvoicesMobileCardList({
  sections,
  showSectionHeaders,
  onSelect,
  canManageCustomers = false,
  selectionEnabled = false,
  selectedIds,
  onToggleSelection,
  northStar = false,
}: InvoicesMobileCardListProps) {
  return (
    <ul
      className={`md:hidden ${
        northStar ? "invoice-north-star-mobile-list divide-y divide-[rgba(138,99,36,0.12)]" : "divide-y divide-slate-100"
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
            {section.items.map((invoice) => {
              const isSelectable =
                selectionEnabled &&
                canSelectInvoiceForBulkLifecycle(invoice);
              const isSelected = selectedIds?.has(invoice.id) ?? false;

              return (
                <li key={invoice.id}>
                  <div
                    className={`flex items-stretch ${
                      isSelected
                        ? northStar
                          ? "invoice-north-star-row-selected"
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
                              ariaLabel={`Select invoice ${invoice.invoiceNumber}`}
                              onChange={() => onToggleSelection?.(invoice.id)}
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
                      onClick={() => onSelect(invoice)}
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
                            {invoice.invoiceNumber}
                          </p>
                          <InvoiceStatusBadge status={invoice.status} />
                        </div>
                        <p className="mt-0.5 truncate text-sm">
                          <CustomerNameLink
                            customerId={invoice.customerId}
                            customerName={invoice.customerName}
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
                          Due {formatDate(invoice.dueDate)}
                          {invoice.jobNumber ? ` · ${invoice.jobNumber}` : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 pt-0.5">
                        <div className="text-right">
                          <p
                            className={
                              northStar
                                ? lt.tableMetricText
                                : "text-sm font-semibold text-slate-900"
                            }
                          >
                            {formatCurrency(invoice.total)}
                          </p>
                          {invoice.balanceDue > 0 ? (
                            <p
                              className={
                                northStar
                                  ? "text-xs font-semibold tabular-nums text-[#9A3412]"
                                  : "text-xs font-medium text-amber-700"
                              }
                            >
                              {formatCurrency(invoice.balanceDue)} due
                            </p>
                          ) : (
                            <p
                              className={
                                northStar ? "text-xs text-[#6B6255]" : "text-xs text-slate-400"
                              }
                            >
                              Paid
                            </p>
                          )}
                        </div>
                        <ChevronRight
                          className={
                            northStar ? "h-4 w-4 text-[#8A6324]/50" : "h-4 w-4 text-slate-300"
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
