import type { MissionControlChartSeries } from "@/shared/lib/dashboard-mission-control";
import { MissionControlInlineEmptyState } from "./MissionControlInlineEmptyState";

type MissionControlTrendChartProps = {
  series: MissionControlChartSeries;
};

export function MissionControlTrendChart({ series }: MissionControlTrendChartProps) {
  const maxValue = Math.max(...series.points.map((point) => point.value), 1);
  const hasData = series.points.some((point) => point.value > 0);

  return (
    <section
      className="admin-card overflow-hidden"
      aria-labelledby={`${series.id}-title`}
    >
      <div className="admin-section-header border-b border-slate-200/70 px-3 py-2.5 lg:px-4 lg:py-3">
        <h3
          id={`${series.id}-title`}
          className="admin-heading-section text-sm lg:text-base"
        >
          {series.title}
        </h3>
        <p className="admin-text-helper">{series.subtitle}</p>
      </div>
      <div className="admin-card-body">
        {!hasData ? (
          <MissionControlInlineEmptyState
            title={series.emptyTitle}
            description={series.emptyDescription}
          />
        ) : (
          <div
            role="img"
            aria-label={`${series.title} chart`}
            className="flex h-36 items-end gap-2 sm:gap-3"
          >
            {series.points.map((point) => {
              const height = Math.max((point.value / maxValue) * 100, point.value > 0 ? 8 : 2);

              return (
                <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <span className="text-[10px] font-semibold tabular-nums text-slate-600">
                    {series.valueFormatter(point.value)}
                  </span>
                  <div className="flex h-24 w-full items-end">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-cyan-600/80 to-cyan-400/70"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    {point.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
