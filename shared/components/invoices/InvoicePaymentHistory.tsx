import { formatCurrency, formatDate } from "@/shared/types/customer";
import { resolveAttributionDisplayLabel } from "@/shared/lib/profile-attribution";
import {
  formatPaymentMethod,
  type InvoicePayment,
} from "@/shared/types/invoice-payment";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

type InvoicePaymentHistoryProps = {
  payments: InvoicePayment[];
  northStar?: boolean;
};

function formatRecordedByLabel(payment: InvoicePayment): string {
  return resolveAttributionDisplayLabel({
    name: payment.recordedByName,
    subjectUserId: payment.recordedById,
  });
}

export function InvoicePaymentHistory({
  payments,
  northStar = false,
}: InvoicePaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <div
        className={
          northStar
            ? dt.emptyState
            : "rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center"
        }
      >
        <p className={northStar ? `text-sm font-medium ${dt.ivoryCardPrimary}` : "text-sm font-medium text-slate-700"}>
          No payments recorded
        </p>
        <p className={northStar ? `mt-1 text-xs ${dt.ivoryCardMuted}` : "mt-1 text-xs text-slate-500"}>
          Payments you record will show up here with date, amount, and method.
        </p>
      </div>
    );
  }

  const mobileListClass = northStar
    ? "divide-y divide-[rgba(138,99,36,0.12)] rounded-lg border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] sm:hidden"
    : "divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white sm:hidden";
  const tableWrapClass = northStar
    ? "hidden overflow-hidden rounded-lg border border-[rgba(138,99,36,0.12)] sm:block"
    : "hidden overflow-hidden rounded-xl border border-slate-200 sm:block";
  const headerCellClass = northStar
    ? "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#4F4638]"
    : "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <>
      <ul className={mobileListClass}>
        {payments.map((payment) => {
          const recordedByLabel = formatRecordedByLabel(payment);

          return (
            <li key={payment.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={northStar ? "text-sm font-semibold text-emerald-800" : "text-sm font-semibold text-emerald-700"}>
                    {formatCurrency(payment.amount)}
                  </p>
                  <p className={northStar ? `mt-0.5 text-sm ${dt.ivoryCardSecondary}` : "mt-0.5 text-sm text-slate-700"}>
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
                    <p className="mt-1 break-words text-xs text-slate-500">
                      {payment.notes}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className={tableWrapClass}>
        <table className={`min-w-full ${northStar ? "divide-y divide-[rgba(138,99,36,0.12)]" : "divide-y divide-slate-200"}`}>
          <thead className={northStar ? "bg-[#EFE4CB]" : "bg-white"}>
            <tr>
              <th className={headerCellClass}>
                Date
              </th>
              <th className={headerCellClass}>
                Amount
              </th>
              <th className={headerCellClass}>
                Method
              </th>
              <th className={`hidden ${headerCellClass} md:table-cell`}>
                Recorded by
              </th>
              <th className={`hidden ${headerCellClass} lg:table-cell`}>
                Reference
              </th>
              <th className={`hidden ${headerCellClass} xl:table-cell`}>
                Notes
              </th>
            </tr>
          </thead>
          <tbody className={northStar ? "divide-y divide-[rgba(138,99,36,0.12)] bg-[#FFF9EA]" : "divide-y divide-slate-100 bg-white"}>
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
