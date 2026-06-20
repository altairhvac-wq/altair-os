import { adminListRowClass, adminListRowWrapSelectedClass } from "@/shared/lib/admin-density";
import { ChevronRight } from "lucide-react";
import {
  formatScheduledDate,
  formatScheduledTime,
  type Job,
} from "@/shared/types/job";
import { BulkSelectCheckbox } from "@/shared/components/bulk/BulkSelectCheckbox";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { JobPriorityBadge } from "./JobPriorityBadge";
import { JobStatusBadge } from "./JobStatusBadge";

type JobsTodayCardListProps = {
  jobs: Job[];
  onSelect: (job: Job) => void;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelection?: (jobId: string) => void;
  northStar?: boolean;
};

export function JobsTodayCardList({
  jobs,
  onSelect,
  selectionEnabled = false,
  selectedIds,
  onToggleSelection,
  northStar = false,
}: JobsTodayCardListProps) {
  return (
    <ul
      className={
        northStar
          ? "job-north-star-today-list divide-y divide-[rgba(138,99,36,0.12)]"
          : "divide-y divide-slate-100"
      }
    >
      {jobs.map((job) => {
        const isSelected = selectedIds?.has(job.id) ?? false;

        return (
          <li key={job.id}>
            <div
              className={`flex items-stretch ${
                isSelected
                  ? northStar
                    ? "job-north-star-row-selected"
                    : adminListRowWrapSelectedClass
                  : ""
              }`}
            >
              {selectionEnabled ? (
                <div className="flex shrink-0 items-center pl-2">
                  <label
                    className="flex min-h-11 min-w-10 items-center justify-center"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <BulkSelectCheckbox
                      checked={isSelected}
                      ariaLabel={`Select job ${job.jobNumber}`}
                      onChange={() => onToggleSelection?.(job.id)}
                      variant={northStar ? "northStar" : "default"}
                    />
                  </label>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => onSelect(job)}
                className={`${
                  northStar ? "px-3 py-3 text-left transition-colors" : adminListRowClass
                } min-w-0 flex-1`}
                aria-label={`Open job ${job.jobNumber} for ${job.customerName}`}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      northStar
                        ? `truncate ${lt.tablePrimaryText}`
                        : "truncate text-sm font-bold text-slate-900"
                    }
                  >
                    {job.jobNumber}
                  </p>
                  <p
                    className={
                      northStar
                        ? `mt-0.5 ${lt.tableSecondaryText} text-sm`
                        : "mt-0.5 text-sm text-slate-600"
                    }
                  >
                    {formatScheduledDate(job.scheduledDate)} ·{" "}
                    {formatScheduledTime(job.scheduledDate)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <JobStatusBadge status={job.status} />
                    <JobPriorityBadge priority={job.priority} />
                  </div>
                  <p
                    className={
                      northStar
                        ? `mt-1 truncate ${lt.tablePrimaryText} text-sm font-medium`
                        : "mt-1 truncate text-sm font-medium text-slate-900"
                    }
                  >
                    <DemoDisplayName>{job.customerName}</DemoDisplayName>
                  </p>
                  <p
                    className={
                      northStar
                        ? `mt-0.5 truncate ${lt.tableMutedText}`
                        : "mt-0.5 truncate text-xs text-slate-400"
                    }
                  >
                    {job.assignedTechnician ?? "Unassigned"}
                  </p>
                </div>

                <ChevronRight
                  className={`mt-1 h-4 w-4 shrink-0 ${
                    northStar ? "text-[#8A6324]" : "text-slate-300"
                  }`}
                />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
