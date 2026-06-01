import { adminListRowClass } from "@/shared/lib/admin-density";
import type { BillingWorkflowListSection } from "@/shared/lib/billing-workflow-list";
import {
  canBatchSendInvoice,
  type InvoiceBatchSendJobLookup,
} from "@/shared/lib/invoice-batch-send";
import { ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { Invoice } from "@/shared/types/invoice";
import { BillingWorkflowSectionHeader } from "@/shared/components/billing/BillingWorkflowSectionHeader";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

type InvoicesMobileCardListProps = {
  sections: BillingWorkflowListSection<Invoice>[];
  showSectionHeaders: boolean;
  onSelect: (invoice: Invoice) => void;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  jobsById?: InvoiceBatchSendJobLookup;
  onToggleSelection?: (invoiceId: string) => void;
};

export function InvoicesMobileCardList({
  sections,
  showSectionHeaders,
  onSelect,
  selectionEnabled = false,
  selectedIds,
  jobsById,
  onToggleSelection,
}: InvoicesMobileCardListProps) {
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
            {section.items.map((invoice) => {
              const isSelectable =
                selectionEnabled &&
                canBatchSendInvoice(invoice, jobsById);
              const isSelected = selectedIds?.has(invoice.id) ?? false;

              return (
                <li key={invoice.id}>
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
                              onChange={() => onToggleSelection?.(invoice.id)}
                              aria-label={`Select invoice ${invoice.invoiceNumber}`}
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
                      onClick={() => onSelect(invoice)}
                      className={`${adminListRowClass} min-w-0 flex-1`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {invoice.invoiceNumber}
                          </p>
                          <InvoiceStatusBadge status={invoice.status} />
                        </div>
                        <p className="mt-0.5 truncate text-sm text-slate-600">
                          {invoice.customerName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Due {formatDate(invoice.dueDate)}
                          {invoice.jobNumber ? ` · ${invoice.jobNumber}` : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 pt-0.5">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">
                            {formatCurrency(invoice.total)}
                          </p>
                          {invoice.balanceDue > 0 ? (
                            <p className="text-xs font-medium text-amber-700">
                              {formatCurrency(invoice.balanceDue)} due
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400">Paid</p>
                          )}
                        </div>
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
