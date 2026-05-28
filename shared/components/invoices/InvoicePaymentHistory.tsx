import { formatCurrency, formatDate } from "@/shared/types/customer";
import { resolveAttributionDisplayLabel } from "@/shared/lib/profile-attribution";
import {
  formatPaymentMethod,
  type InvoicePayment,
} from "@/shared/types/invoice-payment";

type InvoicePaymentHistoryProps = {
  payments: InvoicePayment[];
};

function formatRecordedByLabel(payment: InvoicePayment): string {
  return resolveAttributionDisplayLabel({
    name: payment.recordedByName,
    subjectUserId: payment.recordedById,
  });
}

export function InvoicePaymentHistory({ payments }: InvoicePaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
        <p className="text-sm font-medium text-slate-700">No payments recorded</p>
        <p className="mt-1 text-xs text-slate-500">
          Payments you record will show up here with date, amount, and method.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white sm:hidden">
        {payments.map((payment) => {
          const recordedByLabel = formatRecordedByLabel(payment);

          return (
            <li key={payment.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-700">
                    {formatCurrency(payment.amount)}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-700">
                    {formatPaymentMethod(payment.paymentMethod)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(payment.paymentDate)}
                    {recordedByLabel !== "—" ? ` · ${recordedByLabel}` : ""}
                  </p>
                  {payment.reference ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Ref {payment.reference}
                    </p>
                  ) : null}
                  {payment.notes ? (
                    <p className="mt-1 text-xs text-slate-500">{payment.notes}</p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-hidden rounded-xl border border-slate-200 sm:block">
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
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell">
                Recorded by
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 lg:table-cell">
                Reference
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 xl:table-cell">
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
                <td className="hidden px-4 py-3 text-sm text-slate-600 md:table-cell">
                  {formatRecordedByLabel(payment)}
                </td>
                <td className="hidden px-4 py-3 text-sm text-slate-600 lg:table-cell">
                  {payment.reference ?? "—"}
                </td>
                <td className="hidden px-4 py-3 text-sm text-slate-600 xl:table-cell">
                  {payment.notes ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
