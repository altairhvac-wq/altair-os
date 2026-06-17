import type { JobInMotion } from "./sample-data";

const statusStyles = {
  scheduled: {
    node: "bg-slate-600 ring-slate-500/40",
    pulse: "",
    label: "Scheduled",
    chip: "bg-slate-100 text-slate-600",
  },
  en_route: {
    node: "bg-sky-500 ring-sky-400/50 shadow-[0_0_16px_rgba(56,189,248,0.35)]",
    pulse: "",
    label: "En route",
    chip: "bg-sky-50 text-sky-700",
  },
  in_progress: {
    node: "bg-cyan-400 ring-cyan-300/50 shadow-[0_0_20px_rgba(34,211,238,0.4)]",
    pulse: "",
    label: "In progress",
    chip: "bg-cyan-50 text-cyan-800",
  },
  completed: {
    node: "bg-emerald-500/80 ring-emerald-400/40",
    pulse: "",
    label: "Done",
    chip: "bg-emerald-50 text-emerald-700",
  },
} as const;

type WorkFlowRailProps = {
  jobs: JobInMotion[];
};

export function WorkFlowRail({ jobs }: WorkFlowRailProps) {
  return (
    <section
      aria-label="Work in motion"
      className="relative min-w-0 flex-1 overflow-hidden rounded-2xl bg-white/70 p-4 shadow-[0_8px_40px_-16px_rgba(15,23,42,0.12),0_0_0_1px_rgba(148,163,184,0.08)] backdrop-blur-sm sm:p-5"
    >
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Work in motion
          </p>
          <p className="mt-1 text-sm font-medium text-slate-700">Today&apos;s field route</p>
        </div>
        <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-800">
          {jobs.filter((j) => j.status !== "completed").length} active
        </span>
      </div>

      <div className="relative overflow-x-auto pb-2">
        <div className="relative min-w-[36rem] px-2 pt-8">
          <div
            aria-hidden="true"
            className="absolute left-8 right-8 top-[2.65rem] h-1 rounded-full bg-gradient-to-r from-cyan-200 via-sky-200 to-emerald-200"
          />
          <div
            aria-hidden="true"
            className="absolute left-8 top-[2.65rem] h-1 w-[58%] rounded-full bg-gradient-to-r from-cyan-400/60 to-sky-400/40"
          />

          <ol className="relative flex justify-between gap-2">
            {jobs.map((job) => {
              const style = statusStyles[job.status];
              return (
                <li
                  key={job.id}
                  className="flex w-[8.5rem] flex-col items-center gap-3 text-center"
                >
                  <time className="text-xs font-semibold tabular-nums text-slate-500">
                    {job.time}
                  </time>
                  <div className="relative">
                    <span
                      className={`block h-4 w-4 rounded-full ring-2 ring-offset-2 ring-offset-white ${style.node} ${style.pulse}`}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex min-h-[4.5rem] flex-col gap-1">
                    <p className="line-clamp-1 text-sm font-semibold text-slate-900">
                      {job.customer}
                    </p>
                    <p className="line-clamp-2 text-[11px] leading-snug text-slate-500">
                      {job.job}
                    </p>
                    {job.technician ? (
                      <p className="text-[10px] text-slate-400">{job.technician}</p>
                    ) : null}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${style.chip}`}
                  >
                    {style.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
