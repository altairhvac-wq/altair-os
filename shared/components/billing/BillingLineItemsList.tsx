import { formatCurrency } from "@/shared/types/customer";
import { calculateLineItemTotal } from "@/shared/types/estimate";
import {
  isPremiumBillingDocumentStyle,
  type BillingDocumentStyle,
} from "@/shared/lib/billing-document-style";

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
  documentStyle?: BillingDocumentStyle;
  /** Truncate descriptions to two lines (public mobile documents). */
  compactDescriptions?: boolean;
};

function descriptionClass(compactDescriptions: boolean, premium: boolean) {
  if (compactDescriptions) {
    return "mt-0.5 line-clamp-2 break-words text-xs leading-snug text-slate-600";
  }

  return premium
    ? "mt-1 break-words text-xs leading-snug text-slate-600"
    : "mt-0.5 break-words text-xs text-slate-500";
}

export function BillingLineItemsList({
  items,
  documentLabel = "document",
  variant = "cards",
  documentStyle = "default",
  compactDescriptions = false,
}: BillingLineItemsListProps) {
  const isPremiumStyle = isPremiumBillingDocumentStyle(documentStyle);
  const useCompactCards = compactDescriptions || variant === "cards";
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center print:border-slate-300 print:bg-white">
        <p className="text-sm font-medium text-slate-700">No line items yet</p>
        <p className="mt-1 text-xs text-slate-500">
          Services and parts on this {documentLabel} will appear here.
        </p>
      </div>
    );
  }

  if (variant === "table") {
    const headerCellClass = isPremiumStyle
      ? "px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600"
      : "px-3 py-2 font-semibold";
    const bodyCellClass = isPremiumStyle ? "px-4 py-4" : "px-3 py-3";
    const headerRowClass = isPremiumStyle
      ? "border-b-2 border-slate-900 bg-white text-left print:bg-white"
      : "border-b border-slate-300 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";
    const bodyRowClass = isPremiumStyle
      ? "border-b border-slate-200 last:border-b-0"
      : "border-b border-slate-200";

    if (isPremiumStyle) {
      const mobileCards = (
        <div
          className={
            compactDescriptions
              ? "space-y-1.5"
              : "space-y-2 sm:hidden print:hidden"
          }
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 break-words text-sm font-semibold text-slate-900">
                  {item.name}
                </p>
                <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
                  {formatCurrency(
                    calculateLineItemTotal(item.quantity, item.unitPrice),
                  )}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] tabular-nums text-slate-500">
                {item.quantity} × {formatCurrency(item.unitPrice)}
              </p>
              {item.description ? (
                <p className={descriptionClass(compactDescriptions, true)}>
                  {item.description}
                </p>
              ) : null}
              {item.taxable === false ? (
                <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Non-taxable
                </span>
              ) : null}
            </div>
          ))}
        </div>
      );

      if (compactDescriptions) {
        return mobileCards;
      }

      return (
        <>
          {mobileCards}

          <div className="hidden overflow-x-auto sm:block print:block print:overflow-visible">
            <table
              className={`min-w-full border-collapse ${isPremiumStyle ? "text-sm" : "text-sm print:text-xs"}`}
            >
              <thead>
                <tr className={headerRowClass}>
                  <th className={`${headerCellClass} text-left`}>Description</th>
                  <th className={`${headerCellClass} text-center`}>Qty</th>
                  <th className={`${headerCellClass} text-right`}>Rate</th>
                  <th className={`${headerCellClass} text-right`}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className={bodyRowClass}>
                    <td className={`${bodyCellClass} align-top text-slate-900`}>
                      <p className="font-semibold">{item.name}</p>
                      {item.description ? (
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
                          {item.description}
                        </p>
                      ) : null}
                      {item.taxable === false ? (
                        <span className="mt-1.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 print:border print:border-slate-300 print:bg-white">
                          Non-taxable
                        </span>
                      ) : null}
                    </td>
                    <td
                      className={`${bodyCellClass} text-center tabular-nums text-slate-600`}
                    >
                      {item.quantity}
                    </td>
                    <td
                      className={`${bodyCellClass} text-right tabular-nums text-slate-600`}
                    >
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td
                      className={`${bodyCellClass} text-right font-semibold tabular-nums text-slate-900`}
                    >
                      {formatCurrency(
                        calculateLineItemTotal(item.quantity, item.unitPrice),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    return (
      <div className="overflow-x-auto print:overflow-visible">
        <table
          className={`min-w-full border-collapse ${isPremiumStyle ? "text-sm" : "text-sm print:text-xs"}`}
        >
          <thead>
            <tr className={headerRowClass}>
              <th className={`${headerCellClass} text-left`}>Description</th>
              <th className={`${headerCellClass} text-center`}>Qty</th>
              <th className={`${headerCellClass} text-right`}>Rate</th>
              <th className={`${headerCellClass} text-right`}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={bodyRowClass}>
                <td className={`${bodyCellClass} align-top text-slate-900`}>
                  <p className={isPremiumStyle ? "font-semibold" : "font-medium"}>
                    {item.name}
                  </p>
                  {item.description ? (
                    <p
                      className={
                        isPremiumStyle
                          ? "mt-1 text-sm leading-relaxed text-slate-600"
                          : "mt-0.5 text-xs text-slate-500"
                      }
                    >
                      {item.description}
                    </p>
                  ) : null}
                  {item.taxable === false ? (
                    <span className="mt-1.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 print:border print:border-slate-300 print:bg-white">
                      Non-taxable
                    </span>
                  ) : null}
                </td>
                <td
                  className={`${bodyCellClass} text-center tabular-nums text-slate-600`}
                >
                  {item.quantity}
                </td>
                <td
                  className={`${bodyCellClass} text-right tabular-nums text-slate-600`}
                >
                  {formatCurrency(item.unitPrice)}
                </td>
                <td
                  className={`${bodyCellClass} text-right font-semibold tabular-nums text-slate-900`}
                >
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
    <div className={useCompactCards ? "space-y-1.5" : "space-y-2"}>
      {items.map((item) => (
        <div
          key={item.id}
          className={
            useCompactCards
              ? "rounded-lg border border-slate-200 bg-white px-3 py-2"
              : "rounded-lg border border-slate-200 bg-white px-4 py-3"
          }
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-semibold text-slate-900">
                {item.name}
              </p>
              {item.description ? (
                <p className={descriptionClass(compactDescriptions, false)}>
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
