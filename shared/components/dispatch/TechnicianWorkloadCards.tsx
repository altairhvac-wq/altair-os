"use client";

import { useMemo } from "react";
import { adminFilterCardActiveClass } from "@/shared/design-system/shell/tokens";
import { northStarDispatchTokens as dt } from "@/shared/design-system/north-star/tokens";
import type { DispatchJob, Technician } from "@/shared/types/dispatch";

type TechnicianWorkloadCardsProps = {
  technicians: Technician[];
  jobs: DispatchJob[];
  emphasized?: boolean;
  highlightedTechnicianIds?: string[];
  activeTechnicianFilterId?: string | null;
  onTechnicianClick?: (technicianId: string) => void;
  northStar?: boolean;
};

export function TechnicianWorkloadCards({
  technicians,
  jobs,
  emphasized = false,
  highlightedTechnicianIds = [],
  activeTechnicianFilterId = null,
  onTechnicianClick,
  northStar = false,
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
    if (northStar) {
      return (
        <div className={dt.workloadEmptyState}>
          <p className="text-xs font-semibold text-[#FFF8E8] sm:text-sm">
            Invite a technician to dispatch
          </p>
          <p className="mt-0.5 hidden text-xs text-[#AEB6C2] sm:mt-1 sm:block">
            Add team members with the technician role in Settings, then assign jobs here.
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2.5 sm:rounded-2xl sm:px-4 sm:py-4">
        <p className="text-xs font-semibold text-slate-700 sm:text-sm">
          Invite a technician to dispatch
        </p>
        <p className="mt-0.5 hidden text-xs text-slate-500 sm:mt-1 sm:block">
          Add team members with the technician role in Settings, then assign jobs here.
        </p>
      </div>
    );
  }

  const grid = (
    <div className="grid shrink-0 grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {technicians.map((technician) => {
        const assignedCount = assignedCountByTechnicianId.get(technician.id) ?? 0;
        const isActiveFilter = activeTechnicianFilterId === technician.id;
        const isOverloaded =
          !isActiveFilter &&
          highlightedTechnicianIds.includes(technician.id);

        const cardClassName = northStar
          ? `${dt.workloadCard} ${
              isActiveFilter
                ? dt.workloadCardActive
                : isOverloaded
                  ? dt.workloadCardOverloaded
                  : ""
            } ${onTechnicianClick ? dt.workloadCardInteractive : ""}`
          : `rounded-xl border bg-white p-2.5 shadow-sm transition-[border-color,box-shadow,background-color] sm:rounded-2xl sm:p-4 ${
              isActiveFilter
                ? adminFilterCardActiveClass
                : isOverloaded
                  ? "border-amber-300 ring-2 ring-amber-400/25 shadow-md"
                  : "border-slate-200"
            } ${onTechnicianClick ? "cursor-pointer hover:border-cyan-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30" : ""}`;

        const cardContent = (
          <>
            <div className="flex items-center gap-2 sm:gap-3">
              <div
                className={
                  northStar
                    ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#E6D092] to-[#B88A2E] text-xs font-bold text-[#17130E] ring-1 ring-[rgba(201,164,77,0.28)] sm:h-10 sm:w-10 sm:rounded-xl sm:text-sm"
                    : "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-600 text-xs font-bold text-white sm:h-10 sm:w-10 sm:rounded-xl sm:text-sm"
                }
              >
                {technician.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={
                    northStar
                      ? "truncate text-xs font-bold text-[#FFF8E8] sm:text-sm"
                      : "truncate text-xs font-bold text-slate-900 sm:text-sm"
                  }
                >
                  {technician.name}
                </p>
                <p
                  className={
                    northStar
                      ? "hidden truncate text-xs text-[#AEB6C2] sm:block"
                      : "hidden truncate text-xs text-slate-500 sm:block"
                  }
                >
                  {technician.role}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={
                    northStar
                      ? "text-lg font-black tabular-nums text-[#FFF8E8] sm:text-2xl"
                      : "text-lg font-black tabular-nums text-slate-900 sm:text-2xl"
                  }
                >
                  {assignedCount}
                </p>
                <p
                  className={
                    northStar
                      ? "text-[10px] font-medium text-[#AEB6C2] sm:text-[11px]"
                      : "text-[10px] font-medium text-slate-500 sm:text-[11px]"
                  }
                >
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
              aria-pressed={isActiveFilter}
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

  if (northStar) {
    return (
      <section className="rounded-xl border border-[rgba(201,164,77,0.28)] bg-[rgba(39,49,64,0.45)] p-2 shadow-sm ring-1 ring-[rgba(201,164,77,0.16)] sm:rounded-2xl sm:p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#E6D092] sm:mb-3 sm:text-xs">
          Technician workload today
        </p>
        {grid}
      </section>
    );
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
