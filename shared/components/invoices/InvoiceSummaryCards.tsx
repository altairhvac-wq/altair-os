import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { formatCurrency } from "@/shared/types/customer";
import { getInvoiceSummary, type Invoice } from "@/shared/types/invoice";

type InvoiceSummaryCardsProps = {
  invoices: Invoice[];
};

export function InvoiceSummaryCards({ invoices }: InvoiceSummaryCardsProps) {
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
    <div className="grid shrink-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-500">{card.label}</p>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{card.description}</p>
            </div>
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.iconClass}`}
            >
              <card.icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
