"use client";

import { GitBranch } from "lucide-react";
import {
  EmptyState,
  StatusPill,
  altairMcCardClass,
  altairMcCardPadClass,
  altairMcGridGapClass,
  altairMcMetricLabelClass,
  altairMcMetricValueClass,
  altairMcTileClass,
} from "@/shared/design-system/components";
import {
  MasterPageSurface,
  masterListPageScrollRegionClass,
  masterListPageSurfaceClass,
} from "@/shared/design-system/shell";
import type { EstimatePipelineMetrics } from "@/shared/lib/sales/estimate-pipeline-metrics";
import { formatPercent } from "@/shared/types/analytics";
import { formatCurrency } from "@/shared/types/customer";

/**
 * ============================== THE ROWS DO NOT COME HERE ANY MORE ==============================
 * This took three arrays -- two years of estimates, two years of invoices and
 * the payment ledger -- and reduced them to `metrics` in a useMemo. Nothing
 * else on the tab read them. Because this is a client component, every one of
 * those rows had to be serialised into the RSC payload to reach the reduction:
 * 6.7 MB and 34 seconds on the scale-seeded tenant, to render a dozen numbers
 * and a cohort table.
 *
 * buildEstimatePipelineMetrics is pure, so it now runs on the server and only
 * its result crosses the boundary. Same function, same inputs, same output.
 */
type EstimatePipelinePageViewProps = {
  metrics: EstimatePipelineMetrics;
};

function formatRate(value: number | null): string {
  if (value == null) {
    return "—";
  }

  return formatPercent(value, 1);
}

/**
 * Sales hub Estimate Pipeline tab — monthly estimate cohorts through linked
 * invoice + payment ledger. MC v2 light paper; no Reports dark chrome.
 */
export function EstimatePipelinePageView({
  metrics,
}: EstimatePipelinePageViewProps) {
  const hasCohorts = metrics.cohorts.length > 0;

  const summaryTiles = [
    {
      label: "Estimate $",
      value: formatCurrency(metrics.estimateTotal),
      detail:
        metrics.estimateCount === 0
          ? "No estimates yet"
          : `${metrics.estimateCount} estimate${metrics.estimateCount === 1 ? "" : "s"} by created month`,
    },
    {
      label: "Converted $",
      value: formatCurrency(metrics.convertedTotal),
      detail:
        metrics.convertedCount === 0
          ? "No linked active invoices"
          : `${metrics.convertedCount} linked invoice${metrics.convertedCount === 1 ? "" : "s"} (void excluded)`,
    },
    {
      label: "Paid $",
      value: formatCurrency(metrics.paidTotal),
      detail: "Payment ledger on estimate-linked invoices",
    },
    {
      label: "Settled conversion",
      value: formatRate(metrics.settledConversionRate),
      detail:
        metrics.settledCohortCount === 0
          ? "No cohorts past the 90-day maturity window yet"
          : `Converted $ / Estimate $ across ${metrics.settledCohortCount} settled cohort${metrics.settledCohortCount === 1 ? "" : "s"}`,
    },
  ];

  return (
    <MasterPageSurface
      variant="workspace"
      className={masterListPageSurfaceClass}
    >
      <div className={masterListPageScrollRegionClass}>
        <div className={`min-w-0 space-y-3 ${altairMcGridGapClass}`}>
          <p className="text-xs leading-snug text-altair-ink-on-paper-secondary">
            Tracks estimates through to invoice and payment — job-only invoices
            aren&apos;t included.
          </p>

          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {summaryTiles.map((tile) => (
              <div
                key={tile.label}
                className={altairMcTileClass}
                title={tile.detail}
              >
                <p className={altairMcMetricLabelClass}>{tile.label}</p>
                <p
                  className={`${altairMcMetricValueClass} text-xl sm:text-2xl`}
                >
                  {tile.value}
                </p>
                <p className="mt-1.5 text-[11px] leading-snug text-altair-ink-on-paper-muted">
                  {tile.detail}
                </p>
              </div>
            ))}
          </div>

          {!hasCohorts ? (
            <EmptyState
              title="No estimate cohorts yet"
              description="Create and date estimates to build monthly pipeline cohorts. Only invoices linked from an estimate appear here."
              icon={<GitBranch className="h-6 w-6" />}
            />
          ) : (
            <div className={`${altairMcCardClass} overflow-hidden`}>
              <div
                className={`border-b border-altair-border ${altairMcCardPadClass} py-2.5`}
              >
                <h3 className="text-xs font-bold text-altair-ink-on-paper">
                  Monthly cohorts
                </h3>
                <p className="mt-0.5 text-[11px] text-altair-ink-on-paper-muted">
                  Grouped by estimate created month. Outcomes settle 90 days
                  after the month ends.
                </p>
              </div>

              <div className="hidden border-b border-altair-border bg-[var(--surface-tile)] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-altair-ink-on-paper-muted sm:grid sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_repeat(3,minmax(0,1fr))_minmax(0,0.85fr)] sm:gap-2">
                <span>Cohort</span>
                <span>Status</span>
                <span className="text-right">Estimate $</span>
                <span className="text-right">Converted $</span>
                <span className="text-right">Paid $</span>
                <span className="text-right">Conversion</span>
              </div>

              <ul className="divide-y divide-altair-border">
                {metrics.cohorts.map((cohort) => {
                  const isInProgress = cohort.status === "in_progress";

                  return (
                    <li
                      key={cohort.key}
                      className="grid grid-cols-1 gap-2 px-3.5 py-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_repeat(3,minmax(0,1fr))_minmax(0,0.85fr)] sm:items-center sm:gap-2 sm:py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-altair-ink-on-paper">
                          {cohort.label}
                        </p>
                        <p className="mt-0.5 text-[11px] text-altair-ink-on-paper-muted">
                          {cohort.estimateCount} estimate
                          {cohort.estimateCount === 1 ? "" : "s"}
                          {cohort.lostCount != null && cohort.lostCount > 0
                            ? ` · ${cohort.lostCount} lost`
                            : ""}
                        </p>
                      </div>

                      <div>
                        <StatusPill
                          size="sm"
                          tone={isInProgress ? "info" : "neutral"}
                        >
                          {isInProgress ? "In progress" : "Settled"}
                        </StatusPill>
                      </div>

                      <div className="flex items-baseline justify-between gap-2 sm:block sm:text-right">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-altair-ink-on-paper-muted sm:hidden">
                          Estimate $
                        </span>
                        <span className="text-sm font-bold tabular-nums text-altair-ink-on-paper">
                          {formatCurrency(cohort.estimateTotal)}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between gap-2 sm:block sm:text-right">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-altair-ink-on-paper-muted sm:hidden">
                          Converted $
                        </span>
                        <span className="text-sm font-bold tabular-nums text-altair-ink-on-paper">
                          {formatCurrency(cohort.convertedTotal)}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between gap-2 sm:block sm:text-right">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-altair-ink-on-paper-muted sm:hidden">
                          Paid $
                        </span>
                        <span className="text-sm font-bold tabular-nums text-altair-ink-on-paper">
                          {formatCurrency(cohort.paidTotal)}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between gap-2 sm:block sm:text-right">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-altair-ink-on-paper-muted sm:hidden">
                          Conversion
                        </span>
                        <span
                          className="text-sm font-bold tabular-nums text-altair-ink-on-paper"
                          title={
                            isInProgress
                              ? "Conversion rate is not claimed until the cohort settles"
                              : undefined
                          }
                        >
                          {isInProgress ? "—" : formatRate(cohort.conversionRate)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </MasterPageSurface>
  );
}
