import { formatCurrency } from "@/shared/types/customer";
import { calculateLineItemTotal } from "@/shared/types/estimate";

export type BillingLineItemDisplay = {
  id: string;
  name: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  taxable?: boolean;
};

type BillingLineItemsListProps = {
  items: BillingLineItemDisplay[];
  documentLabel?: string;
  variant?: "cards" | "table";
};

export function BillingLineItemsList({
  items,
  documentLabel = "document",
  variant = "cards",
}: BillingLineItemsListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center print:border-slate-300 print:bg-white">
        <p className="text-sm font-medium text-slate-700">No line items yet</p>
        <p className="mt-1 text-xs text-slate-500">
          Services and parts on this {documentLabel} will appear here.
        </p>
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className="overflow-x-auto print:overflow-visible">
        <table className="min-w-full border-collapse text-sm print:text-xs">
          <thead>
            <tr className="border-b border-slate-300 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2 font-semibold">Item</th>
              <th className="px-3 py-2 text-center font-semibold">Qty</th>
              <th className="px-3 py-2 text-right font-semibold">Rate</th>
              <th className="px-3 py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-slate-200">
                <td className="px-3 py-3 align-top text-slate-900">
                  <p className="font-medium">{item.name}</p>
                  {item.description ? (
                    <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                  ) : null}
                  {item.taxable === false ? (
                    <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 print:border print:border-slate-300 print:bg-white">
                      Non-taxable
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-center tabular-nums text-slate-600">
                  {item.quantity}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-900">
                  {formatCurrency(
                    calculateLineItemTotal(item.quantity, item.unitPrice),
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-lg border border-slate-200 bg-white px-4 py-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-medium text-slate-900">
                {item.name}
              </p>
              {item.description ? (
                <p className="mt-0.5 break-words text-xs text-slate-500">
                  {item.description}
                </p>
              ) : null}
            </div>
            {item.taxable === false ? (
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Non-taxable
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span className="min-w-0 shrink truncate">
              {item.quantity} × {formatCurrency(item.unitPrice)}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-700">
              {formatCurrency(
                calculateLineItemTotal(item.quantity, item.unitPrice),
              )}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
