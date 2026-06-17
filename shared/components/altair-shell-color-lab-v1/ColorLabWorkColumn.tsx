"use client";

import Link from "next/link";
import { Truck, Users } from "lucide-react";
import type { JobInMotion, TechnicianPresence } from "@/shared/components/dashboard/north-star-v2/sample-data";
import { usePaletteTokens } from "./palette-context";

const jobStatusStyles = {
  in_progress: { label: "On site", dot: "bg-slate-600", text: "text-slate-700" },
  en_route: { label: "En route", dot: "bg-slate-500", text: "text-slate-600" },
  scheduled: { label: "Scheduled", dot: "bg-slate-400", text: "text-slate-500" },
  completed: { label: "Complete", dot: "bg-emerald-500", text: "text-emerald-700" },
} as const;

const techStateStyles = {
  on_job: { ring: "ring-slate-200", bg: "from-slate-50 to-white" },
  available: { ring: "ring-emerald-200/80", bg: "from-emerald-50/80 to-white" },
  break: { ring: "ring-slate-200", bg: "from-slate-50/80 to-white" },
  offline: { ring: "ring-slate-200", bg: "from-slate-50/60 to-white" },
} as const;

type ColorLabWorkColumnProps = {
  jobs: JobInMotion[];
  technicians: TechnicianPresence[];
};

export function ColorLabWorkColumn({ jobs, technicians }: ColorLabWorkColumnProps) {
  const t = usePaletteTokens();
  const activeCount = jobs.filter((j) => j.status === "in_progress" || j.status === "en_route").length;
  const completedToday = jobs.filter((j) => j.status === "completed").length;

  return (
    <div className={`relative flex flex-col gap-4 border-t ${t.columnDivider} p-4 sm:p-5 lg:border-t-0 lg:p-6 lg:px-7`}>
      <div aria-hidden="true" className={t.columnRail} />
      <div className={t.columnHeader}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-slate-600" aria-hidden="true" />
              <p className={t.eyebrowLight}>Work moving</p>
            </div>
            <h3 className={`mt-1 ${t.workspaceSubheading}`}>
              {activeCount} calls active · {completedToday} ready to bill
            </h3>
            <p className={`text-xs ${t.meta}`}>Today&apos;s dispatch board · HVAC service & install</p>
          </div>
          <Link href="/dispatch" className={`shrink-0 ${t.link}`}>
            Dispatch
          </Link>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {jobs.map((job) => {
          const status = jobStatusStyles[job.status];
          return (
            <li key={job.id}>
              <Link href="/jobs" className={`group flex items-center gap-3 ${t.row}`}>
                <span className={`w-10 shrink-0 text-sm font-semibold tabular-nums ${t.meta}`}>
                  {job.time}
                </span>
                <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${t.workspaceSubheading} group-hover:opacity-90`}>
                    {job.customer}
                  </p>
                  <p className={`truncate ${t.meta}`}>
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

      <div className={`mt-auto border-t ${t.columnDivider} pt-3`}>
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <p className={t.labelMuted}>Crew load → dispatch pressure</p>
        </div>
        <ul className="mt-2 grid grid-cols-2 gap-2">
          {technicians.map((tech) => {
            const style = techStateStyles[tech.state];
            return (
              <li
                key={tech.id}
                className={`flex items-center gap-2 ${t.surfaceInset} bg-gradient-to-r ${style.bg} ring-1 ${style.ring}`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[9px] font-semibold ${t.workspaceSubheading} ${t.techAvatarBg}`}
                >
                  {tech.initials}
                </span>
                <div className="min-w-0">
                  <p className={`truncate text-[11px] font-semibold ${t.bodyPrimary}`}>
                    {tech.name.split(" ")[0]}
                  </p>
                  <p className={`truncate text-[10px] ${t.meta}`}>{tech.jobLabel}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
