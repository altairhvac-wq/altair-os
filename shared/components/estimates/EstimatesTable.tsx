import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { Estimate } from "@/shared/types/estimate";
import { EstimateStatusBadge } from "./EstimateStatusBadge";
import { EstimatesMobileCardList } from "./EstimatesMobileCardList";

type EstimatesTableProps = {
  estimates: Estimate[];
  onSelect: (estimate: Estimate) => void;
};

export function EstimatesTable({ estimates, onSelect }: EstimatesTableProps) {
  return (
    <>
      <EstimatesMobileCardList estimates={estimates} onSelect={onSelect} />

      <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100/90 bg-white text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Estimate</th>
            <th className="px-4 py-3">Customer</th>
            <th className="hidden px-4 py-3 md:table-cell">Line items</th>
            <th className="hidden px-4 py-3 lg:table-cell">Valid until</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {estimates.map((estimate) => {
            const lineItemCount =
              estimate.lineItemCount ?? estimate.lineItems.length;

            return (
              <tr
                key={estimate.id}
                onClick={() => onSelect(estimate)}
                className="cursor-pointer transition-colors hover:bg-slate-50"
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">
                    {estimate.estimateNumber}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(estimate.createdAt)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="truncate font-medium text-slate-900">
                    {estimate.customerName}
                  </p>
                </td>
                <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                  {lineItemCount} {lineItemCount === 1 ? "item" : "items"}
                </td>
                <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">
                  {estimate.validUntil
                    ? formatDate(estimate.validUntil)
                    : "—"}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {formatCurrency(estimate.total)}
                </td>
                <td className="px-4 py-3">
                  <EstimateStatusBadge status={estimate.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}
