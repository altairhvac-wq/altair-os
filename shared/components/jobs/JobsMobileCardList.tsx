import { adminListRowClass, adminListRowWrapSelectedClass } from "@/shared/lib/admin-density";
import { ChevronRight } from "lucide-react";
import {
  formatScheduledDate,
  formatScheduledTime,
  type Job,
} from "@/shared/types/job";
import { BulkSelectCheckbox } from "@/shared/components/bulk/BulkSelectCheckbox";
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import { SearchMatchReason } from "@/shared/components/search/SearchMatchReason";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { formatJobDocumentReferencesLine } from "@/shared/lib/documents/relationship-labels";
import type { JobBillingSummariesByJobId } from "@/shared/lib/job-next-business-action";
import { JobPriorityBadge } from "./JobPriorityBadge";
import { JobStatusBadge } from "./JobStatusBadge";

type JobsMobileCardListProps = {
  jobs: Job[];
  onSelect: (job: Job) => void;
  canManageCustomers?: boolean;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelection?: (jobId: string) => void;
  northStar?: boolean;
  billingSummaries?: JobBillingSummariesByJobId;
  matchReasons?: Record<string, string>;
};

export function JobsMobileCardList({
  jobs,
  onSelect,
  canManageCustomers = false,
  selectionEnabled = false,
  selectedIds,
  onToggleSelection,
  northStar = false,
  billingSummaries,
  matchReasons,
}: JobsMobileCardListProps) {
  return (
    <ul
      className={`md:hidden ${
        northStar ? "divide-y divide-[rgba(138,99,36,0.12)]" : "divide-y divide-slate-100"
      }`}
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
                className={`${northStar ? "" : adminListRowClass} min-w-0 flex-1 px-3 py-3 text-left transition-colors`}
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
                    <CustomerNameLink
                      customerId={job.customerId}
                      customerName={job.customerName}
                      canManageCustomers={canManageCustomers}
                      stopRowNavigation
                    />
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
                  {(() => {
                    const documentLine = formatJobDocumentReferencesLine({
                      estimateNumbers: (
                        billingSummaries?.estimatesByJobId[job.id] ?? []
                      ).map((estimate) => estimate.estimateNumber),
                      invoiceNumbers: (
                        billingSummaries?.invoicesByJobId[job.id] ?? []
                      ).map((invoice) => invoice.invoiceNumber),
                    });
                    if (!documentLine) return null;
                    return (
                      <p
                        className={
                          northStar
                            ? `mt-0.5 truncate ${lt.tableMutedText}`
                            : "mt-0.5 truncate text-xs text-slate-400"
                        }
                      >
                        {documentLine}
                      </p>
                    );
                  })()}
                  <SearchMatchReason
                    reason={matchReasons?.[job.id]}
                    className={
                      northStar
                        ? `mt-0.5 ${lt.tableMutedText}`
                        : "mt-0.5 text-xs text-slate-400"
                    }
                  />
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
