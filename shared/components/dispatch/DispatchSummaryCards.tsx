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
    <div className="grid shrink-0 grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const isHighlighted = highlightedLabels.includes(
          card.label as DispatchSummaryHighlightLabel,
        );

        return (
        <div
          key={card.label}
          className={`rounded-xl border bg-white p-2.5 shadow-sm transition-shadow sm:rounded-2xl sm:p-4 ${
            isHighlighted
              ? "border-amber-300 ring-2 ring-amber-400/25 shadow-md"
              : card.accent
          }`}
        >
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold text-slate-500 sm:text-sm">
                {card.label}
              </p>
              <p className="mt-0.5 text-xl font-black tabular-nums text-slate-900 sm:mt-2 sm:text-3xl">
                {card.value}
              </p>
              <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">
                {card.description}
              </p>
            </div>
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl ${card.iconClass}`}
            >
              <card.icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
        </div>
      );
      })}
    </div>
  );
}
