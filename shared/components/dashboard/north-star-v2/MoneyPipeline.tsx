import type { MoneyStage } from "./sample-data";

const stageToneStyles = {
  neutral: {
    fill: "from-sky-400/70 to-sky-500/50",
    amount: "text-slate-900",
    detail: "text-slate-500",
  },
  attention: {
    fill: "from-amber-400/80 to-amber-500/60",
    amount: "text-slate-900",
    detail: "text-amber-700/80",
  },
  positive: {
    fill: "from-emerald-400/70 to-emerald-500/50",
    amount: "text-slate-900",
    detail: "text-emerald-700/80",
  },
} as const;

type MoneyPipelineProps = {
  stages: MoneyStage[];
};

export function MoneyPipeline({ stages }: MoneyPipelineProps) {
  return (
    <section
      aria-label="Money pipeline"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-sky-50/40 p-4 shadow-[0_8px_40px_-20px_rgba(15,23,42,0.1)] sm:p-5 lg:p-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_0%_50%,rgba(34,211,238,0.06),transparent_60%)]"
      />

      <div className="relative mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Money waiting
          </p>
          <p className="mt-1 text-sm font-medium text-slate-700">Cash flow pipeline</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
            In
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-500" />
            Blocked
          </span>
        </div>
      </div>

      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-[2.75rem] h-2 rounded-full bg-slate-200/70"
        />

        <ol className="relative grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-2">
          {stages.map((stage, index) => {
            const tone = stageToneStyles[stage.emphasis ?? "neutral"];
            const isLast = index === stages.length - 1;
            return (
              <li key={stage.id} className="relative flex flex-col gap-3">
                <div className="relative h-2 overflow-hidden rounded-full bg-slate-200/50">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${tone.fill}`}
                    style={{ width: `${Math.max(stage.fill, 18)}%` }}
                  />
                  {!isLast ? (
                    <div
                      aria-hidden="true"
                      className="absolute -right-1 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-r border-t border-slate-300/50 bg-white"
                    />
                  ) : null}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {stage.label}
                  </span>
                  <span
                    className={`text-xl font-semibold tabular-nums tracking-tight sm:text-2xl ${tone.amount}`}
                  >
                    {stage.amount}
                  </span>
                  <span className={`text-xs ${tone.detail}`}>{stage.detail}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
