import type { PulseMetric } from "./sample-data";

const toneStyles = {
  slate: "text-slate-700",
  emerald: "text-emerald-700",
  amber: "text-amber-700",
} as const;

type RevenueBandProps = {
  metrics: PulseMetric[];
};

export function RevenueBand({ metrics }: RevenueBandProps) {
  return (
    <div className="grid divide-y divide-[rgba(41,34,24,0.10)] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
      {metrics.map((metric) => (
        <div key={metric.id} className="px-4 py-3.5 sm:px-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(41,34,24,0.50)]">
            {metric.label}
          </p>
          <p className={`mt-0.5 text-lg font-bold tabular-nums ${toneStyles[metric.tone]}`}>{metric.value}</p>
          <p className="text-[11px] text-[rgba(41,34,24,0.65)]">{metric.delta}</p>
        </div>
      ))}
    </div>
  );
}
