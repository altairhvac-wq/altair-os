import type { MissionControlChartSeries } from "@/shared/lib/dashboard-mission-control";

type MissionControlInlineTrendProps = {
  series: MissionControlChartSeries;
};

/**
 * Simplified chart content for Business Health — no Surface 2 card chrome.
 * Lives inside the parent Surface 1 section.
 */
export function MissionControlInlineTrend({ series }: MissionControlInlineTrendProps) {
  const maxValue = Math.max(...series.points.map((point) => point.value), 1);
  const hasData = series.points.some((point) => point.value > 0);
  const accessibleSummary = series.points
    .map((point) => `${point.label} ${series.valueFormatter(point.value)}`)
    .join(", ");

  if (!hasData) {
    return null;
  }

  return (
    <div className="mt-5 border-t border-slate-200/60 pt-4">
      <p className="text-[11px] font-medium text-slate-500 sm:text-xs">{series.subtitle}</p>
      <div
        role="img"
        aria-label={`${series.title}: ${accessibleSummary}`}
        className="mt-3 flex h-20 items-end gap-2 sm:gap-2.5"
      >
        {series.points.map((point) => {
          const height = Math.max(
            (point.value / maxValue) * 100,
            point.value > 0 ? 8 : 2,
          );

          return (
            <div
              key={point.label}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <span className="text-[10px] font-semibold tabular-nums text-slate-600">
                {series.valueFormatter(point.value)}
              </span>
              <div className="flex h-12 w-full items-end">
                <div
                  className="w-full rounded-t-sm bg-slate-400/70"
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="text-center text-[10px] font-medium uppercase tracking-wide text-slate-500">
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="sr-only">{accessibleSummary}</p>
    </div>
  );
}
