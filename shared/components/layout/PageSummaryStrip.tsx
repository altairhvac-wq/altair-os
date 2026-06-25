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
  northStar?: boolean;
  showCompactStrip?: boolean;
  showCards?: boolean;
  /** Smaller inline strip styling for embedding in page headers */
  compactDensity?: "default" | "header";
};

export function PageSummaryStrip({
  cards,
  lgColumnsClass = "lg:grid-cols-4",
  northStar = false,
  showCompactStrip = true,
  showCards = true,
  compactDensity = "default",
}: PageSummaryStripProps) {
  if (cards.length === 0) {
    return null;
  }

  if (northStar) {
    const compactMetricClass =
      compactDensity === "header"
        ? "flex min-w-[3.75rem] flex-col px-2 py-0.5"
        : "flex min-w-[4.5rem] flex-col px-3 py-0.5";
    const compactStripClass =
      compactDensity === "header"
        ? "invoice-north-star-summary-strip shrink-0 w-fit max-w-full overflow-x-auto rounded-lg border border-[rgba(138,99,36,0.12)] bg-[rgba(239,228,203,0.55)] px-2 py-1"
        : "invoice-north-star-summary-strip shrink-0 overflow-x-auto border-b border-[rgba(138,99,36,0.12)] bg-[#EFE4CB] px-3 py-2 sm:px-4";

    return (
      <>
        {showCompactStrip ? (
        <div
          className={compactStripClass}
          aria-label="Summary metrics"
        >
          <div className="flex min-w-max items-stretch gap-0">
            {cards.map((card, index) => (
              <div
                key={card.label}
                className={`${compactMetricClass} ${
                  index > 0 ? "border-l border-[rgba(138,99,36,0.18)]" : ""
                } ${
                  card.highlighted
                    ? "-my-0.5 rounded-md bg-[rgba(201,164,77,0.14)] px-2 py-0.5"
                    : ""
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#4F4638]">
                  {card.mobileLabel ?? card.label}
                </span>
                <span className="text-sm font-bold tabular-nums text-[#17130E]">
                  {card.value}
                </span>
              </div>
            ))}
          </div>
        </div>
        ) : null}

        {showCards ? (
        <div
          className={`hidden shrink-0 gap-3 sm:grid sm:grid-cols-2 ${lgColumnsClass}`}
        >
          {cards.map((card) => (
            <div
              key={card.label}
              className={`rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] px-3.5 py-3 shadow-[0_2px_8px_rgba(3,7,12,0.08)] sm:px-4 sm:py-3.5 ${
                card.highlighted
                  ? "border-[rgba(201,164,77,0.35)] bg-[#FFF9EA] ring-1 ring-[rgba(201,164,77,0.18)]"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4F4638]">
                    {card.label}
                  </p>
                  <p className="mt-0.5 text-lg font-bold tabular-nums text-[#17130E]">
                    {card.value}
                  </p>
                  {card.description ? (
                    <p className="mt-0.5 text-xs text-[#64748B]">
                      {card.description}
                    </p>
                  ) : null}
                </div>
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFE4CB] ring-1 ring-[rgba(138,99,36,0.12)] ${card.iconClassName}`}
                >
                  <card.icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      {showCompactStrip ? (
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
      ) : null}

      {showCards ? (
      <div
        className={`hidden shrink-0 gap-3 sm:grid sm:grid-cols-2 ${lgColumnsClass}`}
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
      ) : null}
    </>
  );
}
