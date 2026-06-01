import type { LucideIcon } from "lucide-react";

export type PageSummaryCard = {
  label: string;
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
    <div
      className={`grid shrink-0 gap-2.5 sm:grid-cols-2 ${lgColumnsClass}`}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 transition-shadow sm:p-3 ${
            card.highlighted
              ? "border-amber-300/70 bg-amber-50/30 ring-1 ring-amber-400/15"
              : ""
          }`}
        >
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-slate-500 sm:text-xs">
                {card.label}
              </p>
              <p className="mt-0.5 text-lg font-bold tabular-nums tracking-tight text-slate-900 sm:text-xl">
                {card.value}
              </p>
              {card.description ? (
                <p className="admin-text-helper mt-0.5">{card.description}</p>
              ) : null}
            </div>
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${card.iconClassName}`}
            >
              <card.icon className="h-4 w-4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
