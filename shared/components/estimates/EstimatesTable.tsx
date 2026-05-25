import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { Estimate } from "@/shared/types/estimate";
import { EstimateStatusBadge } from "./EstimateStatusBadge";

type EstimatesTableProps = {
  estimates: Estimate[];
  selectedId: string | null;
  onSelect: (estimate: Estimate) => void;
};

export function EstimatesTable({
  estimates,
  selectedId,
  onSelect,
}: EstimatesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
            const isSelected = estimate.id === selectedId;

            return (
              <tr
                key={estimate.id}
                onClick={() => onSelect(estimate)}
                className={`cursor-pointer transition-colors ${
                  isSelected ? "bg-cyan-50/70" : "hover:bg-slate-50"
                }`}
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
                  {estimate.lineItems.length}{" "}
                  {estimate.lineItems.length === 1 ? "item" : "items"}
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
  );
}
