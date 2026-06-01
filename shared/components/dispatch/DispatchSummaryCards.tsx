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
      iconClass: "admin-metric-icon-teal",
    },
    {
      label: "In Progress",
      value: summary.inProgress,
      description: "Technicians actively working",
      icon: Loader2,
      iconClass: "admin-metric-icon-amber",
    },
    {
      label: "Unassigned",
      value: summary.unassigned,
      description: "Awaiting assignment",
      icon: UserX,
      iconClass: "admin-metric-icon-rose",
    },
    {
      label: "Completed",
      value: summary.completed,
      description: "Finished this period",
      icon: CheckCircle2,
      iconClass: "admin-metric-icon-emerald",
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
          className={`admin-metric-card ${
            isHighlighted ? "admin-metric-card-highlight" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <p className="admin-metric-label truncate">{card.label}</p>
              <p className="admin-metric-value sm:mt-1 sm:text-2xl">
                {card.value}
              </p>
              <p className="admin-text-helper mt-0.5 hidden sm:block">
                {card.description}
              </p>
            </div>
            <div className={`admin-metric-icon ${card.iconClass}`}>
              <card.icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
        </div>
      );
      })}
    </div>
  );
}
