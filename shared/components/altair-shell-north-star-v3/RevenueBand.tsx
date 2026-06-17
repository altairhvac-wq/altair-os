import type { PulseMetric } from "./sample-data";
import { v3EyebrowLightClass, v3FooterMetricClass, v3FooterSectionClass } from "./v3-tokens";

const toneStyles = {
  slate: "text-[#292218]",
  emerald: "text-emerald-800",
  amber: "text-amber-800",
} as const;

type RevenueBandProps = {
  metrics: PulseMetric[];
};

export function RevenueBand({ metrics }: RevenueBandProps) {
  return (
    <div className={v3FooterSectionClass}>
      <p className={`px-4 pt-4 sm:px-5 ${v3EyebrowLightClass}`}>Business pulse</p>
      <div className="mt-2 grid sm:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.id} className={v3FooterMetricClass}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(41,34,24,0.48)]">
              {metric.label}
            </p>
            <p className={`mt-0.5 text-lg font-bold tabular-nums ${toneStyles[metric.tone]}`}>{metric.value}</p>
            <p className="text-[11px] text-[rgba(41,34,24,0.58)]">{metric.delta}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
