import type { JobInMotion, TechnicianPresence } from "@/shared/components/dashboard/north-star-v2/sample-data";
import { TeamPresenceDock } from "@/shared/components/dashboard/north-star-v2/TeamPresenceDock";
import type { OperationalHealthMetric } from "./sample-data";

const statusStyles = {
  scheduled: { node: "bg-slate-600 ring-slate-500/40", chip: "bg-slate-700/80 text-slate-300", label: "Scheduled" },
  en_route: { node: "bg-sky-500 ring-sky-400/50 shadow-[0_0_16px_rgba(56,189,248,0.35)]", chip: "bg-sky-900/50 text-sky-200", label: "En route" },
  in_progress: { node: "bg-cyan-400 ring-cyan-300/50 shadow-[0_0_20px_rgba(34,211,238,0.4)]", chip: "bg-cyan-900/50 text-cyan-100", label: "In progress" },
  completed: { node: "bg-emerald-500/80 ring-emerald-400/40", chip: "bg-emerald-900/40 text-emerald-200", label: "Done" },
} as const;

const metricToneStyles = {
  cyan: "text-cyan-300",
  emerald: "text-emerald-300",
  amber: "text-amber-300",
  slate: "text-slate-300",
} as const;

type WorkSystemPanelProps = {
  jobs: JobInMotion[];
  technicians: TechnicianPresence[];
  health: {
    score: number;
    label: string;
    metrics: OperationalHealthMetric[];
  };
};

export function WorkSystemPanel({ jobs, technicians, health }: WorkSystemPanelProps) {
  const activeCount = jobs.filter((j) => j.status !== "completed").length;

  return (
    <section
      aria-label="Work system"
      className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-4 ring-1 ring-slate-700/40 sm:p-5 lg:p-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-0 h-48 w-48 rounded-full bg-cyan-500/8 blur-3xl"
      />

      <div className="relative mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/70">
            Work in motion
          </p>
          <p className="mt-1 text-sm font-medium text-slate-200">Today&apos;s field operations</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 ring-1 ring-cyan-500/20">
            {activeCount} active
          </span>
          <span className="rounded-full bg-emerald-950/60 px-2.5 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/20">
            {health.label} · {health.score}
          </span>
        </div>
      </div>

      <div className="relative mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {health.metrics.map((metric) => (
          <div
            key={metric.id}
            className="rounded-xl bg-slate-800/50 px-3 py-2.5 ring-1 ring-slate-700/40"
          >
            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{metric.label}</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${metricToneStyles[metric.tone]}`}>
              {metric.value}
            </p>
            {metric.trend ? (
              <p className="mt-0.5 text-[10px] text-slate-500">{metric.trend}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="relative flex flex-col gap-4 lg:flex-row lg:gap-5">
        <div className="min-w-0 flex-1 overflow-hidden rounded-xl bg-slate-950/50 p-4 ring-1 ring-slate-700/30">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Field route rail
          </p>
          <div className="overflow-x-auto pb-2">
            <div className="relative min-w-[36rem] px-2 pt-6">
              <div
                aria-hidden="true"
                className="absolute left-8 right-8 top-[2.15rem] h-0.5 rounded-full bg-slate-700"
              />
              <div
                aria-hidden="true"
                className="absolute left-8 top-[2.15rem] h-0.5 w-[58%] rounded-full bg-gradient-to-r from-cyan-400/70 to-sky-400/50"
              />

              <ol className="relative flex justify-between gap-2">
                {jobs.map((job) => {
                  const style = statusStyles[job.status];
                  return (
                    <li key={job.id} className="flex w-[8.5rem] flex-col items-center gap-2.5 text-center">
                      <time className="text-xs font-semibold tabular-nums text-slate-400">{job.time}</time>
                      <span
                        className={`block h-3.5 w-3.5 rounded-full ring-2 ring-offset-2 ring-offset-slate-950 ${style.node}`}
                        aria-hidden="true"
                      />
                      <div className="flex min-h-[4rem] flex-col gap-0.5">
                        <p className="line-clamp-1 text-sm font-semibold text-slate-100">{job.customer}</p>
                        <p className="line-clamp-2 text-[11px] leading-snug text-slate-500">{job.job}</p>
                        {job.technician ? (
                          <p className="text-[10px] text-slate-600">{job.technician}</p>
                        ) : null}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${style.chip}`}>
                        {style.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>

        <TeamPresenceDock technicians={technicians} />
      </div>
    </section>
  );
}
