import type { MoneyStage } from "@/shared/components/dashboard/north-star-v2/sample-data";
import type { ExpenseReviewItem } from "./sample-data";
import { shellEyebrowClass, shellInsetClass, shellZoneClass } from "./shell-tokens";

const stageToneStyles = {
  neutral: { fill: "from-sky-400/60 to-indigo-500/40", amount: "text-white", detail: "text-slate-400" },
  attention: { fill: "from-amber-400/70 to-amber-500/50", amount: "text-white", detail: "text-amber-200/80" },
  positive: { fill: "from-emerald-400/60 to-emerald-500/40", amount: "text-white", detail: "text-emerald-200/80" },
  risk: { fill: "from-red-400/70 to-red-500/50", amount: "text-white", detail: "text-red-200/80" },
} as const;

type MoneySystemPanelProps = {
  stages: MoneyStage[];
  expenseReview: {
    pendingCount: number;
    pendingTotal: string;
    items: ExpenseReviewItem[];
  };
};

export function MoneySystemPanel({ stages, expenseReview }: MoneySystemPanelProps) {
  return (
    <section aria-label="Money system" className={shellZoneClass}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-indigo-500/8 blur-3xl"
      />

      <div className="relative mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={shellEyebrowClass}>Money pipeline</p>
          <p className="mt-1 text-base font-semibold tracking-tight text-slate-100">
            Where money is waiting
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-600">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
            Flowing
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-500" />
            Caution
          </span>
        </div>
      </div>

      <div className="relative mb-6">
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-[2.75rem] h-1 rounded-full bg-slate-800/80"
        />

        <ol className="relative grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-2">
          {stages.map((stage, index) => {
            const emphasis =
              stage.id === "overdue" ? "risk" : (stage.emphasis ?? "neutral");
            const tone = stageToneStyles[emphasis as keyof typeof stageToneStyles] ?? stageToneStyles.neutral;
            const isLast = index === stages.length - 1;
            return (
              <li key={stage.id} className="relative flex flex-col gap-3">
                <div className="relative h-1 overflow-hidden rounded-full bg-slate-800/60">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${tone.fill}`}
                    style={{ width: `${Math.max(stage.fill, 18)}%` }}
                  />
                  {!isLast ? (
                    <div
                      aria-hidden="true"
                      className="absolute -right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-r border-t border-slate-700/50 bg-slate-900"
                    />
                  ) : null}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {stage.label}
                  </span>
                  <span className={`text-xl font-semibold tabular-nums tracking-tight sm:text-2xl ${tone.amount}`}>
                    {stage.amount}
                  </span>
                  <span className={`text-xs ${tone.detail}`}>{stage.detail}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className={shellInsetClass}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Expense review
            </p>
            <p className="mt-0.5 text-sm text-slate-300">
              {expenseReview.pendingCount} pending · {expenseReview.pendingTotal}
            </p>
          </div>
          <span className="rounded-full bg-amber-950/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-300/90 ring-1 ring-amber-500/20">
            Review queue
          </span>
        </div>

        <ul className="divide-y divide-slate-800/80">
          {expenseReview.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-200">{item.label}</p>
                <p className="truncate text-[11px] text-slate-500">{item.meta}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-slate-300">{item.amount}</span>
                {item.status === "flagged" ? (
                  <span className="rounded-full bg-amber-950/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-amber-300">
                    Flagged
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
