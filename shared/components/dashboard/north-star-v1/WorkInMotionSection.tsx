import type { JobInMotion, TechnicianPresence } from "./sample-data";

const jobStatusLabel = {
  scheduled: "Scheduled",
  en_route: "En route",
  in_progress: "In progress",
  completed: "Completed",
} as const;

const jobStatusClass = {
  scheduled: "bg-slate-100 text-slate-600",
  en_route: "bg-sky-50 text-sky-700",
  in_progress: "bg-cyan-50 text-cyan-800",
  completed: "bg-emerald-50 text-emerald-700",
} as const;

const technicianStateLabel = {
  on_job: "On job",
  available: "Available",
  break: "On break",
} as const;

type WorkInMotionSectionProps = {
  jobs: JobInMotion[];
  technicians: TechnicianPresence[];
};

export function WorkInMotionSection({ jobs, technicians }: WorkInMotionSectionProps) {
  return (
    <section aria-labelledby="work-in-motion-heading" className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h2
          id="work-in-motion-heading"
          className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl"
        >
          Work in motion
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
          Today&apos;s field rhythm — jobs and crew presence without spreadsheet
          density.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)] lg:gap-12">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
            Today&apos;s jobs
          </p>
          <ul className="flex flex-col gap-1">
            {jobs.map((job) => (
              <li
                key={job.id}
                className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-slate-50/70 sm:grid-cols-[5rem_minmax(0,1fr)_auto_auto] sm:gap-4 sm:px-3"
              >
                <time className="text-sm font-medium tabular-nums text-slate-500">
                  {job.time}
                </time>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {job.customer}
                  </p>
                  <p className="truncate text-xs text-slate-500">{job.job}</p>
                </div>
                {job.technician ? (
                  <p className="hidden truncate text-xs text-slate-400 sm:block sm:max-w-[7rem]">
                    {job.technician}
                  </p>
                ) : null}
                <span
                  className={`inline-flex w-fit shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${jobStatusClass[job.status]}`}
                >
                  {jobStatusLabel[job.status]}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3 lg:border-l lg:border-slate-100 lg:pl-10">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
            Crew presence
          </p>
          <ul className="flex flex-col gap-4">
            {technicians.map((tech) => (
              <li key={tech.id} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                  {tech.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {tech.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {tech.jobLabel ?? technicianStateLabel[tech.state]}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-slate-400">
                  {technicianStateLabel[tech.state]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
