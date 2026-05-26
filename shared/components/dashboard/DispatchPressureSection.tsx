import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  buildDispatchPressureSnapshot,
  type DispatchPressureInput,
  type DispatchPressureSeverity,
} from "@/shared/lib/dashboard-dispatch-pressure";

type DispatchPressureSectionProps = {
  data: DispatchPressureInput;
};

function getSeverityStyles(severity: DispatchPressureSeverity): {
  sectionClass: string;
  eyebrowClass: string;
  badgeClass: string;
  metricAccentClass: string;
  actionClass: string;
  Icon: typeof CheckCircle2;
} {
  switch (severity) {
    case "critical":
      return {
        sectionClass:
          "border-rose-200/80 bg-gradient-to-br from-rose-950 via-slate-900 to-slate-900",
        eyebrowClass: "text-rose-300/90",
        badgeClass: "bg-rose-500/20 text-rose-100 ring-rose-400/30",
        metricAccentClass: "border-rose-400/20 bg-rose-500/10",
        actionClass: "text-rose-200 hover:text-white",
        Icon: AlertCircle,
      };
    case "warning":
      return {
        sectionClass:
          "border-amber-200/80 bg-gradient-to-br from-amber-950 via-slate-900 to-slate-900",
        eyebrowClass: "text-amber-300/90",
        badgeClass: "bg-amber-500/20 text-amber-100 ring-amber-400/30",
        metricAccentClass: "border-amber-400/20 bg-amber-500/10",
        actionClass: "text-amber-200 hover:text-white",
        Icon: AlertTriangle,
      };
    default:
      return {
        sectionClass:
          "border-emerald-200/80 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900",
        eyebrowClass: "text-emerald-300/90",
        badgeClass: "bg-emerald-500/20 text-emerald-100 ring-emerald-400/30",
        metricAccentClass: "border-emerald-400/20 bg-emerald-500/10",
        actionClass: "text-emerald-200 hover:text-white",
        Icon: CheckCircle2,
      };
  }
}

function MetricTile({
  label,
  value,
  detail,
  accentClass,
}: {
  label: string;
  value: string | number;
  detail?: string;
  accentClass: string;
}) {
  return (
    <div className={`rounded-xl border px-3 py-3 sm:px-4 ${accentClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300/80">
        {label}
      </p>
      <p className="mt-1 text-xl font-black tabular-nums tracking-tight text-white sm:text-2xl">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 text-xs font-medium text-slate-300/80">{detail}</p>
      ) : null}
    </div>
  );
}

function CompactHealthySection({
  snapshot,
  StatusIcon,
}: {
  snapshot: ReturnType<typeof buildDispatchPressureSnapshot>;
  StatusIcon: typeof CheckCircle2;
}) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <StatusIcon className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700/90">
                Dispatch pressure
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                {snapshot.statusLabel}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold leading-snug text-slate-900">
              {snapshot.headline}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {snapshot.explanation}
            </p>
          </div>
        </div>

        <Link
          href={snapshot.primaryHref}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700"
        >
          Open dispatch
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

export function DispatchPressureSection({ data }: DispatchPressureSectionProps) {
  const snapshot = buildDispatchPressureSnapshot(data);
  const styles = getSeverityStyles(snapshot.severity);
  const StatusIcon = styles.Icon;

  if (snapshot.severity === "healthy") {
    return <CompactHealthySection snapshot={snapshot} StatusIcon={StatusIcon} />;
  }

  return (
    <section
      className={`rounded-2xl border p-5 text-white shadow-sm ${styles.sectionClass}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={`text-xs font-bold uppercase tracking-widest ${styles.eyebrowClass}`}
            >
              Dispatch pressure
            </p>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${styles.badgeClass}`}
            >
              <StatusIcon className="h-3 w-3" aria-hidden="true" />
              {snapshot.statusLabel}
            </span>
          </div>

          <h2 className="mt-2 text-lg font-black tracking-tight sm:text-xl">
            {snapshot.headline}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
            {snapshot.explanation}
          </p>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-white/90">
            {snapshot.recommendedAction}
          </p>
        </div>

        <Link
          href={snapshot.primaryHref}
          className={`mt-1 inline-flex shrink-0 items-center gap-1 text-xs font-semibold ${styles.actionClass}`}
        >
          Take action
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <MetricTile
          label="Scheduled today"
          value={snapshot.metrics.totalJobsToday}
          detail={
            snapshot.metrics.totalJobsToday > 0
              ? "On today's board"
              : "No jobs scheduled"
          }
          accentClass={styles.metricAccentClass}
        />
        <MetricTile
          label="Unassigned"
          value={snapshot.metrics.unassignedToday}
          detail={
            snapshot.metrics.unassignedToday > 0
              ? "Need a technician"
              : "All jobs assigned"
          }
          accentClass={styles.metricAccentClass}
        />
        <MetricTile
          label="Stalled jobs"
          value={snapshot.metrics.stalledJobs}
          detail={
            snapshot.metrics.stalledJobs > 0
              ? "May need dispatch follow-up"
              : "Field work moving"
          }
          accentClass={styles.metricAccentClass}
        />
        <MetricTile
          label="Overloaded techs"
          value={snapshot.metrics.overloadedTechnicianCount}
          detail={
            snapshot.metrics.overloadedTechnicianCount > 0
              ? "Multiple active jobs"
              : "No double-booking signal"
          }
          accentClass={styles.metricAccentClass}
        />
        <MetricTile
          label="Pipeline health"
          value={
            snapshot.metrics.pipelineFlowScore !== null
              ? `${snapshot.metrics.pipelineFlowScore}/100`
              : "—"
          }
          detail="Job pipeline flow score"
          accentClass={styles.metricAccentClass}
        />
        <MetricTile
          label="Readiness blockers"
          value={snapshot.metrics.readinessBlockers}
          detail={
            snapshot.metrics.readinessBlockers > 0
              ? "Schedule risk in queue"
              : "Queue looks ready"
          }
          accentClass={styles.metricAccentClass}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pt-4">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Drill down
        </span>
        {snapshot.drillDownLinks.map((link) => (
          <Link
            key={link.href + link.label}
            href={link.href}
            className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
          >
            {link.label === "Dispatch board" ? (
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            ) : link.label === "All jobs" ? (
              <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {link.label}
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
