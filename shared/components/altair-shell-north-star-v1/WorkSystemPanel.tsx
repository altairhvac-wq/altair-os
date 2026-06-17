import type { JobInMotion, TechnicianPresence } from "@/shared/components/dashboard/north-star-v2/sample-data";
import { TeamPresenceDock } from "@/shared/components/dashboard/north-star-v2/TeamPresenceDock";
import type { OperationalHealthMetric } from "./sample-data";
import { shellEyebrowClass, shellInsetClass, shellZoneClass } from "./shell-tokens";

const statusStyles = {
  scheduled: { node: "bg-slate-600 ring-slate-500/40", chip: "bg-slate-800/80 text-slate-300", label: "Scheduled" },
  en_route: { node: "bg-sky-500 ring-sky-400/50 shadow-[0_0_16px_rgba(56,189,248,0.35)]", chip: "bg-sky-950/50 text-sky-200", label: "En route" },
  in_progress: { node: "bg-cyan-400 ring-cyan-300/50 shadow-[0_0_20px_rgba(34,211,238,0.4)]", chip: "bg-cyan-950/50 text-cyan-100", label: "In progress" },
  completed: { node: "bg-emerald-500/80 ring-emerald-400/40", chip: "bg-emerald-950/40 text-emerald-200", label: "Done" },
} as const;

const metricToneStyles = {
  cyan: "text-cyan-300/90",
  emerald: "text-emerald-300/90",
  amber: "text-amber-300/90",
  slate: "text-slate-400",
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
    <section aria-label="Work system" className={shellZoneClass}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-0 h-48 w-48 rounded-full bg-cyan-500/6 blur-3xl"
      />

      <div className="relative mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={shellEyebrowClass}>Dispatch & workflow</p>
          <p className="mt-1 text-base font-semibold tracking-tight text-slate-100">
            What work is moving today
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-950/70 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 ring-1 ring-cyan-500/20">
            {activeCount} active
          </span>
          <span className="rounded-full bg-slate-950/70 px-2.5 py-1 text-[11px] font-medium text-slate-400 ring-1 ring-slate-700/40">
            {health.label} · {health.score}
          </span>
        </div>
      </div>

      <div className="relative mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-slate-950/45 px-4 py-2.5 ring-1 ring-slate-800/50">
        {health.metrics.map((metric, index) => (
          <div key={metric.id} className="flex items-center gap-4">
            {index > 0 ? (
              <span className="hidden h-3 w-px bg-slate-700/80 sm:block" aria-hidden="true" />
            ) : null}
            <div className="flex items-baseline gap-2">
              <span className={`text-sm font-semibold tabular-nums ${metricToneStyles[metric.tone]}`}>
                {metric.value}
              </span>
              <span className="text-[11px] text-slate-500">{metric.label}</span>
              {metric.trend ? (
                <span className="hidden text-[10px] text-slate-600 lg:inline">· {metric.trend}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="relative flex flex-col gap-4 lg:flex-row lg:gap-5">
        <div className={`min-w-0 flex-1 overflow-hidden ${shellInsetClass}`}>
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Field route rail
          </p>
          <div className="overflow-x-auto pb-2">
            <div className="relative min-w-[36rem] px-2 pt-6">
              <div
                aria-hidden="true"
                className="absolute left-8 right-8 top-[2.15rem] h-0.5 rounded-full bg-slate-800"
              />
              <div
                aria-hidden="true"
                className="absolute left-8 top-[2.15rem] h-0.5 w-[58%] rounded-full bg-gradient-to-r from-cyan-400/60 to-indigo-400/40"
              />

              <ol className="relative flex justify-between gap-2">
                {jobs.map((job) => {
                  const style = statusStyles[job.status];
                  return (
                    <li key={job.id} className="flex w-[8.5rem] flex-col items-center gap-2.5 text-center">
                      <time className="text-xs font-semibold tabular-nums text-slate-500">{job.time}</time>
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
