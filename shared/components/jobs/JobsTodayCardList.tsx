import { ChevronRight } from "lucide-react";
import {
  formatScheduledDate,
  formatScheduledTime,
  type Job,
} from "@/shared/types/job";
import { BulkSelectCheckbox } from "@/shared/components/bulk/BulkSelectCheckbox";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
import { SearchMatchReason } from "@/shared/components/search/SearchMatchReason";
import type { JobBillingSummariesByJobId } from "@/shared/lib/job-next-business-action";
import { JobStatusBadge } from "./JobStatusBadge";
import {
  jobListCueClass,
  jobMissionClasses as jm,
  resolveJobListCue,
} from "./job-list-presentation";

type JobsTodayCardListProps = {
  jobs: Job[];
  onSelect: (job: Job) => void;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelection?: (jobId: string) => void;
  /** @deprecated Mission Control unifies presentation; retained for call-site compatibility. */
  northStar?: boolean;
  billingSummaries?: JobBillingSummariesByJobId;
  matchReasons?: Record<string, string>;
};

export function JobsTodayCardList({
  jobs,
  onSelect,
  selectionEnabled = false,
  selectedIds,
  onToggleSelection,
  billingSummaries,
  matchReasons,
}: JobsTodayCardListProps) {
  return (
    <ul
      className={`max-w-full min-w-0 divide-y divide-altair-border/50 overflow-hidden ${jm.listShell}`}
    >
      {jobs.map((job) => {
        const isSelected = selectedIds?.has(job.id) ?? false;
        const cue = resolveJobListCue(job, billingSummaries);

        return (
          <li key={job.id} className="min-w-0 max-w-full">
            <div
              className={`flex items-stretch ${
                isSelected ? "bg-altair-brass/5" : ""
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
                    />
                  </label>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => onSelect(job)}
                className="flex min-w-0 flex-1 items-start gap-2 px-3 py-3.5 text-left transition-colors hover:bg-altair-paper-subtle/70"
                aria-label={`Open job ${job.jobNumber} for ${job.customerName}`}
              >
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <p className={`min-w-0 truncate ${jm.primaryText}`}>
                      {job.jobNumber}
                    </p>
                    <JobStatusBadge status={job.status} className="shrink-0" />
                  </div>

                  <p className={`mt-0.5 truncate ${jm.secondaryText}`}>
                    <DemoDisplayName>{job.customerName}</DemoDisplayName>
                  </p>

                  <p className={`mt-1 truncate text-xs ${jm.metaText}`}>
                    {formatScheduledTime(job.scheduledDate)}
                    <span className="text-altair-ink-on-paper-muted">
                      {" "}
                      · {formatScheduledDate(job.scheduledDate)}
                    </span>
                  </p>

                  <p className={`mt-0.5 truncate text-xs ${jm.secondaryText}`}>
                    {job.assignedTechnician ? (
                      job.assignedTechnician
                    ) : (
                      <span className={jm.unassignedText}>Unassigned</span>
                    )}
                  </p>

                  <p className={`mt-1 truncate text-xs ${jobListCueClass(cue.tone)}`}>
                    {cue.label}
                  </p>

                  <SearchMatchReason
                    reason={matchReasons?.[job.id]}
                    className={`mt-0.5 ${jm.secondaryText}`}
                  />
                </div>

                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-altair-ink-on-paper-muted/60" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
