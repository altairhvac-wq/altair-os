"use client";

import type { PulseMetric } from "./sample-data";
import { usePaletteTokens } from "./palette-context";

type ColorLabRevenueBandProps = {
  metrics: PulseMetric[];
};

export function ColorLabRevenueBand({ metrics }: ColorLabRevenueBandProps) {
  const t = usePaletteTokens();

  const toneStyles = {
    slate: "",
    emerald: t.metricToneEmerald,
    amber: t.metricToneAmber,
  } as const;

  return (
    <div className={t.footerSection}>
      <p className={`px-4 pt-4 sm:px-5 ${t.eyebrowLight}`}>Business pulse</p>
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
