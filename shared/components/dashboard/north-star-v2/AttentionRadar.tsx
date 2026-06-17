import type { AttentionRail } from "./sample-data";

const urgencyStyles = {
  now: {
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
    chip: "bg-amber-50 text-amber-800 ring-amber-200/60",
    label: "Now",
  },
  today: {
    dot: "bg-sky-400/90",
    chip: "bg-sky-50 text-sky-800 ring-sky-200/60",
    label: "Today",
  },
  soon: {
    dot: "bg-slate-300",
    chip: "bg-slate-50 text-slate-600 ring-slate-200/60",
    label: "Soon",
  },
} as const;

type AttentionRadarProps = {
  rails: AttentionRail[];
};

export function AttentionRadar({ rails }: AttentionRadarProps) {
  return (
    <section
      aria-label="Attention radar"
      className="relative overflow-hidden rounded-2xl bg-white/60 p-4 shadow-[0_8px_40px_-20px_rgba(15,23,42,0.08),0_0_0_1px_rgba(148,163,184,0.06)] backdrop-blur-sm sm:p-5 lg:p-6"
    >
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Attention
          </p>
          <p className="mt-1 text-sm font-medium text-slate-700">What needs you</p>
        </div>
        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
          {rails.reduce((sum, rail) => sum + rail.items.length, 0)} signals
        </span>
      </div>

      <div className="flex flex-col gap-5 lg:gap-6">
        {rails.map((rail, railIndex) => (
          <div key={rail.id} className="relative">
            {railIndex > 0 ? (
              <div
                aria-hidden="true"
                className="absolute -top-3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent"
              />
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
              <div className="flex shrink-0 items-center gap-2 sm:w-36 sm:flex-col sm:items-start sm:gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {rail.label}
                </span>
                <div
                  aria-hidden="true"
                  className="hidden h-px flex-1 bg-gradient-to-r from-cyan-300/50 to-transparent sm:block sm:h-8 sm:w-px sm:bg-gradient-to-b sm:from-cyan-300/40 sm:to-transparent"
                />
              </div>

              <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
                {rail.items.map((item) => {
                  const urgency = urgencyStyles[item.urgency];
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="group inline-flex max-w-full items-center gap-2 rounded-xl bg-slate-50/80 px-3 py-2 text-left ring-1 ring-slate-200/50 transition-all hover:bg-white hover:shadow-[0_4px_16px_-4px_rgba(15,23,42,0.1)] hover:ring-slate-300/60"
                      >
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${urgency.dot}`}
                          aria-hidden="true"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-900">
                            {item.title}
                          </span>
                          <span className="block truncate text-[11px] text-slate-500">
                            {item.meta}
                          </span>
                        </span>
                        <span
                          className={`ml-1 hidden shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ring-1 sm:inline ${urgency.chip}`}
                        >
                          {urgency.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
