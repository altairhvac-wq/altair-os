import { memo } from "react";
import type { DispatchJob, Technician } from "@/shared/types/dispatch";
import { northStarDispatchTokens as dt } from "@/shared/design-system/north-star/tokens";
import { DispatchJobCard } from "./DispatchJobCard";

type TechnicianColumnProps = {
  technician: Technician;
  jobs: DispatchJob[];
  selectedJobId: string | null;
  pendingJobId?: string | null;
  nextJobTime?: string | null;
  northStar?: boolean;
  onSelectJob: (job: DispatchJob) => void;
};

const statusDot: Record<Technician["status"], string> = {
  available: "bg-emerald-500",
  on_job: "bg-[#C9A44D]",
  off_duty: "bg-[#6B6255]",
};

const northStarStatusDot: Record<Technician["status"], string> = {
  available: "bg-emerald-400",
  on_job: "bg-[#D6BE78]",
  off_duty: "bg-[#8A6324]/60",
};

const statusLabel: Record<Technician["status"], string> = {
  available: "Available",
  on_job: "On job",
  off_duty: "Off duty",
};

export const TechnicianColumn = memo(function TechnicianColumn({
  technician,
  jobs,
  selectedJobId,
  pendingJobId = null,
  nextJobTime = null,
  northStar = false,
  onSelectJob,
}: TechnicianColumnProps) {
  const dots = northStar ? northStarStatusDot : statusDot;

  return (
    <section
      className={
        northStar
          ? dt.lane
          : "admin-dispatch-lane min-w-0 max-w-full overflow-hidden sm:rounded-2xl"
      }
    >
      <div className="flex min-w-0 flex-col sm:flex-row sm:items-stretch">
        <header
          className={
            northStar
              ? dt.laneHeader
              : "admin-dispatch-lane-header flex shrink-0 items-center gap-2 border-b px-2.5 py-2 sm:gap-2.5 sm:w-44 sm:flex-col sm:items-start sm:justify-center sm:border-b-0 sm:border-r sm:px-3 sm:py-2.5 lg:w-48"
          }
        >
          <div className="flex items-center gap-2 sm:w-full sm:gap-2.5">
            <div
              className={
                northStar
                  ? dt.laneHeaderAvatar
                  : "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-white shadow-sm sm:h-9 sm:w-9 sm:rounded-xl"
              }
            >
              {technician.initials}
            </div>
            <div className="min-w-0 flex-1 sm:w-full">
              <h3
                className={
                  northStar
                    ? dt.laneHeaderName
                    : "truncate text-sm font-bold tracking-tight text-slate-900"
                }
              >
                {technician.name}
              </h3>
              <p
                className={
                  northStar
                    ? dt.laneHeaderRole
                    : "truncate text-[11px] text-slate-500"
                }
              >
                {technician.role}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:ml-0 sm:w-full sm:justify-between">
            <div className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${dots[technician.status]}`}
              />
              <span
                className={
                  northStar
                    ? dt.laneHeaderStatusLabel
                    : "text-[11px] font-medium text-slate-600"
                }
              >
                {statusLabel[technician.status]}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {nextJobTime ? (
                <span
                  className={
                    northStar
                      ? dt.laneHeaderNextJob
                      : "hidden text-[10px] font-medium text-slate-500 sm:inline"
                  }
                >
                  Next {nextJobTime}
                </span>
              ) : null}
              <span
                className={
                  northStar
                    ? dt.laneHeaderCount
                    : "rounded-full bg-slate-100/90 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-700"
                }
              >
                {jobs.length}
              </span>
            </div>
          </div>
        </header>

        <div
          className={
            northStar
              ? dt.laneJobWell
              : "flex min-h-[4.25rem] min-w-0 flex-1 snap-x snap-mandatory gap-1.5 overflow-x-auto bg-white p-1.5 sm:min-h-[5.25rem] sm:gap-2 sm:p-2"
          }
          data-no-pull-refresh
        >
          {jobs.length === 0 ? (
            <div
              className={
                northStar
                  ? dt.laneEmptyWell
                  : "flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200/90 bg-white/80 px-3 py-2.5 text-center sm:rounded-xl sm:px-4 sm:py-3"
              }
            >
              <p
                className={
                  northStar
                    ? dt.laneEmptyText
                    : "text-[11px] font-medium text-slate-500"
                }
              >
                No assigned jobs
              </p>
            </div>
          ) : (
            jobs.map((job) => (
              <DispatchJobCard
                key={job.id}
                job={job}
                compact
                hideTechnician
                northStar={northStar}
                isSelected={selectedJobId === job.id}
                isAssigning={pendingJobId === job.id}
                onSelect={onSelectJob}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
});
