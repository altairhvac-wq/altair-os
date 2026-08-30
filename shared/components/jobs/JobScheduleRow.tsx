import Link from "next/link";
import type { ReactNode } from "react";
import { StatusPill } from "@/shared/design-system/components/StatusPill";
import { altairMcListRowClass } from "@/shared/design-system/components/mc-surface";
import type { JobStatus } from "@/shared/types/job";
import { JobStatusBadge } from "./JobStatusBadge";

export type JobScheduleRowModel = {
  id: string;
  time: string;
  title: ReactNode;
  address: ReactNode;
  assigneeName: string;
  assigneeInitials: string;
  status: JobStatus;
  isUnassigned?: boolean;
  href?: string;
};

type JobScheduleRowProps = {
  row: JobScheduleRowModel;
  /** Button-mode select handler (Jobs Today). Ignored when `row.href` is used without onSelect. */
  onSelect?: () => void;
  ariaLabel?: string;
  selected?: boolean;
  leading?: ReactNode;
  titleAccessory?: ReactNode;
  className?: string;
};

const rowShellClass = `${altairMcListRowClass} flex flex-wrap items-center gap-3 sm:flex-nowrap`;

function TitleBlock({
  row,
  titleAccessory,
  linkTitle,
}: {
  row: JobScheduleRowModel;
  titleAccessory?: ReactNode;
  /** When true, wrap the title in `row.href` (dashboard preview). */
  linkTitle?: boolean;
}) {
  const titleClass =
    "block truncate text-sm font-semibold text-altair-ink-on-paper transition-colors";

  return (
    /*
     * `basis-full` below `sm`: the row is `flex-wrap`, so on a phone the
     * title block, the time, the assignee chip and the status pill all
     * competed for one line and the title — the only thing identifying the
     * job — truncated to nothing. Taking the full width first lets the
     * metadata wrap beneath it instead of squeezing it out.
     */
    <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
      {linkTitle && row.href ? (
        <Link
          href={row.href}
          className={`${titleClass} hover:text-altair-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]`}
        >
          {row.title}
        </Link>
      ) : (
        <p className={titleClass}>{row.title}</p>
      )}
      <p className="truncate text-xs text-altair-ink-on-paper-muted">
        {row.address}
      </p>
      {titleAccessory}
    </div>
  );
}

/** Compact schedule label: "Sarah Nguyen" → "Sarah N." Full name stays on hover. */
function compactAssigneeLabel(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return name;
  }
  if (parts.length === 1) {
    return parts[0]!;
  }
  const first = parts[0]!;
  const lastInitial = parts[parts.length - 1]![0];
  if (!lastInitial) {
    return first;
  }
  return `${first} ${lastInitial.toUpperCase()}.`;
}

function AssigneeBlock({ row }: { row: JobScheduleRowModel }) {
  if (row.isUnassigned) {
    return (
      <StatusPill tone="warning" size="sm" className="shrink-0">
        Unassigned
      </StatusPill>
    );
  }

  const shortName = compactAssigneeLabel(row.assigneeName);

  return (
    <div className="flex w-[6.75rem] shrink-0 items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-altair-paper-subtle text-[10px] font-semibold text-altair-ink-on-paper-secondary">
        {row.assigneeInitials}
      </span>
      <span
        data-schedule-assignee=""
        className="hidden min-w-0 flex-1 truncate text-xs text-altair-ink-on-paper-secondary sm:inline"
        title={row.assigneeName}
      >
        {shortName}
      </span>
    </div>
  );
}

/**
 * Compact day-schedule row shared by Mission Control “Today's schedule”
 * and the Jobs page Today view: time · title/address · assignee · status.
 */
export function JobScheduleRow({
  row,
  onSelect,
  ariaLabel,
  selected = false,
  leading,
  titleAccessory,
  className = "",
}: JobScheduleRowProps) {
  const selectedClass = selected ? "bg-altair-brass/5" : "";
  const linkTitle = Boolean(row.href) && !onSelect;

  const content = (
    <>
      <time className="w-16 shrink-0 text-xs font-semibold tabular-nums text-altair-ink-on-paper-muted sm:w-[4.5rem] sm:text-sm">
        {row.time}
      </time>
      <TitleBlock
        row={row}
        titleAccessory={titleAccessory}
        linkTitle={linkTitle}
      />
      <AssigneeBlock row={row} />
      <JobStatusBadge status={row.status} className="shrink-0" />
    </>
  );

  if (onSelect) {
    return (
      <div className={`flex items-stretch ${selectedClass}`}>
        {leading}
        <button
          type="button"
          onClick={onSelect}
          aria-label={ariaLabel}
          data-testid="job-row"
          className={`${rowShellClass} min-w-0 flex-1 text-left ${className}`}
        >
          {content}
        </button>
      </div>
    );
  }

  return (
    <div className={`${rowShellClass} ${selectedClass} ${className}`}>
      {leading}
      {content}
    </div>
  );
}
