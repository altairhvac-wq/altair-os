import Link from "next/link";
import { DispatchStatusBadge } from "@/shared/components/dispatch/DispatchStatusBadge";
import { DISPATCH_PAGE_TODAY_HREF } from "@/shared/lib/dispatch-page-focus";
import type { DashboardData } from "@/shared/types/dashboard";
import {
  formatDispatchTime,
  hasAssignedJobTechnician,
  type DispatchJob,
  type DispatchJobPriority,
} from "@/shared/types/dispatch";
import { getTeamMemberInitials } from "@/shared/types/team-member";
import {
  OVERVIEW_CARD_CLASS,
  OVERVIEW_LINK_CLASS,
  OverviewAvatar,
  OverviewCardHeader,
} from "./overview-chrome";

const PRIORITY_LABEL: Record<DispatchJobPriority, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

const PRIORITY_CLASS: Record<DispatchJobPriority, string> = {
  urgent: "bg-altair-danger-surface text-altair-danger",
  high: "bg-altair-warning-surface text-altair-warning-foreground",
  normal: "bg-altair-paper-subtle text-altair-ink-on-paper-secondary",
  low: "bg-altair-paper-subtle text-altair-ink-on-paper-muted",
};

const PREVIEW_LIMIT = 6;

function resolveAssignee(
  job: DispatchJob,
  data: DashboardData,
): { name: string; initials: string } | null {
  if (!hasAssignedJobTechnician(job) || !job.technicianId) return null;
  const fromRoster = data.technicians.find((t) => t.id === job.technicianId);
  if (fromRoster) {
    return {
      name: fromRoster.name,
      initials: fromRoster.initials || getTeamMemberInitials(fromRoster.name),
    };
  }
  const fromAssignable = data.assignableTechnicians.find(
    (t) => t.id === job.technicianId,
  );
  if (fromAssignable) {
    return { name: fromAssignable.name, initials: fromAssignable.initials };
  }
  return { name: "Assigned", initials: "?" };
}

export function OverviewJobsTable({
  data,
  timeZone,
}: {
  data: DashboardData;
  timeZone?: string;
}) {
  const jobs = data.operations.todayJobs
    .filter((job) => job.status !== "cancelled")
    .slice()
    .sort((left, right) => left.scheduledDate.localeCompare(right.scheduledDate));
  const visible = jobs.slice(0, PREVIEW_LIMIT);
  const hidden = jobs.length - visible.length;
  const toSchedule = data.acceptedEstimatesNeedingScheduling.count;

  return (
    <section className={OVERVIEW_CARD_CLASS} aria-labelledby="overview-jobs-heading">
      <OverviewCardHeader
        title="Today's jobs"
        count={jobs.length}
        href={DISPATCH_PAGE_TODAY_HREF}
        hrefLabel="View schedule"
      />
      <span id="overview-jobs-heading" className="sr-only">
        Today&apos;s jobs
      </span>
      {visible.length > 0 ? (
        <div className="min-w-0">
          {/* Fixed layout so long names truncate inside the card instead of
              widening it; every cell that can grow is `truncate`. */}
          <table className="w-full table-fixed border-collapse text-[13px]">
            <colgroup>
              <col className="w-[5.5rem]" />
              <col />
              <col className="w-[22%]" />
              <col className="w-[22%]" />
              <col className="w-[6.5rem]" />
              <col className="w-[5.5rem]" />
            </colgroup>
            <thead>
              <tr className="bg-altair-paper-subtle text-left text-xs font-semibold text-altair-ink-on-paper-secondary">
                <th scope="col" className="px-4 py-2">Time</th>
                <th scope="col" className="px-3 py-2">Customer</th>
                <th scope="col" className="px-3 py-2">Job type</th>
                <th scope="col" className="px-3 py-2">Technician</th>
                <th scope="col" className="px-3 py-2">Status</th>
                <th scope="col" className="px-3 py-2 pr-4">Priority</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((job) => {
                const assignee = resolveAssignee(job, data);
                const priorityStripe =
                  job.priority === "urgent" || job.priority === "high"
                    ? "border-l-altair-danger"
                    : "border-l-altair-brass";
                return (
                  <tr
                    key={job.id}
                    className="border-t border-altair-border/40 transition-colors hover:bg-black/[0.03]"
                  >
                    <td
                      className={`whitespace-nowrap border-l-[3px] px-4 py-2.5 font-bold tabular-nums text-altair-ink-on-paper ${priorityStripe}`}
                    >
                      <Link
                        href={`/work/${job.id}`}
                        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                      >
                        {formatDispatchTime(job.scheduledDate, timeZone)}
                      </Link>
                    </td>
                    <td className="min-w-0 px-3 py-2.5">
                      <Link
                        href={`/work/${job.id}`}
                        className="block truncate font-semibold text-altair-ink-on-paper hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                      >
                        {job.customerName}
                      </Link>
                      <span className="block truncate text-xs text-altair-ink-on-paper-muted">
                        {job.serviceAddress}
                      </span>
                    </td>
                    <td className="truncate px-3 py-2.5 text-altair-ink-on-paper">
                      {job.jobType}
                    </td>
                    <td className="px-3 py-2.5">
                      {assignee ? (
                        <span className="flex min-w-0 items-center gap-2 text-altair-ink-on-paper">
                          <OverviewAvatar initials={assignee.initials} />
                          <span className="min-w-0 truncate">{assignee.name}</span>
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-altair-warning-surface px-2.5 py-0.5 text-[11px] font-semibold text-altair-warning-foreground">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <DispatchStatusBadge status={job.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${PRIORITY_CLASS[job.priority]}`}
                      >
                        {PRIORITY_LABEL[job.priority]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-altair-border/40 px-4 py-3 text-xs text-altair-ink-on-paper-muted">
        <span>
          {hidden > 0
            ? `${hidden} more on the board today.`
            : visible.length === 0
              ? "Nothing on the board today."
              : "That is everything on the board today."}
        </span>
        {toSchedule > 0 ? (
          <Link href="/sales" className={OVERVIEW_LINK_CLASS}>
            Schedule {toSchedule === 1 ? "the" : `one of the ${toSchedule}`} accepted{" "}
            {toSchedule === 1 ? "estimate" : "estimates"} →
          </Link>
        ) : hidden > 0 ? (
          <Link href={DISPATCH_PAGE_TODAY_HREF} className={OVERVIEW_LINK_CLASS}>
            Open the full board →
          </Link>
        ) : null}
      </div>
    </section>
  );
}
