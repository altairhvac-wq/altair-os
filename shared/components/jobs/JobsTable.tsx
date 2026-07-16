import { useMemo } from "react";
import Link from "next/link";
import type { MouseEvent } from "react";
import {
  formatScheduledDate,
  formatScheduledTime,
  type Job,
} from "@/shared/types/job";
import { BulkSelectCheckbox } from "@/shared/components/bulk/BulkSelectCheckbox";
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import {
  adminTableRowClass,
  adminTableRowSelectedClass,
} from "@/shared/lib/admin-density";
import { resolveBulkSelectionState } from "@/shared/lib/bulk-selection";
import { JobsMobileCardList } from "./JobsMobileCardList";
import { JobPriorityBadge } from "./JobPriorityBadge";
import { JobStatusBadge } from "./JobStatusBadge";

type JobsTableProps = {
  jobs: Job[];
  onSelect: (job: Job) => void;
  canManageCustomers?: boolean;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelection?: (jobId: string) => void;
  onToggleAllVisible?: (selectAll: boolean) => void;
  northStar?: boolean;
};

const jobRowClassName = adminTableRowClass;

/**
 * Focus ring for the primary job-number link: the same Paper-surface
 * treatment already used for the Customers ledger's primary-cell link (see
 * CustomersTable.tsx) — reused rather than inventing a new focus token, so
 * the ring stays non-cyan and visible in both themes.
 */
const jobNumberLinkFocusClass =
  "hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated";

function handleJobLinkClick(event: MouseEvent<HTMLAnchorElement>) {
  event.stopPropagation();
}

export function JobsTable({
  jobs,
  onSelect,
  canManageCustomers = false,
  selectionEnabled = false,
  selectedIds,
  onToggleSelection,
  onToggleAllVisible,
  northStar = false,
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
        canManageCustomers={canManageCustomers}
        selectionEnabled={selectionEnabled}
        selectedIds={selectedIds}
        onToggleSelection={onToggleSelection}
        northStar={northStar}
      />

      <div
        className={`hidden max-w-full overflow-x-auto md:block${
          northStar ? " job-north-star-ledger" : ""
        }`}
      >
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr
              className={
                northStar
                  ? lt.tableHeaderRow
                  : "border-b border-slate-100/90 bg-white text-xs font-semibold uppercase tracking-wide text-slate-500"
              }
            >
              {selectionEnabled ? (
                <th
                  className={`w-10 ${northStar ? lt.tableHeaderCell : "admin-table-cell"}`}
                >
                  {headerSelection && headerSelection.selectableCount > 0 ? (
                    <BulkSelectCheckbox
                      checked={headerSelection.allSelected}
                      indeterminate={headerSelection.someSelected}
                      ariaLabel="Select all visible jobs"
                      onChange={(checked) => onToggleAllVisible?.(checked)}
                      variant={northStar ? "northStar" : "default"}
                    />
                  ) : null}
                </th>
              ) : null}
              <th className={northStar ? lt.tableHeaderCell : "admin-table-cell"}>
                Job
              </th>
              <th className={northStar ? lt.tableHeaderCell : "admin-table-cell"}>
                Scheduled
              </th>
              <th className={northStar ? lt.tableHeaderCell : "admin-table-cell"}>
                Status
              </th>
              <th className={northStar ? lt.tableHeaderCell : "admin-table-cell"}>
                Priority
              </th>
              <th className={northStar ? lt.tableHeaderCell : "admin-table-cell"}>
                Customer
              </th>
              <th className={northStar ? lt.tableHeaderCell : "admin-table-cell"}>
                Technician
              </th>
            </tr>
          </thead>
          <tbody
            className={
              northStar
                ? "divide-y divide-[rgba(138,99,36,0.12)]"
                : "divide-y divide-slate-50"
            }
          >
            {jobs.map((job) => {
              const isSelected = selectedIds?.has(job.id) ?? false;

              return (
                <tr
                  key={job.id}
                  onClick={() => onSelect(job)}
                  className={
                    northStar
                      ? `${lt.tableRow} ${isSelected ? lt.tableRowSelected : ""}`
                      : `${jobRowClassName} ${
                          isSelected ? adminTableRowSelectedClass : ""
                        }`
                  }
                >
                  {selectionEnabled ? (
                    <td className="admin-table-cell">
                      <BulkSelectCheckbox
                        checked={isSelected}
                        ariaLabel={`Select job ${job.jobNumber}`}
                        onChange={() => onToggleSelection?.(job.id)}
                        variant={northStar ? "northStar" : "default"}
                      />
                    </td>
                  ) : null}
                  <td className="admin-table-cell">
                    <Link
                      href={`/jobs/${job.id}`}
                      onClick={handleJobLinkClick}
                      className={
                        northStar
                          ? `${lt.tablePrimaryText} ${jobNumberLinkFocusClass}`
                          : `font-semibold text-slate-900 ${jobNumberLinkFocusClass}`
                      }
                    >
                      {job.jobNumber}
                    </Link>
                  </td>
                  <td
                    className={`admin-table-cell ${
                      northStar ? "job-north-star-scheduled-cell" : "text-slate-600"
                    }`}
                  >
                    <p className={northStar ? lt.tableDateText : undefined}>
                      {formatScheduledDate(job.scheduledDate)}
                    </p>
                    <p
                      className={
                        northStar ? lt.tableMutedText : "text-xs text-slate-500"
                      }
                    >
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
                    <CustomerNameLink
                      customerId={job.customerId}
                      customerName={job.customerName}
                      canManageCustomers={canManageCustomers}
                      className={
                        northStar
                          ? `${lt.tablePrimaryText} truncate font-medium`
                          : "truncate font-medium text-slate-900"
                      }
                      stopRowNavigation
                    />
                  </td>
                  <td
                    className={`admin-table-cell ${
                      northStar ? "job-north-star-tech-cell" : "text-slate-600"
                    }`}
                  >
                    {job.assignedTechnician ?? (
                      <span
                        className={
                          northStar ? "job-north-star-unassigned" : "text-slate-400"
                        }
                      >
                        Unassigned
                      </span>
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
