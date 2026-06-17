import Link from "next/link";
import { ArrowUpRight, Truck, Users } from "lucide-react";
import type { JobInMotion, TechnicianPresence } from "@/shared/components/dashboard/north-star-v2/sample-data";
import { missionZoneClass, missionEyebrowClass } from "./mission-tokens";

const jobStatusStyles = {
  in_progress: { label: "In progress", dot: "bg-cyan-400", text: "text-cyan-300" },
  en_route: { label: "En route", dot: "bg-indigo-400", text: "text-indigo-300" },
  scheduled: { label: "Scheduled", dot: "bg-slate-500", text: "text-slate-400" },
  completed: { label: "Done", dot: "bg-emerald-400", text: "text-emerald-300" },
} as const;

const techStateStyles = {
  on_job: { ring: "ring-cyan-500/40", bg: "from-cyan-500/20 to-slate-800" },
  available: { ring: "ring-emerald-500/30", bg: "from-emerald-500/15 to-slate-800" },
  break: { ring: "ring-slate-600/30", bg: "from-slate-600/20 to-slate-800" },
  offline: { ring: "ring-slate-700/30", bg: "from-slate-700/20 to-slate-800" },
} as const;

type WorkCommandBoardProps = {
  jobs: JobInMotion[];
  technicians: TechnicianPresence[];
};

export function WorkCommandBoard({ jobs, technicians }: WorkCommandBoardProps) {
  const activeCount = jobs.filter((j) => j.status === "in_progress" || j.status === "en_route").length;

  return (
    <section aria-label="Work moving" className={missionZoneClass}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 top-0 h-36 w-36 rounded-full bg-cyan-500/6 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/15 to-transparent"
      />

      <div className="relative flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-cyan-400/80" aria-hidden="true" />
              <p className={missionEyebrowClass}>Work moving</p>
            </div>
            <h2 className="mt-1 text-lg font-semibold text-white">
              {activeCount} jobs in motion today
            </h2>
          </div>
          <Link
            href="/dispatch"
            className="shrink-0 text-xs font-medium text-cyan-400/80 transition-colors hover:text-cyan-300"
          >
            Open dispatch
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <ul className="flex flex-col gap-2">
            {jobs.map((job) => {
              const status = jobStatusStyles[job.status];
              return (
                <li key={job.id}>
                  <Link
                    href="/jobs"
                    className="group flex items-center gap-3 rounded-xl bg-slate-950/40 px-3.5 py-3 ring-1 ring-slate-800/35 transition-all hover:bg-slate-900/50 hover:ring-slate-700/45"
                  >
                    <span className="w-10 shrink-0 text-sm font-semibold tabular-nums text-slate-500">
                      {job.time}
                    </span>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-200 group-hover:text-white">
                        {job.customer}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {job.job} · {job.technician}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-medium uppercase tracking-wide ${status.text}`}>
                      {status.label}
                    </span>
                    <ArrowUpRight
                      className="h-3.5 w-3.5 shrink-0 text-slate-600 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-400"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="lg:w-[11rem] lg:shrink-0">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                Crew load
              </p>
            </div>
            <ul className="mt-2.5 flex flex-col gap-2">
              {technicians.map((tech) => {
                const style = techStateStyles[tech.state];
                return (
                  <li
                    key={tech.id}
                    className={`flex items-center gap-2.5 rounded-xl bg-gradient-to-r ${style.bg} px-3 py-2.5 ring-1 ${style.ring}`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-950/60 text-[10px] font-semibold text-slate-300">
                      {tech.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-slate-300">{tech.name.split(" ")[0]}</p>
                      <p className="truncate text-[10px] text-slate-500">{tech.jobLabel}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
