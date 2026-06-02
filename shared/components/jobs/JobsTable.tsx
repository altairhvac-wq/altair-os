import { useMemo } from "react";
import {
  formatScheduledDate,
  formatScheduledTime,
  type Job,
} from "@/shared/types/job";
import { BulkSelectCheckbox } from "@/shared/components/bulk/BulkSelectCheckbox";
import { resolveBulkSelectionState } from "@/shared/lib/bulk-selection";
import { JobsMobileCardList } from "./JobsMobileCardList";
import { JobPriorityBadge } from "./JobPriorityBadge";
import { JobStatusBadge } from "./JobStatusBadge";

type JobsTableProps = {
  jobs: Job[];
  onSelect: (job: Job) => void;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelection?: (jobId: string) => void;
  onToggleAllVisible?: (selectAll: boolean) => void;
};

const jobRowClassName =
  "cursor-pointer transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500/30";

function handleJobRowKeyDown(
  event: React.KeyboardEvent<HTMLTableRowElement>,
  onSelect: (job: Job) => void,
  job: Job,
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onSelect(job);
  }
}

export function JobsTable({
  jobs,
  onSelect,
  selectionEnabled = false,
  selectedIds,
  onToggleSelection,
  onToggleAllVisible,
}: JobsTableProps) {
  const headerSelection = useMemo(
    () =>
      selectionEnabled && selectedIds
        ? resolveBulkSelectionState(selectedIds, jobs)
        : null,
    [jobs, selectedIds, selectionEnabled],
  );

  return (
    <>
      <JobsMobileCardList
        jobs={jobs}
        onSelect={onSelect}
        selectionEnabled={selectionEnabled}
        selectedIds={selectedIds}
        onToggleSelection={onToggleSelection}
      />

      <div className="hidden max-w-full overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100/90 bg-white text-xs font-semibold uppercase tracking-wide text-slate-500">
              {selectionEnabled ? (
                <th className="w-10 admin-table-cell">
                  {headerSelection && headerSelection.selectableCount > 0 ? (
                    <BulkSelectCheckbox
                      checked={headerSelection.allSelected}
                      indeterminate={headerSelection.someSelected}
                      ariaLabel="Select all visible jobs"
                      onChange={(checked) => onToggleAllVisible?.(checked)}
                    />
                  ) : null}
                </th>
              ) : null}
              <th className="admin-table-cell">Job</th>
              <th className="admin-table-cell">Scheduled</th>
              <th className="admin-table-cell">Status</th>
              <th className="admin-table-cell">Priority</th>
              <th className="admin-table-cell">Customer</th>
              <th className="admin-table-cell">Technician</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {jobs.map((job) => {
              const isSelected = selectedIds?.has(job.id) ?? false;

              return (
                <tr
                  key={job.id}
                  tabIndex={0}
                  role="link"
                  onClick={() => onSelect(job)}
                  onKeyDown={(event) =>
                    handleJobRowKeyDown(event, onSelect, job)
                  }
                  aria-label={`Open job ${job.jobNumber} for ${job.customerName}`}
                  className={`${jobRowClassName} ${
                    isSelected ? "bg-cyan-50/60" : ""
                  }`}
                >
                  {selectionEnabled ? (
                    <td className="admin-table-cell">
                      <BulkSelectCheckbox
                        checked={isSelected}
                        ariaLabel={`Select job ${job.jobNumber}`}
                        onChange={() => onToggleSelection?.(job.id)}
                      />
                    </td>
                  ) : null}
                  <td className="admin-table-cell">
                    <p className="font-semibold text-slate-900">
                      {job.jobNumber}
                    </p>
                  </td>
                  <td className="admin-table-cell text-slate-600">
                    <p>{formatScheduledDate(job.scheduledDate)}</p>
                    <p className="text-xs text-slate-500">
                      {formatScheduledTime(job.scheduledDate)}
                    </p>
                  </td>
                  <td className="admin-table-cell">
                    <JobStatusBadge status={job.status} />
                  </td>
                  <td className="admin-table-cell">
                    <JobPriorityBadge priority={job.priority} />
                  </td>
                  <td className="admin-table-cell">
                    <p className="truncate font-medium text-slate-900">
                      {job.customerName}
                    </p>
                  </td>
                  <td className="admin-table-cell text-slate-600">
                    {job.assignedTechnician ?? (
                      <span className="text-slate-400">Unassigned</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
