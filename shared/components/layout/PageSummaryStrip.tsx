import type { LucideIcon } from "lucide-react";
import {
  adminCompactSummaryLabelClass,
  adminCompactSummaryMetricClass,
  adminCompactSummaryStripClass,
  adminCompactSummaryStripInnerClass,
  adminCompactSummaryValueClass,
} from "@/shared/lib/admin-density";

export type PageSummaryCard = {
  label: string;
  /** Shorter label for the mobile compact strip */
  mobileLabel?: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  iconClassName: string;
  highlighted?: boolean;
};

type PageSummaryStripProps = {
  cards: PageSummaryCard[];
  /** Tailwind grid column classes for lg breakpoint */
  lgColumnsClass?: string;
};

export function PageSummaryStrip({
  cards,
  lgColumnsClass = "lg:grid-cols-4",
}: PageSummaryStripProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className={adminCompactSummaryStripClass}
        aria-label="Summary metrics"
      >
        <div className={adminCompactSummaryStripInnerClass}>
          {cards.map((card, index) => (
            <div
              key={card.label}
              className={`${adminCompactSummaryMetricClass} ${
                index > 0 ? "border-l border-slate-200 pl-3" : ""
              } ${
                card.highlighted
                  ? "-my-0.5 rounded-md bg-amber-50/90 px-1.5 py-0.5"
                  : ""
              }`}
            >
              <span className={adminCompactSummaryLabelClass}>
                {card.mobileLabel ?? card.label}
              </span>
              <span className={adminCompactSummaryValueClass}>{card.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`hidden shrink-0 gap-2.5 sm:grid sm:grid-cols-2 ${lgColumnsClass}`}
      >
        {cards.map((card) => (
          <div
            key={card.label}
            className={`admin-metric-card ${
              card.highlighted ? "admin-metric-card-highlight" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2 sm:gap-3">
              <div className="min-w-0">
                <p className="admin-metric-label truncate">{card.label}</p>
                <p className="admin-metric-value">{card.value}</p>
                {card.description ? (
                  <p className="admin-text-helper mt-0.5">{card.description}</p>
                ) : null}
              </div>
              <div className={`admin-metric-icon ${card.iconClassName}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
