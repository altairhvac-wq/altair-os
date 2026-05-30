import { adminListRowClass } from "@/shared/lib/admin-density";
import { ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { Estimate } from "@/shared/types/estimate";
import { EstimateStatusBadge } from "./EstimateStatusBadge";

type EstimatesMobileCardListProps = {
  estimates: Estimate[];
  onSelect: (estimate: Estimate) => void;
};

export function EstimatesMobileCardList({
  estimates,
  onSelect,
}: EstimatesMobileCardListProps) {
  return (
    <ul className="divide-y divide-slate-100 md:hidden">
      {estimates.map((estimate) => (
        <li key={estimate.id}>
          <button
            type="button"
            onClick={() => onSelect(estimate)}
            className={adminListRowClass}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-bold text-slate-900">
                  {estimate.estimateNumber}
                </p>
                <EstimateStatusBadge status={estimate.status} />
              </div>
              <p className="mt-0.5 truncate text-sm text-slate-600">
                {estimate.customerName}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatDate(estimate.createdAt)}
                {estimate.jobNumber ? ` · ${estimate.jobNumber}` : ""}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 pt-0.5">
              <p className="text-sm font-semibold text-slate-900">
                {formatCurrency(estimate.total)}
              </p>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
