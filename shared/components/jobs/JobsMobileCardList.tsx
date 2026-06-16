import { adminListRowClass, adminListRowWrapSelectedClass } from "@/shared/lib/admin-density";
import { ChevronRight } from "lucide-react";
import {
  formatScheduledDate,
  formatScheduledTime,
  type Job,
} from "@/shared/types/job";
import { BulkSelectCheckbox } from "@/shared/components/bulk/BulkSelectCheckbox";
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import { JobPriorityBadge } from "./JobPriorityBadge";
import { JobStatusBadge } from "./JobStatusBadge";

type JobsMobileCardListProps = {
  jobs: Job[];
  onSelect: (job: Job) => void;
  canManageCustomers?: boolean;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelection?: (jobId: string) => void;
};

export function JobsMobileCardList({
  jobs,
  onSelect,
  canManageCustomers = false,
  selectionEnabled = false,
  selectedIds,
  onToggleSelection,
}: JobsMobileCardListProps) {
  return (
    <ul className="divide-y divide-slate-100 md:hidden">
      {jobs.map((job) => {
        const isSelected = selectedIds?.has(job.id) ?? false;

        return (
          <li key={job.id}>
            <div
              className={`flex items-stretch ${
                isSelected ? adminListRowWrapSelectedClass : ""
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
                className={`${adminListRowClass} min-w-0 flex-1`}
                aria-label={`Open job ${job.jobNumber} for ${job.customerName}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {job.jobNumber}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {formatScheduledDate(job.scheduledDate)} ·{" "}
                    {formatScheduledTime(job.scheduledDate)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <JobStatusBadge status={job.status} />
                    <JobPriorityBadge priority={job.priority} />
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-slate-900">
                    <CustomerNameLink
                      customerId={job.customerId}
                      customerName={job.customerName}
                      canManageCustomers={canManageCustomers}
                      stopRowNavigation
                    />
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {job.assignedTechnician ?? "Unassigned"}
                  </p>
                </div>

                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
