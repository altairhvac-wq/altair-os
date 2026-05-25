import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { Invoice } from "@/shared/types/invoice";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

type InvoicesTableProps = {
  invoices: Invoice[];
  onSelect: (invoice: Invoice) => void;
};

export function InvoicesTable({ invoices, onSelect }: InvoicesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Invoice</th>
            <th className="px-4 py-3">Customer</th>
            <th className="hidden px-4 py-3 md:table-cell">Job</th>
            <th className="hidden px-4 py-3 lg:table-cell">Due date</th>
            <th className="px-4 py-3">Total</th>
            <th className="hidden px-4 py-3 sm:table-cell">Balance</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {invoices.map((invoice) => (
            <tr
              key={invoice.id}
              onClick={() => onSelect(invoice)}
              className="cursor-pointer transition-colors hover:bg-slate-50"
            >
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-900">
                  {invoice.invoiceNumber}
                </p>
                <p className="text-xs text-slate-500">
                  {formatDate(invoice.issueDate)}
                </p>
              </td>
              <td className="px-4 py-3">
                <p className="truncate font-medium text-slate-900">
                  {invoice.customerName}
                </p>
              </td>
              <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                {invoice.jobNumber ?? "—"}
              </td>
              <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">
                {formatDate(invoice.dueDate)}
              </td>
              <td className="px-4 py-3 font-semibold text-slate-900">
                {formatCurrency(invoice.total)}
              </td>
              <td className="hidden px-4 py-3 font-medium text-slate-700 sm:table-cell">
                {formatCurrency(invoice.balanceDue)}
              </td>
              <td className="px-4 py-3">
                <InvoiceStatusBadge status={invoice.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
