import { adminListRowClass } from "@/shared/lib/admin-density";
import { ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { Invoice } from "@/shared/types/invoice";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

type InvoicesMobileCardListProps = {
  invoices: Invoice[];
  onSelect: (invoice: Invoice) => void;
};

export function InvoicesMobileCardList({
  invoices,
  onSelect,
}: InvoicesMobileCardListProps) {
  return (
    <ul className="divide-y divide-slate-100 md:hidden">
      {invoices.map((invoice) => (
        <li key={invoice.id}>
          <button
            type="button"
            onClick={() => onSelect(invoice)}
            className={adminListRowClass}
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
        </li>
      ))}
    </ul>
  );
}
