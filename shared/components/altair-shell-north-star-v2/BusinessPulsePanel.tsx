import type { PulseMetric } from "./sample-data";
import { missionGlassCardClass, missionEyebrowClass } from "./mission-tokens";

const toneStyles = {
  cyan: "text-cyan-400",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  violet: "text-violet-400",
} as const;

const toneGlow = {
  cyan: "from-cyan-500/8",
  emerald: "from-emerald-500/8",
  amber: "from-amber-500/8",
  violet: "from-violet-500/8",
} as const;

type BusinessPulsePanelProps = {
  metrics: PulseMetric[];
};

export function BusinessPulsePanel({ metrics }: BusinessPulsePanelProps) {
  return (
    <section aria-label="Business pulse" className={`${missionGlassCardClass} relative`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent"
      />

      <div className="relative">
        <p className={missionEyebrowClass}>Business pulse</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.id}
              className="relative overflow-hidden rounded-xl bg-slate-950/50 px-4 py-3.5 ring-1 ring-slate-800/40"
            >
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${toneGlow[metric.tone]} to-transparent`}
              />
              <div className="relative">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-600">
                  {metric.label}
                </p>
                <p className={`mt-1 text-xl font-semibold tabular-nums ${toneStyles[metric.tone]}`}>
                  {metric.value}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">{metric.delta}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
