import Link from "next/link";
import { Truck, Users } from "lucide-react";
import type { JobInMotion, TechnicianPresence } from "@/shared/components/dashboard/north-star-v2/sample-data";
import {
  v3ColumnHeaderClass,
  v3ColumnRailClass,
  v3EyebrowLightClass,
  v3LabelMutedClass,
  v3LinkClass,
  v3MetaClass,
  v3RowClass,
  v3SurfaceInsetClass,
  v3WorkspaceSubheadingClass,
} from "./v3-tokens";

const jobStatusStyles = {
  in_progress: { label: "On site", dot: "bg-slate-600", text: "text-slate-700" },
  en_route: { label: "En route", dot: "bg-slate-500", text: "text-slate-600" },
  scheduled: { label: "Scheduled", dot: "bg-slate-400", text: "text-[rgba(41,34,24,0.55)]" },
  completed: { label: "Complete", dot: "bg-emerald-500", text: "text-emerald-700" },
} as const;

const techStateStyles = {
  on_job: { ring: "ring-[rgba(41,34,24,0.10)]", bg: "from-[#EFEAE2]/80 to-[#FBF9F5]" },
  available: { ring: "ring-emerald-200/80", bg: "from-emerald-50/80 to-[#FBF9F5]" },
  break: { ring: "ring-[rgba(41,34,24,0.10)]", bg: "from-[#EFEAE2]/60 to-[#FBF9F5]" },
  offline: { ring: "ring-[rgba(41,34,24,0.10)]", bg: "from-[#EFEAE2]/40 to-[#FBF9F5]" },
} as const;

type WorkColumnProps = {
  jobs: JobInMotion[];
  technicians: TechnicianPresence[];
};

export function WorkColumn({ jobs, technicians }: WorkColumnProps) {
  const activeCount = jobs.filter((j) => j.status === "in_progress" || j.status === "en_route").length;
  const completedToday = jobs.filter((j) => j.status === "completed").length;

  return (
    <div className="relative flex flex-col gap-4 border-t border-[rgba(184,148,63,0.12)] p-4 sm:p-5 lg:border-t-0 lg:p-6 lg:px-7">
      <div aria-hidden="true" className={v3ColumnRailClass} />
      <div className={v3ColumnHeaderClass}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-slate-600" aria-hidden="true" />
              <p className={v3EyebrowLightClass}>Work moving</p>
            </div>
            <h3 className={`mt-1 ${v3WorkspaceSubheadingClass}`}>
              {activeCount} calls active · {completedToday} ready to bill
            </h3>
            <p className="text-xs text-[rgba(41,34,24,0.65)]">Today&apos;s dispatch board · HVAC service & install</p>
          </div>
          <Link href="/dispatch" className={`shrink-0 ${v3LinkClass}`}>
            Dispatch
          </Link>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {jobs.map((job) => {
          const status = jobStatusStyles[job.status];
          return (
            <li key={job.id}>
              <Link href="/jobs" className={`group flex items-center gap-3 ${v3RowClass}`}>
                <span className="w-10 shrink-0 text-sm font-semibold tabular-nums text-[rgba(41,34,24,0.65)]">
                  {job.time}
                </span>
                <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#292218] group-hover:text-[#1a1612]">
                    {job.customer}
                  </p>
                  <p className={`truncate ${v3MetaClass}`}>
                    {job.job} · {job.technician}
                  </p>
                </div>
                <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${status.text}`}>
                  {status.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto border-t border-[rgba(184,148,63,0.12)] pt-3">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-[rgba(41,34,24,0.50)]" aria-hidden="true" />
          <p className={v3LabelMutedClass}>Crew load → dispatch pressure</p>
        </div>
        <ul className="mt-2 grid grid-cols-2 gap-2">
          {technicians.map((tech) => {
            const style = techStateStyles[tech.state];
            return (
              <li key={tech.id} className={`flex items-center gap-2 ${v3SurfaceInsetClass} bg-gradient-to-r ${style.bg} ${style.ring}`}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#EFEAE2] text-[9px] font-semibold text-[#292218]">
                  {tech.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-[#3D3428]">{tech.name.split(" ")[0]}</p>
                  <p className="truncate text-[10px] text-[rgba(41,34,24,0.65)]">{tech.jobLabel}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
