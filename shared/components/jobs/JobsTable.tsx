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
  AltairTable,
  AltairTableBody,
  AltairTableCell,
  AltairTableHead,
  AltairTableHeader,
  AltairTablePrimaryCell,
  AltairTableRow,
  AltairTableSecondaryText,
} from "@/shared/design-system/table";
import { resolveBulkSelectionState } from "@/shared/lib/bulk-selection";
import { SearchMatchReason } from "@/shared/components/search/SearchMatchReason";
import { formatJobDocumentReferencesLine } from "@/shared/lib/documents/relationship-labels";
import type { JobBillingSummariesByJobId } from "@/shared/lib/job-next-business-action";
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
  billingSummaries?: JobBillingSummariesByJobId;
  matchReasons?: Record<string, string>;
};

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
  billingSummaries,
  matchReasons,
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
        billingSummaries={billingSummaries}
        matchReasons={matchReasons}
      />

      <div
        className={`hidden max-w-full overflow-x-auto md:block${
          northStar ? " job-north-star-ledger" : ""
        }`}
      >
        <AltairTable className="min-w-[760px]">
          <AltairTableHeader>
            <AltairTableRow className={northStar ? lt.tableHeaderRow : undefined}>
              {selectionEnabled ? (
                <AltairTableHead
                  className={`w-10 ${northStar ? lt.tableHeaderCell : ""}`}
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
                </AltairTableHead>
              ) : null}
              <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                Job
              </AltairTableHead>
              <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                Scheduled
              </AltairTableHead>
              <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                Status
              </AltairTableHead>
              <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                Priority
              </AltairTableHead>
              <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                Customer
              </AltairTableHead>
              <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                Technician
              </AltairTableHead>
            </AltairTableRow>
          </AltairTableHeader>
          <AltairTableBody>
            {jobs.map((job) => {
              const isSelected = selectedIds?.has(job.id) ?? false;

              return (
                <AltairTableRow
                  key={job.id}
                  selected={isSelected}
                  onClick={() => onSelect(job)}
                  className={northStar ? lt.tableRow : undefined}
                >
                  {selectionEnabled ? (
                    <AltairTableCell>
                      <BulkSelectCheckbox
                        checked={isSelected}
                        ariaLabel={`Select job ${job.jobNumber}`}
                        onChange={() => onToggleSelection?.(job.id)}
                        variant={northStar ? "northStar" : "default"}
                      />
                    </AltairTableCell>
                  ) : null}
                  <AltairTablePrimaryCell
                    primary={
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
                    }
                    secondary={
                      <>
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
                            <AltairTableSecondaryText
                              className={
                                northStar
                                  ? lt.tableMutedText
                                  : "text-xs text-slate-500"
                              }
                            >
                              {documentLine}
                            </AltairTableSecondaryText>
                          );
                        })()}
                        <SearchMatchReason
                          reason={matchReasons?.[job.id]}
                          className={
                            northStar
                              ? `mt-0.5 ${lt.tableMutedText}`
                              : "mt-0.5 text-xs text-slate-500"
                          }
                        />
                      </>
                    }
                  />
                  <AltairTableCell
                    className={
                      northStar ? "job-north-star-scheduled-cell" : "text-slate-600"
                    }
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
                  </AltairTableCell>
                  <AltairTableCell>
                    <JobStatusBadge status={job.status} />
                  </AltairTableCell>
                  <AltairTableCell>
                    <JobPriorityBadge priority={job.priority} />
                  </AltairTableCell>
                  <AltairTableCell>
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
                  </AltairTableCell>
                  <AltairTableCell
                    className={
                      northStar ? "job-north-star-tech-cell" : "text-slate-600"
                    }
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
                  </AltairTableCell>
                </AltairTableRow>
              );
            })}
          </AltairTableBody>
        </AltairTable>
      </div>
    </>
  );
}
