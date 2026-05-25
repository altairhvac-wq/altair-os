import { formatCurrency, formatDate } from "@/shared/types/customer";
import {
  formatPaymentMethod,
  type InvoicePayment,
} from "@/shared/types/invoice-payment";

type InvoicePaymentHistoryProps = {
  payments: InvoicePayment[];
};

export function InvoicePaymentHistory({ payments }: InvoicePaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
        <p className="text-sm font-medium text-slate-700">No payments yet</p>
        <p className="mt-1 text-xs text-slate-500">
          Recorded payments will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Amount
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Method
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-cell">
              Reference
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell">
              Notes
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                {formatDate(payment.paymentDate)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-emerald-700">
                {formatCurrency(payment.amount)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                {formatPaymentMethod(payment.paymentMethod)}
              </td>
              <td className="hidden px-4 py-3 text-sm text-slate-600 sm:table-cell">
                {payment.reference ?? "—"}
              </td>
              <td className="hidden px-4 py-3 text-sm text-slate-600 md:table-cell">
                {payment.notes ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
