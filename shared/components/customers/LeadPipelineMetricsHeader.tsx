"use client";

import {
  altairMcCardClass,
  altairMcCardPadClass,
  altairMcGridGapClass,
  altairMcMetricLabelClass,
  altairMcMetricValueClass,
  altairMcTileClass,
} from "@/shared/design-system/components";
import type { LeadPipelineMetrics } from "@/shared/lib/leads/lead-metrics";
import { formatPercent } from "@/shared/types/analytics";
import { formatLeadSource } from "@/shared/types/lead";

type LeadPipelineMetricsHeaderProps = {
  metrics: LeadPipelineMetrics;
};

function formatRate(value: number | null): string {
  if (value == null) {
    return "—";
  }

  return formatPercent(value, 1);
}

/**
 * MC v2 light-paper metrics row for the Customers hub Lead Pipeline tab.
 * Reuses buildLeadPipelineMetrics data; does not use Reports report-surface chrome.
 */
export function LeadPipelineMetricsHeader({
  metrics,
}: LeadPipelineMetricsHeaderProps) {
  const kpis = [
    { label: "Open", value: String(metrics.openLeads) },
    { label: "Won", value: String(metrics.wonLeads) },
    { label: "Lost", value: String(metrics.lostLeads) },
    { label: "Conversion", value: formatRate(metrics.conversionRate) },
    { label: "Follow-ups due", value: String(metrics.followUpsDue) },
  ];

  return (
    <div className={`min-w-0 space-y-3 ${altairMcGridGapClass}`}>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={altairMcTileClass}>
            <p className={altairMcMetricLabelClass}>{kpi.label}</p>
            <p className={`${altairMcMetricValueClass} text-xl sm:text-2xl`}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {metrics.topSourceInsight ? (
        <p className="text-xs text-altair-ink-on-paper-secondary">
          {metrics.topSourceInsight}
        </p>
      ) : null}

      {metrics.sourcePerformance.length > 0 ? (
        <div className={`${altairMcCardClass} overflow-hidden`}>
          <div
            className={`border-b border-altair-border ${altairMcCardPadClass} py-2.5`}
          >
            <h3 className="text-xs font-bold text-altair-ink-on-paper">
              Source performance
            </h3>
          </div>
          <ul className="divide-y divide-altair-border">
            {metrics.sourcePerformance.slice(0, 5).map((entry) => (
              <li
                key={entry.source}
                className="grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.7fr))] items-center gap-2 px-3.5 py-2.5"
              >
                <span className="truncate text-[13px] font-semibold text-altair-ink-on-paper">
                  {formatLeadSource(entry.source)}
                </span>
                <span className="text-right text-sm font-bold tabular-nums text-altair-ink-on-paper">
                  {entry.total}
                </span>
                <span className="text-right text-sm font-bold tabular-nums text-altair-ink-on-paper">
                  {entry.won}
                </span>
                <span className="text-right text-sm font-bold tabular-nums text-altair-ink-on-paper">
                  {formatRate(entry.conversionRate)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
