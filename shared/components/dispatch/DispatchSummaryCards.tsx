import { CalendarCheck, CheckCircle2, Loader2, UserX } from "lucide-react";
import type { DispatchSummary } from "@/shared/types/dispatch";
import type { DispatchSummaryHighlightLabel } from "@/shared/lib/dispatch-page-focus";

type DispatchSummaryCardsProps = {
  summary: DispatchSummary;
  highlightedLabels?: DispatchSummaryHighlightLabel[];
};

export function DispatchSummaryCards({
  summary,
  highlightedLabels = [],
}: DispatchSummaryCardsProps) {
  const cards = [
    {
      label: "Scheduled Today",
      value: summary.scheduledToday,
      description: "Jobs on today's board",
      icon: CalendarCheck,
      iconClass: "text-blue-600 bg-blue-50",
      accent: "border-blue-100",
    },
    {
      label: "In Progress",
      value: summary.inProgress,
      description: "Technicians actively working",
      icon: Loader2,
      iconClass: "text-amber-600 bg-amber-50",
      accent: "border-amber-100",
    },
    {
      label: "Unassigned",
      value: summary.unassigned,
      description: "Awaiting assignment",
      icon: UserX,
      iconClass: "text-orange-600 bg-orange-50",
      accent: "border-orange-100",
    },
    {
      label: "Completed",
      value: summary.completed,
      description: "Finished this period",
      icon: CheckCircle2,
      iconClass: "text-emerald-600 bg-emerald-50",
      accent: "border-emerald-100",
    },
  ];

  return (
    <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const isHighlighted = highlightedLabels.includes(
          card.label as DispatchSummaryHighlightLabel,
        );

        return (
        <div
          key={card.label}
          className={`rounded-2xl border bg-white p-4 shadow-sm transition-shadow ${
            isHighlighted
              ? "border-amber-300 ring-2 ring-amber-400/25 shadow-md"
              : card.accent
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-500">{card.label}</p>
              <p className="mt-2 text-3xl font-black tabular-nums text-slate-900">
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
      );
      })}
    </div>
  );
}
