import { AlertCircle, Clock, Receipt } from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { OutstandingInvoice } from "@/shared/types/analytics";

type OutstandingInvoicesPanelProps = {
  invoices: OutstandingInvoice[];
  totalOutstanding: number;
};

const statusStyles = {
  overdue: {
    label: "Overdue",
    className: "bg-rose-50 text-rose-700",
    icon: AlertCircle,
  },
  "due-soon": {
    label: "Due soon",
    className: "bg-amber-50 text-amber-700",
    icon: Clock,
  },
  sent: {
    label: "Sent",
    className: "bg-slate-100 text-slate-600",
    icon: Receipt,
  },
};

export function OutstandingInvoicesPanel({
  invoices,
  totalOutstanding,
}: OutstandingInvoicesPanelProps) {
  return (
    <section className="flex flex-col overflow-hidden admin-card">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-amber-600" />
              <h3 className="text-base font-bold text-slate-900">
                Outstanding invoices
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Open balances requiring collection follow-up
            </p>
          </div>
          <p className="text-lg font-black text-amber-700">
            {formatCurrency(totalOutstanding)}
          </p>
        </div>
      </div>

      <ul className="divide-y divide-slate-50">
        {invoices.map((invoice) => {
          const status = statusStyles[invoice.status];
          const StatusIcon = status.icon;

          return (
            <li
              key={invoice.id}
              className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">
                    {invoice.invoiceNumber}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${status.className}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-600">
                  {invoice.customerName}
                </p>
                <p className="text-xs text-slate-400">
                  Due {formatDate(invoice.dueDate)}
                  {invoice.daysOverdue > 0
                    ? ` · ${invoice.daysOverdue} days overdue`
                    : null}
                </p>
              </div>
              <p className="shrink-0 text-base font-black text-slate-900">
                {formatCurrency(invoice.amount)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
