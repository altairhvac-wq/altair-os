import Link from "next/link";
import {
  ArrowRight,
  Gauge,
  Info,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  buildOperationalMomentumSnapshot,
  type OperationalMomentumInput,
} from "@/shared/lib/dashboard-operational-momentum";
import type { OperationalHealthLabel } from "@/shared/types/operational-health-report";
import {
  getOperationalHealthLabelStyles,
  getOperationalHealthTrendStyles,
} from "@/shared/types/operational-health-report";

type OperationalMomentumSectionProps = {
  data: OperationalMomentumInput;
};

function getTrendIcon(direction: "improving" | "declining" | "stable") {
  switch (direction) {
    case "improving":
      return TrendingUp;
    case "declining":
      return TrendingDown;
    default:
      return Gauge;
  }
}

function MetricTile({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "positive" | "negative" | "neutral" | "info";
}) {
  const toneClass =
    tone === "positive"
      ? "border-emerald-100 bg-emerald-50/50"
      : tone === "negative"
        ? "border-rose-100 bg-rose-50/50"
        : tone === "info"
          ? "border-cyan-100 bg-cyan-50/40"
          : "border-slate-100 bg-white";

  return (
    <div className={`rounded-xl border px-2.5 py-2.5 max-lg:px-2.5 max-lg:py-2.5 sm:px-4 lg:py-3 ${toneClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-black tabular-nums tracking-tight text-slate-900 max-lg:text-sm lg:mt-1 lg:text-base xl:text-lg">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 text-xs font-medium leading-snug text-slate-600">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export function OperationalMomentumSection({
  data,
}: OperationalMomentumSectionProps) {
  const snapshot = buildOperationalMomentumSnapshot(data);
  const labelStyles = getOperationalHealthLabelStyles(
    snapshot.metrics.operationalHealthLabel as OperationalHealthLabel,
  );
  const trendStyles = getOperationalHealthTrendStyles(
    snapshot.metrics.trendDirection,
  );
  const TrendIcon = getTrendIcon(snapshot.metrics.trendDirection);
  const queueTrend = snapshot.metrics.queueResolutionTrend;

  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50/80 to-indigo-50/30 p-4 shadow-sm max-lg:p-4 lg:p-5">
      <div className="flex flex-col gap-3 max-lg:gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Operational momentum
            </p>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${trendStyles.className}`}
            >
              <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {snapshot.statusLabel}
            </span>
            {snapshot.dataQuality === "limited" ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                Limited trend data
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-end gap-2 max-lg:mt-2 max-lg:gap-2 lg:mt-3 lg:gap-3">
            <p
              className={`text-3xl font-black tabular-nums tracking-tight max-lg:text-3xl lg:text-4xl ${labelStyles.scoreClass}`}
            >
              {snapshot.metrics.operationalHealthScore}
            </p>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${labelStyles.badgeClass}`}
            >
              {snapshot.metrics.operationalHealthLabel}
            </span>
          </div>

          <h2 className="mt-2 text-base font-black tracking-tight text-slate-900 max-lg:mt-2 lg:mt-3 lg:text-lg xl:text-xl">
            {snapshot.headline}
          </h2>
          <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-slate-600 max-lg:line-clamp-3 lg:mt-2 lg:text-sm lg:line-clamp-none">
            {snapshot.explanation}
          </p>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-900 lg:mt-3 lg:text-sm">
            {snapshot.recommendedAction}
          </p>
        </div>

        <Link
          href={snapshot.primaryHref}
          className="mt-1 inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700"
        >
          Review focus area
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 max-lg:mt-4 max-lg:gap-2 sm:grid-cols-2 sm:gap-3 lg:mt-5 xl:grid-cols-4">
        {snapshot.metrics.improvingArea ? (
          <MetricTile
            label="Improving signal"
            value={snapshot.metrics.improvingArea.label}
            detail={`${snapshot.metrics.improvingArea.score}/100 · ${snapshot.metrics.improvingArea.detail ?? "Trending up"}`}
            tone="positive"
          />
        ) : snapshot.metrics.strongestArea ? (
          <MetricTile
            label="Strongest area"
            value={snapshot.metrics.strongestArea.label}
            detail={`${snapshot.metrics.strongestArea.score}/100`}
            tone="positive"
          />
        ) : null}

        {snapshot.metrics.decliningArea ? (
          <MetricTile
            label="Pressure area"
            value={snapshot.metrics.decliningArea.label}
            detail={`${snapshot.metrics.decliningArea.score}/100 · ${snapshot.metrics.decliningArea.detail ?? "Needs attention"}`}
            tone="negative"
          />
        ) : snapshot.metrics.weakestArea ? (
          <MetricTile
            label="Weakest area"
            value={snapshot.metrics.weakestArea.label}
            detail={`${snapshot.metrics.weakestArea.score}/100`}
            tone="negative"
          />
        ) : null}

        {queueTrend ? (
          <MetricTile
            label="Office cleanup trend"
            value={queueTrend.headline}
            detail={
              queueTrend.weekOverWeekDelta === 0
                ? `${queueTrend.detail} · ${queueTrend.weekOverWeekDelta} WoW`
                : `${queueTrend.detail} · ${queueTrend.weekOverWeekDelta > 0 ? "+" : ""}${queueTrend.weekOverWeekDelta} WoW`
            }
            tone={
              queueTrend.direction === "improving"
                ? "positive"
                : queueTrend.direction === "declining"
                  ? "negative"
                  : "neutral"
            }
          />
        ) : (
          <MetricTile
            label="Office cleanup trend"
            value="No history yet"
            detail="Resolution activity will appear after office cleanup events."
            tone="neutral"
          />
        )}

        {snapshot.metrics.invoicingBacklogCount !== null ? (
          <MetricTile
            label="Invoicing backlog"
            value={snapshot.metrics.invoicingBacklogCount}
            detail="Completed jobs awaiting invoice"
            tone="info"
          />
        ) : snapshot.metrics.stalledJobsCount !== null ? (
          <MetricTile
            label="Stalled jobs"
            value={snapshot.metrics.stalledJobsCount}
            detail="Current snapshot — no trend series"
            tone="info"
          />
        ) : (
          <MetricTile
            label="Backlog snapshot"
            value="Clear"
            detail="No invoicing backlog or stalled jobs flagged"
            tone="neutral"
          />
        )}
      </div>

      {snapshot.dataQuality === "limited" ? (
        <div
          className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-3"
          role="note"
        >
          <div className="flex items-start gap-2">
            <Minus className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-slate-600">
              Trend direction uses current operational health and backlog pressure.
              Office cleanup week-over-week comparison is not available until
              resolution events accumulate.
            </p>
          </div>
        </div>
      ) : null}

      {snapshot.limitations.length > 0 ? (
        <ul className="mt-4 space-y-1 border-t border-slate-200/80 pt-4 text-[11px] leading-relaxed text-slate-500">
          {snapshot.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
