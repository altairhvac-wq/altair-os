"use client";

import { AlertTriangle, BarChart3, Briefcase, Clock, TrendingUp } from "lucide-react";
import { formatCompactCurrency } from "@/shared/types/analytics";
import { formatCurrency } from "@/shared/types/customer";
import { formatJobProfitabilityLaborHours } from "@/shared/types/job-profitability";
import type {
  ReportChartSeries,
  ReportChartSeriesBundle,
  ReportChartValueFormat,
  ReportOperationalChart,
  ReportSectionMeta,
} from "@/shared/types/reports";

type OperationalChartsSectionProps = {
  charts: ReportChartSeriesBundle;
};

type SeriesStyle = {
  barClassName: string;
  legendClassName: string;
};

const CHART_ICONS = {
  "revenue-over-time": TrendingUp,
  "expenses-over-time": BarChart3,
  "jobs-over-time": Briefcase,
  "labor-over-time": Clock,
} as const;

const CHART_SERIES_STYLES: Record<string, SeriesStyle[]> = {
  "revenue-over-time": [
    { barClassName: "fill-emerald-400/85", legendClassName: "bg-emerald-400" },
    { barClassName: "fill-cyan-400/80", legendClassName: "bg-cyan-400" },
  ],
  "expenses-over-time": [
    { barClassName: "fill-blue-400/80", legendClassName: "bg-blue-400" },
    { barClassName: "fill-emerald-400/85", legendClassName: "bg-emerald-400" },
  ],
  "jobs-over-time": [
    { barClassName: "fill-indigo-400/85", legendClassName: "bg-indigo-400" },
    { barClassName: "fill-emerald-400/85", legendClassName: "bg-emerald-400" },
  ],
  "labor-over-time": [
    { barClassName: "fill-violet-400/85", legendClassName: "bg-violet-400" },
  ],
};

function formatChartValue(
  value: number,
  format: ReportChartValueFormat,
): string {
  switch (format) {
    case "currency":
      return formatCompactCurrency(value);
    case "hours":
      return formatJobProfitabilityLaborHours(value);
    case "count":
      return String(Math.round(value));
    default:
      return String(value);
  }
}

function formatChartDetailValue(
  value: number,
  format: ReportChartValueFormat,
): string {
  if (format === "currency") {
    return formatCurrency(value);
  }

  return formatChartValue(value, format);
}

function chartHasData(chart: ReportOperationalChart): boolean {
  return chart.series.some((series) =>
    series.points.some((point) => point.value > 0),
  );
}

function resolveScopeLabel(meta: ReportSectionMeta): string {
  if (meta.dateBounds == null) {
    return "All time";
  }

  return `${meta.dateBounds.startDate} – ${meta.dateBounds.endDate}`;
}

function ChartLimitations({ limitations }: { limitations: string[] }) {
  if (limitations.length === 0) {
    return null;
  }

  return (
    <div
      className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2.5"
      role="note"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700"
          aria-hidden="true"
        />
        <ul className="space-y-1 text-xs text-amber-900/90">
          {limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function getSeriesMaxValue(series: ReportChartSeries[]): number {
  const values = series.flatMap((item) =>
    item.points.map((point) => point.value),
  );

  return Math.max(...values, 1);
}

function shouldShowBucketLabel(index: number, total: number): boolean {
  if (total <= 8) {
    return true;
  }

  if (total <= 16) {
    return index % 2 === 0 || index === total - 1;
  }

  return index % 4 === 0 || index === total - 1;
}

function ReportTimeSeriesChartCard({ chart }: { chart: ReportOperationalChart }) {
  const Icon = CHART_ICONS[chart.id as keyof typeof CHART_ICONS] ?? BarChart3;
  const styles = CHART_SERIES_STYLES[chart.id] ?? [];
  const pointCount = chart.series[0]?.points.length ?? 0;
  const maxValue = getSeriesMaxValue(chart.series);
  const chartHeight = 180;
  const hasData = chartHasData(chart);
  const recentPoints = chart.series[0]?.points.slice(-3) ?? [];

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-700" aria-hidden="true" />
          <h3 className="text-base font-bold text-slate-900">{chart.title}</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">{chart.subtitle}</p>
      </div>

      <div className="p-4 sm:p-5">
        {!hasData ? (
          <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center">
            <p className="text-sm text-slate-500">
              No {chart.valueFormat === "count" ? "activity" : "data"} in this
              period.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div
                className="relative min-w-[280px]"
                style={{ height: chartHeight }}
              >
                <div className="absolute inset-0 flex flex-col justify-between">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="border-t border-dashed border-slate-100"
                    />
                  ))}
                </div>

                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full overflow-visible"
                  role="img"
                  aria-label={chart.title}
                >
                  {chart.series[0]?.points.map((point, index) => {
                    const groupWidth = 100 / Math.max(pointCount, 1);
                    const seriesCount = chart.series.length;
                    const barWidth = groupWidth / (seriesCount + 1.5);
                    const groupStart = index * groupWidth + barWidth * 0.35;

                    return (
                      <g key={point.bucketStart}>
                        {chart.series.map((series, seriesIndex) => {
                          const value = series.points[index]?.value ?? 0;
                          const barHeight = (value / maxValue) * 100;
                          const x = groupStart + seriesIndex * (barWidth + 0.5);

                          return (
                            <rect
                              key={`${point.bucketStart}-${series.key}`}
                              x={x}
                              y={100 - barHeight}
                              width={barWidth}
                              height={barHeight}
                              className={
                                styles[seriesIndex]?.barClassName ??
                                "fill-slate-300"
                              }
                              rx="1"
                            />
                          );
                        })}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-3 text-xs">
                {chart.series.map((series, index) => (
                  <span
                    key={series.key}
                    className="inline-flex items-center gap-2 font-semibold text-slate-600"
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-sm ${
                        styles[index]?.legendClassName ?? "bg-slate-300"
                      }`}
                    />
                    {series.label}
                  </span>
                ))}
              </div>

              <div className="flex min-w-0 flex-wrap gap-2">
                {chart.series[0]?.points.map((point, index) =>
                  shouldShowBucketLabel(index, pointCount) ? (
                    <span
                      key={point.bucketStart}
                      className="text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                    >
                      {point.label}
                    </span>
                  ) : null,
                )}
              </div>
            </div>

            {recentPoints.length > 0 ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {recentPoints.map((point) => (
                  <div
                    key={point.bucketStart}
                    className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {point.label}
                    </p>
                    <div className="mt-1 space-y-0.5">
                      {chart.series.map((series) => {
                        const value =
                          series.points.find(
                            (entry) => entry.bucketStart === point.bucketStart,
                          )?.value ?? 0;

                        return (
                          <p
                            key={series.key}
                            className="truncate text-xs font-semibold text-slate-700"
                          >
                            <span className="text-slate-500">
                              {series.label}:{" "}
                            </span>
                            {formatChartDetailValue(value, chart.valueFormat)}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}

        <ChartLimitations limitations={chart.limitations} />
      </div>
    </section>
  );
}

export function OperationalChartsSection({
  charts,
}: OperationalChartsSectionProps) {
  const chartItems = [charts.revenue, charts.expenses, charts.jobs, charts.labor];

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-bold text-slate-900">Operational trends</h2>
        <p className="mt-1 text-xs text-slate-500">
          Company-scoped time series from live records ·{" "}
          {resolveScopeLabel(charts.meta)}
        </p>
        <ChartLimitations limitations={charts.meta.limitations} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {chartItems.map((chart) => (
          <ReportTimeSeriesChartCard key={chart.id} chart={chart} />
        ))}
      </div>
    </section>
  );
}
