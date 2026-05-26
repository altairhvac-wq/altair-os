import { AlertTriangle, ArrowRight, Gauge, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { OperationalHealthReport } from "@/shared/types/operational-health-report";
import {
  getOperationalHealthLabelStyles,
  getOperationalHealthTrendStyles,
} from "@/shared/types/operational-health-report";

type OperationalHealthSectionProps = {
  report: OperationalHealthReport;
  variant?: "full" | "compact";
};

function ReportLimitations({ report }: { report: OperationalHealthReport }) {
  if (report.meta.limitations.length === 0) {
    return null;
  }

  return (
    <div
      className="mt-4 rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2.5"
      role="note"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700"
          aria-hidden="true"
        />
        <ul className="space-y-1 text-xs text-amber-900/90">
          {report.meta.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TrendChip({ report }: { report: OperationalHealthReport }) {
  const styles = getOperationalHealthTrendStyles(report.operationalHealthTrend);
  const TrendIcon =
    report.operationalHealthTrend === "improving"
      ? TrendingUp
      : report.operationalHealthTrend === "declining"
        ? TrendingDown
        : Gauge;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles.className}`}
    >
      <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
      {styles.label}
    </span>
  );
}

export function OperationalHealthSection({
  report,
  variant = "full",
}: OperationalHealthSectionProps) {
  const labelStyles = getOperationalHealthLabelStyles(report.operationalHealthLabel);
  const topFactors = report.contributingFactors.slice(0, variant === "compact" ? 2 : 4);

  if (variant === "compact") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Operational health
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <p
                className={`text-4xl font-black tabular-nums tracking-tight ${labelStyles.scoreClass}`}
              >
                {report.operationalHealthScore}
              </p>
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${labelStyles.badgeClass}`}
              >
                {report.operationalHealthLabel}
              </span>
              <TrendChip report={report} />
            </div>
          </div>
          <Link
            href="/reports"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700"
          >
            View details
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-800/80">
              Top strength
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-950">
              {report.strongestOperationalArea.label}
            </p>
            <p className="mt-0.5 text-xs text-emerald-800/80">
              Area score {report.strongestOperationalArea.score}/100
            </p>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50/40 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-rose-800/80">
              Top risk
            </p>
            <p className="mt-1 text-sm font-semibold text-rose-950">
              {report.biggestOperationalRisk.label}
            </p>
            <p className="mt-0.5 text-xs text-rose-800/80">
              Area score {report.biggestOperationalRisk.score}/100
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Operational health</h2>
          <p className="mt-1 text-xs text-slate-500">
            Heuristic company score from queue, backlog, readiness, and cleanup signals
          </p>
        </div>
        <TrendChip report={report} />
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div>
          <p
            className={`text-5xl font-black tabular-nums tracking-tight ${labelStyles.scoreClass}`}
          >
            {report.operationalHealthScore}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-700">out of 100</p>
        </div>
        <span
          className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${labelStyles.badgeClass}`}
        >
          {report.operationalHealthLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-800/80">
            Strongest area
          </p>
          <p className="mt-1 text-sm font-semibold text-emerald-950">
            {report.strongestOperationalArea.label}
          </p>
          <p className="mt-0.5 text-xs text-emerald-800/80">
            {report.strongestOperationalArea.score}/100
          </p>
        </div>
        <div className="rounded-xl border border-rose-100 bg-rose-50/40 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-rose-800/80">
            Biggest risk
          </p>
          <p className="mt-1 text-sm font-semibold text-rose-950">
            {report.biggestOperationalRisk.label}
          </p>
          <p className="mt-0.5 text-xs text-rose-800/80">
            {report.biggestOperationalRisk.score}/100
          </p>
        </div>
      </div>

      {topFactors.length > 0 ? (
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Contributing factors
          </p>
          <ul className="mt-2 space-y-2">
            {topFactors.map((factor) => (
              <li
                key={factor.id}
                className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{factor.label}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{factor.detail}</p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold capitalize ${
                      factor.impact === "positive"
                        ? "text-emerald-700"
                        : factor.impact === "negative"
                          ? "text-rose-700"
                          : "text-slate-600"
                    }`}
                  >
                    {factor.impact}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ReportLimitations report={report} />
    </section>
  );
}
