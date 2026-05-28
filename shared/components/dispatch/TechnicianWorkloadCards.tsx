"use client";

import { useMemo } from "react";
import type { DispatchJob, Technician } from "@/shared/types/dispatch";

type TechnicianWorkloadCardsProps = {
  technicians: Technician[];
  jobs: DispatchJob[];
  emphasized?: boolean;
  highlightedTechnicianIds?: string[];
  onTechnicianClick?: (technicianId: string) => void;
};

export function TechnicianWorkloadCards({
  technicians,
  jobs,
  emphasized = false,
  highlightedTechnicianIds = [],
  onTechnicianClick,
}: TechnicianWorkloadCardsProps) {
  const assignedCountByTechnicianId = useMemo(() => {
    const counts = new Map<string, number>();

    for (const job of jobs) {
      if (!job.technicianId) continue;
      counts.set(
        job.technicianId,
        (counts.get(job.technicianId) ?? 0) + 1,
      );
    }

    return counts;
  }, [jobs]);

  if (technicians.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2.5 sm:rounded-2xl sm:px-4 sm:py-4">
        <p className="text-xs font-semibold text-slate-700 sm:text-sm">
          No technicians on roster
        </p>
        <p className="mt-0.5 hidden text-xs text-slate-500 sm:mt-1 sm:block">
          Invite team members with the technician role to enable assignments.
          Technician availability and specialties are not modeled in the database
          yet.
        </p>
      </div>
    );
  }

  const grid = (
    <div className="grid shrink-0 grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {technicians.map((technician) => {
        const assignedCount = assignedCountByTechnicianId.get(technician.id) ?? 0;
        const isHighlighted = highlightedTechnicianIds.includes(technician.id);

        const cardClassName = `rounded-xl border bg-white p-2.5 shadow-sm transition-shadow sm:rounded-2xl sm:p-4 ${
          isHighlighted
            ? "border-amber-300 ring-2 ring-amber-400/25 shadow-md"
            : "border-slate-200"
        } ${onTechnicianClick ? "cursor-pointer hover:border-cyan-300 hover:shadow-md" : ""}`;

        const cardContent = (
          <>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-600 text-xs font-bold text-white sm:h-10 sm:w-10 sm:rounded-xl sm:text-sm">
                {technician.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-900 sm:text-sm">
                  {technician.name}
                </p>
                <p className="hidden truncate text-xs text-slate-500 sm:block">
                  {technician.role}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-black tabular-nums text-slate-900 sm:text-2xl">
                  {assignedCount}
                </p>
                <p className="text-[10px] font-medium text-slate-500 sm:text-[11px]">
                  {assignedCount === 1 ? "job" : "jobs"}
                </p>
              </div>
            </div>
          </>
        );

        if (onTechnicianClick) {
          return (
            <button
              key={technician.id}
              type="button"
              onClick={() => onTechnicianClick(technician.id)}
              className={`text-left ${cardClassName}`}
            >
              {cardContent}
            </button>
          );
        }

        return (
          <div key={technician.id} className={cardClassName}>
            {cardContent}
          </div>
        );
      })}
    </div>
  );

  if (!emphasized) {
    return grid;
  }

  return (
    <section className="rounded-xl border border-amber-200/90 bg-amber-50/30 p-2 shadow-sm ring-2 ring-amber-400/15 sm:rounded-2xl sm:p-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-amber-900/80 sm:mb-3 sm:text-xs">
        Technician workload today
      </p>
      {grid}
    </section>
  );
}
