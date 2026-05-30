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
      iconClass: "text-sky-700 bg-sky-50/90",
      accent: "border-sky-100/80",
    },
    {
      label: "In Progress",
      value: summary.inProgress,
      description: "Technicians actively working",
      icon: Loader2,
      iconClass: "text-amber-700 bg-amber-50/90",
      accent: "border-amber-100/80",
    },
    {
      label: "Unassigned",
      value: summary.unassigned,
      description: "Awaiting assignment",
      icon: UserX,
      iconClass: "text-orange-700 bg-orange-50/90",
      accent: "border-orange-100/80",
    },
    {
      label: "Completed",
      value: summary.completed,
      description: "Finished this period",
      icon: CheckCircle2,
      iconClass: "text-emerald-700 bg-emerald-50/90",
      accent: "border-emerald-100/80",
    },
  ];

  return (
    <div className="grid shrink-0 grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const isHighlighted = highlightedLabels.includes(
          card.label as DispatchSummaryHighlightLabel,
        );

        return (
        <div
          key={card.label}
          className={`admin-card p-2 transition-shadow sm:p-3 ${
            isHighlighted
              ? "border-amber-300/70 ring-1 ring-amber-400/20"
              : card.accent
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
              <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">
                {card.description}
              </p>
            </div>
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8 ${card.iconClass}`}
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
