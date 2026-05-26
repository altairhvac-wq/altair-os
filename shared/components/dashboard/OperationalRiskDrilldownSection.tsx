import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import {
  buildOperationalRiskDrilldown,
  getOperationalRiskDrilldownSummary,
  hasOperationalRiskDrilldown,
  type OperationalRiskDrilldownInput,
  type OperationalRiskDrilldownSeverity,
  type OperationalRiskExplanation,
} from "@/shared/lib/dashboard-operational-risk-drilldown";

type OperationalRiskDrilldownSectionProps = {
  data: OperationalRiskDrilldownInput;
};

function getRiskStyles(severity: OperationalRiskDrilldownSeverity): {
  cardClass: string;
  badgeClass: string;
  metricClass: string;
  Icon: typeof AlertCircle;
} {
  switch (severity) {
    case "critical":
      return {
        cardClass: "border-rose-200 bg-gradient-to-br from-rose-50/80 to-white",
        badgeClass: "bg-rose-100 text-rose-800",
        metricClass: "text-rose-700",
        Icon: AlertCircle,
      };
    default:
      return {
        cardClass: "border-amber-200 bg-gradient-to-br from-amber-50/60 to-white",
        badgeClass: "bg-amber-100 text-amber-800",
        metricClass: "text-amber-700",
        Icon: AlertTriangle,
      };
  }
}

function RiskCard({ risk }: { risk: OperationalRiskExplanation }) {
  const styles = getRiskStyles(risk.severity);
  const StatusIcon = styles.Icon;

  return (
    <li>
      <Link
        href={risk.href}
        className={`group block rounded-xl border p-3 shadow-sm transition-all hover:border-slate-300 hover:shadow-md max-lg:p-3 sm:p-5 ${styles.cardClass}`}
      >
        <div className="flex flex-col gap-3 max-lg:gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${styles.badgeClass}`}
              >
                <StatusIcon className="h-4 w-4" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-black text-slate-900">{risk.title}</h3>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles.badgeClass}`}
              >
                {risk.severity}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                {risk.affectedArea}
              </span>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-700 max-lg:line-clamp-3 lg:mt-3 lg:text-sm lg:line-clamp-none">
              {risk.reason}
            </p>

            <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-800 lg:mt-3">
              {risk.recommendedFollowUp}
            </p>
          </div>

          <div className="hidden shrink-0 lg:block lg:max-w-[11rem] lg:text-right">
            <p
              className={`text-xs font-bold uppercase tracking-wide ${styles.metricClass}`}
            >
              Supporting metric
            </p>
            <p className="mt-1 text-sm font-bold leading-snug text-slate-900">
              {risk.supportingMetric}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 group-hover:text-cyan-700">
              Drill down
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

export function OperationalRiskDrilldownSection({
  data,
}: OperationalRiskDrilldownSectionProps) {
  const risks = buildOperationalRiskDrilldown(data);
  const hasRisks = hasOperationalRiskDrilldown(data);
  const summary = getOperationalRiskDrilldownSummary(data);

  return (
    <section className="admin-card overflow-hidden">
      <div className="flex flex-col gap-1.5 border-b border-slate-100 px-4 py-3 max-lg:gap-1.5 sm:flex-row sm:items-end sm:justify-between lg:gap-2 lg:px-5 lg:py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600/90 lg:text-xs">
            Operational risk drilldown
          </p>
          <h2 className="text-base font-black tracking-tight text-slate-900 lg:text-lg">
            Why risks are flagged
          </h2>
          <p className="text-xs text-slate-500 lg:text-sm">
            {hasRisks
              ? `${summary.riskCount} active ${summary.riskCount === 1 ? "risk" : "risks"} explained from live dashboard data — weakest area: ${summary.biggestRiskLabel.toLowerCase()}.`
              : `Operational health is ${summary.healthScore}/100 — no material risks need explanation right now.`}
          </p>
        </div>
        <Link
          href="/reports"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700"
        >
          Full reports
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {hasRisks ? (
        <ul className="space-y-2 p-4 max-lg:space-y-2 lg:space-y-3 lg:p-5">
          {risks.map((risk) => (
            <RiskCard key={risk.id} risk={risk} />
          ))}
        </ul>
      ) : (
        <div className="p-4 lg:p-5">
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-3 lg:gap-3 lg:px-4 lg:py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-emerald-900">
                No operational risks need explanation
              </p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-800/80">
                Operational health is {summary.healthScore}/100 — office queue,
                billing, pipeline, and readiness signals are within normal
                ranges.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
