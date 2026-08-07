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
import {
  jobListCueClass,
  jobMissionClasses as jm,
  jobScheduleTextClass,
  resolveJobListCue,
  resolveJobSchedulePresentation,
} from "./job-list-presentation";

type JobsTableProps = {
  jobs: Job[];
  onSelect: (job: Job) => void;
  canManageCustomers?: boolean;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelection?: (jobId: string) => void;
  onToggleAllVisible?: (selectAll: boolean) => void;
  /** @deprecated Mission Control unifies presentation; retained for call-site compatibility. */
  northStar?: boolean;
  billingSummaries?: JobBillingSummariesByJobId;
  matchReasons?: Record<string, string>;
  companyTimeZone?: string;
};

/**
 * Focus ring for the primary job-number link — brass command ring aligned
 * with Customers Mission Briefing primary-cell links.
 */
const jobNumberLinkFocusClass =
  "hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40 focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated";

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
  billingSummaries,
  matchReasons,
  companyTimeZone,
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
        billingSummaries={billingSummaries}
        matchReasons={matchReasons}
        companyTimeZone={companyTimeZone}
      />

      <div className={`hidden max-w-full overflow-x-auto md:block ${jm.listShell}`}>
        <AltairTable className="min-w-[920px]">
          <AltairTableHeader>
            <AltairTableRow>
              {selectionEnabled ? (
                <AltairTableHead className="w-10">
                  {headerSelection && headerSelection.selectableCount > 0 ? (
                    <BulkSelectCheckbox
                      checked={headerSelection.allSelected}
                      indeterminate={headerSelection.someSelected}
                      ariaLabel="Select all visible jobs"
                      onChange={(checked) => onToggleAllVisible?.(checked)}
                    />
                  ) : null}
                </AltairTableHead>
              ) : null}
              <AltairTableHead>Job</AltairTableHead>
              <AltairTableHead>Customer</AltairTableHead>
              <AltairTableHead>Type</AltairTableHead>
              <AltairTableHead>Status</AltairTableHead>
              <AltairTableHead>Scheduled</AltairTableHead>
              <AltairTableHead>Technician</AltairTableHead>
              <AltairTableHead>Next</AltairTableHead>
            </AltairTableRow>
          </AltairTableHeader>
          <AltairTableBody>
            {jobs.map((job) => {
              const isSelected = selectedIds?.has(job.id) ?? false;
              const cue = resolveJobListCue(job, billingSummaries);
              const schedule = resolveJobSchedulePresentation(job, {
                timeZone: companyTimeZone,
              });
              const documentLine = formatJobDocumentReferencesLine({
                estimateNumbers: (
                  billingSummaries?.estimatesByJobId[job.id] ?? []
                ).map((estimate) => estimate.estimateNumber),
                invoiceNumbers: (
                  billingSummaries?.invoicesByJobId[job.id] ?? []
                ).map((invoice) => invoice.invoiceNumber),
              });

              return (
                <AltairTableRow
                  key={job.id}
                  selected={isSelected}
                  onClick={() => onSelect(job)}
                  data-testid="job-row"
                >
                  {selectionEnabled ? (
                    <AltairTableCell>
                      <BulkSelectCheckbox
                        checked={isSelected}
                        ariaLabel={`Select job ${job.jobNumber}`}
                        onChange={() => onToggleSelection?.(job.id)}
                      />
                    </AltairTableCell>
                  ) : null}
                  <AltairTablePrimaryCell
                    primary={
                      <Link
                        href={`/work/${job.id}`}
                        onClick={handleJobLinkClick}
                        className={`${jm.primaryText} ${jobNumberLinkFocusClass}`}
                      >
                        {job.jobNumber}
                      </Link>
                    }
                    trailing={
                      job.priority === "urgent" || job.priority === "high" ? (
                        <JobPriorityBadge priority={job.priority} />
                      ) : null
                    }
                    secondary={
                      <>
                        {documentLine ? (
                          <AltairTableSecondaryText className={jm.secondaryText}>
                            {documentLine}
                          </AltairTableSecondaryText>
                        ) : null}
                        <SearchMatchReason
                          reason={matchReasons?.[job.id]}
                          className={`mt-0.5 ${jm.secondaryText}`}
                        />
                      </>
                    }
                  />
                  <AltairTableCell>
                    <CustomerNameLink
                      customerId={job.customerId}
                      customerName={job.customerName}
                      canManageCustomers={canManageCustomers}
                      className={`${jm.primaryText} truncate font-medium`}
                      linkClassName={`${jm.primaryText} truncate font-medium ${jobNumberLinkFocusClass}`}
                      stopRowNavigation
                    />
                  </AltairTableCell>
                  <AltairTableCell className={jm.metaText}>
                    <span className="truncate">
                      {job.jobType?.trim() || "—"}
                    </span>
                  </AltairTableCell>
                  <AltairTableCell>
                    <JobStatusBadge status={job.status} />
                  </AltairTableCell>
                  <AltairTableCell>
                    <p
                      className={`text-sm font-medium ${jobScheduleTextClass(schedule.kind)}`}
                    >
                      {formatScheduledDate(job.scheduledDate)}
                    </p>
                    <p className={jm.secondaryText}>
                      {formatScheduledTime(job.scheduledDate)}
                      {schedule.kind === "today" ||
                      schedule.kind === "past" ||
                      schedule.kind === "unscheduled"
                        ? ` · ${schedule.label}`
                        : ""}
                    </p>
                  </AltairTableCell>
                  <AltairTableCell className={jm.metaText}>
                    {job.assignedTechnician ?? (
                      <span className={jm.unassignedText}>Unassigned</span>
                    )}
                  </AltairTableCell>
                  <AltairTableCell className={jobListCueClass(cue.tone)}>
                    {cue.label}
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
