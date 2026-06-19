import { Inbox } from "lucide-react";
import type { DispatchJob } from "@/shared/types/dispatch";
import { northStarDispatchTokens as dt } from "@/shared/design-system/north-star/tokens";
import { DispatchJobCard } from "./DispatchJobCard";

type UnassignedJobsPanelProps = {
  jobs: DispatchJob[];
  selectedJobId: string | null;
  pendingJobId?: string | null;
  onSelectJob: (job: DispatchJob) => void;
  emphasized?: boolean;
  northStar?: boolean;
};

export function UnassignedJobsPanel({
  jobs,
  selectedJobId,
  pendingJobId = null,
  onSelectJob,
  emphasized = false,
  northStar = false,
}: UnassignedJobsPanelProps) {
  const sectionClass = northStar
    ? emphasized
      ? dt.unassignedLaneEmphasis
      : dt.unassignedLane
    : emphasized
      ? "admin-dispatch-lane-unassigned-emphasis border shadow-sm min-w-0 max-w-full overflow-hidden sm:rounded-2xl"
      : "admin-dispatch-lane-unassigned border min-w-0 max-w-full overflow-hidden sm:rounded-2xl";

  return (
    <section className={sectionClass}>
      <div className="flex min-w-0 flex-col sm:flex-row sm:items-stretch">
        <header
          className={
            northStar
              ? dt.unassignedLaneHeader
              : "admin-dispatch-lane-header flex shrink-0 items-center gap-2 border-b px-2.5 py-2 sm:gap-2.5 sm:w-44 sm:flex-col sm:items-start sm:justify-center sm:border-b-0 sm:border-r sm:px-3 sm:py-2.5 lg:w-48"
          }
        >
          <div className="flex items-center gap-2 sm:w-full sm:gap-2.5">
            <div
              className={
                northStar
                  ? dt.unassignedLaneIcon
                  : "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100/90 text-amber-800 sm:h-9 sm:w-9 sm:rounded-xl"
              }
            >
              <Inbox className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 sm:w-full">
              <h3
                className={
                  northStar
                    ? dt.unassignedLaneTitle
                    : "text-sm font-bold text-slate-900"
                }
              >
                Unassigned
              </h3>
              <p
                className={
                  northStar
                    ? dt.unassignedLaneSubtitle
                    : "hidden text-[11px] text-slate-500 sm:block"
                }
              >
                Needs assignment
              </p>
            </div>
          </div>
          <span
            className={
              northStar
                ? `${dt.unassignedLaneCount} sm:ml-0 ${jobs.length > 0 ? "" : "ml-auto"}`
                : "ml-auto rounded-full bg-amber-100/90 px-2 py-0.5 text-[11px] font-bold tabular-nums text-amber-900 sm:ml-0"
            }
          >
            {jobs.length}
          </span>
        </header>

        <div
          className={
            northStar
              ? dt.unassignedJobWell
              : "flex min-h-[4.25rem] min-w-0 flex-1 snap-x snap-mandatory gap-1.5 overflow-x-auto bg-amber-50/25 p-1.5 sm:min-h-[5.25rem] sm:gap-2 sm:p-2"
          }
          data-no-pull-refresh
        >
          {jobs.length === 0 ? (
            <div
              className={
                northStar
                  ? dt.unassignedEmptyWell
                  : "flex flex-1 items-center justify-center rounded-lg border border-dashed border-amber-200/70 bg-white/85 px-3 py-2.5 text-center sm:rounded-xl sm:px-4 sm:py-3"
              }
            >
              <p
                className={
                  northStar
                    ? dt.laneEmptyText
                    : "text-[11px] font-medium text-slate-600"
                }
              >
                No unassigned jobs match your filters
              </p>
            </div>
          ) : (
            jobs.map((job) => (
              <DispatchJobCard
                key={job.id}
                job={job}
                compact
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
}
