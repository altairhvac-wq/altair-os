import Link from "next/link";
import { CalendarCheck, CheckCircle2, Loader2, UserX } from "lucide-react";
import type { DispatchSummary } from "@/shared/types/dispatch";
import type { DispatchSummaryHighlightLabel } from "@/shared/lib/dispatch-page-focus";
import { getDispatchSummaryCardHref } from "@/shared/lib/jobs-page-filters";
import { northStarDispatchTokens as dt } from "@/shared/design-system/north-star/tokens";

type DispatchSummaryCardsProps = {
  summary: DispatchSummary;
  highlightedLabels?: DispatchSummaryHighlightLabel[];
  linkToJobs?: boolean;
  northStar?: boolean;
};

const NORTH_STAR_ICON_CLASS = dt.summaryMetricIcon;

export function DispatchSummaryCards({
  summary,
  highlightedLabels = [],
  linkToJobs = false,
  northStar = false,
}: DispatchSummaryCardsProps) {
  const cards = [
    {
      label: "Scheduled Today" as const,
      value: summary.scheduledToday,
      description: "Jobs on today's board",
      icon: CalendarCheck,
      iconClass: northStar ? NORTH_STAR_ICON_CLASS : "admin-metric-icon-teal",
    },
    {
      label: "In Progress" as const,
      value: summary.inProgress,
      description: "Technicians actively working",
      icon: Loader2,
      iconClass: northStar ? NORTH_STAR_ICON_CLASS : "admin-metric-icon-amber",
    },
    {
      label: "Unassigned" as const,
      value: summary.unassigned,
      description: "Awaiting assignment",
      icon: UserX,
      iconClass: northStar ? NORTH_STAR_ICON_CLASS : "admin-metric-icon-rose",
    },
    {
      label: "Completed" as const,
      value: summary.completed,
      description: "Finished this period",
      icon: CheckCircle2,
      iconClass: northStar ? NORTH_STAR_ICON_CLASS : "admin-metric-icon-emerald",
    },
  ];

  return (
    <div className="grid shrink-0 grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const isHighlighted = highlightedLabels.includes(card.label);
        const cardClassName = northStar
          ? `${dt.summaryMetricCard} ${
              isHighlighted ? dt.summaryMetricCardHighlight : ""
            } ${linkToJobs ? dt.summaryMetricCardInteractive : ""}`
          : `admin-metric-card ${
              isHighlighted ? "admin-metric-card-highlight" : ""
            } ${
              linkToJobs
                ? "admin-metric-card-interactive cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                : ""
            }`;
        const cardContent = (
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <p
                className={
                  northStar ? dt.summaryMetricLabel : "admin-metric-label truncate"
                }
              >
                {card.label}
              </p>
              <p
                className={
                  northStar ? dt.summaryMetricValue : "admin-metric-value sm:mt-1 sm:text-2xl"
                }
              >
                {card.value}
              </p>
              <p
                className={
                  northStar
                    ? dt.summaryMetricDescription
                    : "admin-text-helper mt-0.5 hidden sm:block"
                }
              >
                {card.description}
              </p>
            </div>
            <div
              className={
                northStar ? card.iconClass : `admin-metric-icon ${card.iconClass}`
              }
            >
              <card.icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
        );

        if (linkToJobs) {
          return (
            <Link
              key={card.label}
              href={getDispatchSummaryCardHref(card.label)}
              className={`block min-h-11 ${cardClassName}`}
              aria-label={`View ${card.value} ${card.label.toLowerCase()} jobs`}
            >
              {cardContent}
            </Link>
          );
        }

        return (
          <div key={card.label} className={cardClassName}>
            {cardContent}
          </div>
        );
      })}
    </div>
  );
}
