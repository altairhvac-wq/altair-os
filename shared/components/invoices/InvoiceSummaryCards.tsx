import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { formatCurrency } from "@/shared/types/customer";
import { getInvoiceSummary, type Invoice } from "@/shared/types/invoice";

type InvoiceSummaryCardsProps = {
  invoices: Invoice[];
  highlightedLabels?: Array<"Unpaid" | "Overdue" | "Paid">;
};

export function InvoiceSummaryCards({
  invoices,
  highlightedLabels = [],
}: InvoiceSummaryCardsProps) {
  const { unpaidTotal, paidTotal, overdueTotal } = getInvoiceSummary(invoices);

  const cards = [
    {
      label: "Unpaid",
      value: formatCurrency(unpaidTotal),
      description: "Outstanding balance",
      icon: Clock,
      iconClass: "text-amber-600 bg-amber-50",
    },
    {
      label: "Paid",
      value: formatCurrency(paidTotal),
      description: "Collected this period",
      icon: CheckCircle2,
      iconClass: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Overdue",
      value: formatCurrency(overdueTotal),
      description: "Past due balance",
      icon: AlertCircle,
      iconClass: "text-red-600 bg-red-50",
    },
  ];

  return (
    <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const isHighlighted = highlightedLabels.includes(
          card.label as "Unpaid" | "Overdue" | "Paid",
        );

        return (
        <div
          key={card.label}
          className={`admin-card p-2 transition-shadow sm:p-3 ${
            isHighlighted
              ? "border-amber-300/70 ring-1 ring-amber-400/20"
              : ""
          }`}
        >
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-slate-500 sm:text-sm">
                {card.label}
              </p>
              <p className="mt-0.5 text-xl font-bold tabular-nums tracking-tight text-slate-900 sm:mt-1 sm:text-2xl">
                {card.value}
              </p>
              <p className="admin-text-helper mt-0.5 sm:mt-1">{card.description}</p>
            </div>
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${card.iconClass}`}
            >
              <card.icon className="h-4 w-4" />
            </div>
          </div>
        </div>
      );
      })}
    </div>
  );
}
