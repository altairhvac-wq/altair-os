import type { MoneyLane } from "./sample-data";

const laneEmphasisClass = {
  neutral: "text-slate-900",
  attention: "text-slate-900",
  positive: "text-emerald-900",
} as const;

const laneDetailClass = {
  neutral: "text-slate-500",
  attention: "text-amber-800/80",
  positive: "text-emerald-700/80",
} as const;

type MoneyWaitingSectionProps = {
  lanes: MoneyLane[];
};

export function MoneyWaitingSection({ lanes }: MoneyWaitingSectionProps) {
  return (
    <section
      aria-labelledby="money-waiting-heading"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50/90 via-white to-slate-50/50 px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_100%_0%,rgba(148,163,184,0.08),transparent_60%)]"
      />

      <div className="relative flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h2
            id="money-waiting-heading"
            className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl"
          >
            Money waiting
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
            Cash-flow command — one read across invoice readiness, open balance,
            and what landed today.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 xl:gap-0 xl:divide-x xl:divide-slate-200/60">
          {lanes.map((lane, index) => (
            <div
              key={lane.id}
              className={`flex flex-col gap-1 ${index > 0 ? "xl:pl-8" : ""} ${index < lanes.length - 1 ? "sm:pb-0" : ""}`}
            >
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                {lane.label}
              </p>
              <p
                className={`text-2xl font-semibold tabular-nums tracking-tight sm:text-[1.75rem] ${laneEmphasisClass[lane.emphasis ?? "neutral"]}`}
              >
                {lane.amount}
              </p>
              <p className={`text-sm ${laneDetailClass[lane.emphasis ?? "neutral"]}`}>
                {lane.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
