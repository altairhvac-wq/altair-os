import {
  getJobNextBusinessAction,
  type JobBillingSummariesByJobId,
} from "@/shared/lib/job-next-business-action";
import { isJobOnOperationalDay } from "@/shared/lib/scheduled-today";
import { getJobLifecycleState } from "@/shared/lib/job-lifecycle";
import { buttonClassName } from "@/shared/design-system/components/button-styles";
import {
  formatJobStatus,
  type Job,
  type JobStatus,
} from "@/shared/types/job";

/**
 * Presentation helpers for the Jobs list — Mission Control language.
 * Display-only cues derived from existing job fields and billing summaries;
 * no data, status, or workflow changes.
 */

export type JobListCueTone = "neutral" | "warning" | "danger";

export type JobListCue = {
  label: string;
  tone: JobListCueTone;
};

export type JobSchedulePresentation = {
  kind: "today" | "upcoming" | "past" | "unscheduled";
  label: string;
};

const STATUS_NEXT_CUE: Record<JobStatus, string> = {
  scheduled: "Ready to dispatch",
  dispatched: "En route",
  arrived: "On site",
  in_progress: "Work in progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Quiet “what next?” line for list scanability. */
export function resolveJobListCue(
  job: Job,
  billingSummaries?: JobBillingSummariesByJobId,
): JobListCue {
  const lifecycle = getJobLifecycleState(job);

  if (lifecycle === "deleted") {
    return { label: "In trash", tone: "warning" };
  }

  if (lifecycle === "archived") {
    return { label: "Archived", tone: "neutral" };
  }

  if (job.status === "cancelled") {
    return { label: "Cancelled", tone: "neutral" };
  }

  if (
    !job.assignedTechnicianId &&
    job.status !== "completed"
  ) {
    return { label: "Assign technician", tone: "warning" };
  }

  if (job.priority === "urgent" && job.status !== "completed") {
    return { label: "Urgent", tone: "danger" };
  }

  if (billingSummaries) {
    const action = getJobNextBusinessAction(
      {
        jobId: job.id,
        customerId: job.customerId,
        jobStatus: job.status,
        estimates: billingSummaries.estimatesByJobId[job.id] ?? [],
        invoices: billingSummaries.invoicesByJobId[job.id] ?? [],
      },
      {
        canCreateEstimate: true,
        canViewBilling: true,
      },
    );

    if (action?.label) {
      return {
        label: action.label,
        tone: action.emphasize ? "warning" : "neutral",
      };
    }
  }

  return {
    label: STATUS_NEXT_CUE[job.status] ?? formatJobStatus(job.status),
    tone: job.status === "in_progress" ? "warning" : "neutral",
  };
}

/** Schedule scan label from existing operational-day helpers. */
export function resolveJobSchedulePresentation(
  job: Job,
  options?: { timeZone?: string; reference?: Date },
): JobSchedulePresentation {
  const scheduled = job.scheduledDate?.trim();
  if (!scheduled) {
    return { kind: "unscheduled", label: "Unscheduled" };
  }

  if (
    isJobOnOperationalDay(job, {
      timeZone: options?.timeZone,
      reference: options?.reference,
    })
  ) {
    return { kind: "today", label: "Today" };
  }

  const scheduledMs = Date.parse(scheduled);
  if (Number.isNaN(scheduledMs)) {
    return { kind: "unscheduled", label: "Unscheduled" };
  }

  const reference = options?.reference ?? new Date();
  if (scheduledMs < reference.getTime() && job.status !== "completed") {
    return { kind: "past", label: "Past due" };
  }

  if (scheduledMs < reference.getTime()) {
    return { kind: "past", label: "Past" };
  }

  return { kind: "upcoming", label: "Upcoming" };
}

/** Shared Mission Control class tokens for the Jobs list surface. */
export const jobMissionClasses = {
  filterRegion:
    "job-mission-filter-region shrink-0 border-b border-altair-border/70 bg-altair-paper-subtle/80",
  filterTabsBand: "px-3 pt-2.5 sm:px-4",
  filterSearchBand: "px-3 pb-3 pt-2 sm:px-4",
  searchInput:
    "h-11 w-full min-h-11 rounded-xl border border-altair-border bg-altair-paper-elevated py-1.5 pl-9 pr-3 text-sm text-altair-ink-on-paper placeholder:text-altair-ink-on-paper-muted outline-none transition-colors hover:border-altair-border-strong focus-visible:border-altair-border-strong focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated md:h-10 md:min-h-10",
  filterSelect:
    "h-11 w-full min-h-11 appearance-none rounded-xl border border-altair-border bg-altair-paper-elevated py-1.5 pl-9 pr-8 text-sm font-medium text-altair-ink-on-paper outline-none transition-colors hover:border-altair-border-strong focus-visible:border-altair-border-strong focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated sm:w-auto sm:pr-10 md:h-10 md:min-h-10",
  filterIcon: "text-altair-ink-on-paper-muted",
  filterMeta: "mt-1.5 text-[11px] text-altair-ink-on-paper-muted sm:text-xs",
  clearFilters:
    "font-semibold text-altair-brass-interactive hover:text-altair-brass",
  listShell: "job-mission-list",
  primaryText: "truncate text-sm font-semibold text-altair-ink-on-paper",
  secondaryText: "truncate text-xs text-altair-ink-on-paper-muted",
  metaText: "text-sm text-altair-ink-on-paper-secondary",
  cueNeutral: "text-sm text-altair-ink-on-paper-secondary",
  cueWarning: "text-sm font-medium text-altair-warning-foreground",
  cueDanger: "text-sm font-medium text-altair-danger-foreground",
  unassignedText: "text-altair-warning-foreground",
  scheduleToday: "text-altair-ink-on-paper",
  scheduleUpcoming: "text-altair-ink-on-paper-secondary",
  schedulePast: "text-altair-danger-foreground",
  scheduleUnscheduled: "text-altair-warning-foreground",
  bulkBar:
    "sticky bottom-0 z-20 border-t border-altair-border bg-altair-paper/95 px-3 py-3 shadow-[0_-8px_24px_-12px_rgba(3,7,12,0.12)] backdrop-blur-sm sm:px-4",
  bulkBarTitle: "text-sm font-semibold text-altair-ink-on-paper",
  bulkClearButton: buttonClassName("quiet", "sm", "shrink-0"),
  bulkSecondaryAction: buttonClassName("secondary", "sm"),
  bulkPrimaryAction: buttonClassName("primary", "sm"),
  bulkFieldLabel:
    "text-[11px] font-semibold uppercase tracking-wide text-altair-ink-on-paper-muted",
  bulkSelect:
    "min-w-0 flex-1 rounded-lg border border-altair-border bg-altair-paper-elevated px-2.5 py-2 text-sm text-altair-ink-on-paper outline-none focus:border-altair-brass focus:ring-2 focus:ring-altair-brass/25 disabled:opacity-60",
} as const;

export function jobListCueClass(tone: JobListCueTone): string {
  if (tone === "danger") return jobMissionClasses.cueDanger;
  if (tone === "warning") return jobMissionClasses.cueWarning;
  return jobMissionClasses.cueNeutral;
}

export function jobScheduleTextClass(
  kind: JobSchedulePresentation["kind"],
): string {
  switch (kind) {
    case "today":
      return jobMissionClasses.scheduleToday;
    case "upcoming":
      return jobMissionClasses.scheduleUpcoming;
    case "past":
      return jobMissionClasses.schedulePast;
    case "unscheduled":
      return jobMissionClasses.scheduleUnscheduled;
  }
}
