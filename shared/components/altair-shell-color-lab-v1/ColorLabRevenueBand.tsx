"use client";

import type { PulseMetric } from "./sample-data";
import { usePaletteTokens } from "./palette-context";

const toneStyles = {
  slate: "",
  emerald: "text-emerald-800",
  amber: "text-amber-800",
} as const;

type ColorLabRevenueBandProps = {
  metrics: PulseMetric[];
};

export function ColorLabRevenueBand({ metrics }: ColorLabRevenueBandProps) {
  const t = usePaletteTokens();

  return (
    <div className={`${t.footerSection} px-2 pb-2 pt-4 sm:px-3 sm:pb-3`}>
      <p className={`px-2 sm:px-3 ${t.eyebrowLight}`}>Business pulse</p>
      <div className="mt-2 grid sm:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.id} className={t.footerMetric}>
            <p className={t.metricLabel}>{metric.label}</p>
            <p
              className={`mt-0.5 text-lg font-bold tabular-nums ${toneStyles[metric.tone] || t.workspaceSubheading}`}
            >
              {metric.value}
            </p>
            <p className={t.metricDelta}>{metric.delta}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
