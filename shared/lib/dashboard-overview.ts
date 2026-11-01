import {
  buildDashboardExceptionBuckets,
  type DashboardExceptionBucket,
  type DashboardExceptionBucketUrgency,
} from "@/shared/lib/dashboard-exception-board";
import { getDateOnlyInTimeZone } from "@/shared/lib/datetime";
import type { DashboardData } from "@/shared/types/dashboard";
import type { DocumentQueueMetrics } from "@/lib/database/queries/list-pages";
import {
  hasAssignedJobTechnician,
  type DispatchJob,
} from "@/shared/types/dispatch";
import { getTeamMemberInitials } from "@/shared/types/team-member";
import { roundCurrency } from "@/shared/types/invoice";

/** Quick-action destinations in the overview header. */
export const DASHBOARD_QUICK_ACTIONS = [
  { id: "job", label: "New job", href: "/work?create=1" },
  { id: "estimate", label: "New estimate", href: "/sales?create=1" },
  { id: "invoice", label: "New invoice", href: "/sales?tab=invoices&create=1" },
  { id: "lead", label: "New lead", href: "/customers?tab=pipeline&create=1" },
] as const;

const URGENCY_RANK: Record<DashboardExceptionBucketUrgency, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export type DashboardActionRow = {
  id: DashboardExceptionBucket["id"];
  count: number;
  urgency: DashboardExceptionBucketUrgency;
  title: string;
  detail: string;
  href: string;
};

/**
 * The Needs-attention buckets as one ranked list: red first, then amber, then
 * neutral, ties broken by the board's fixed critical order. Each row keeps the
 * bucket's own summary line and links to the bucket's screen.
 */
export function buildDashboardActionRows(
  data: DashboardData,
): { rows: DashboardActionRow[]; totalCount: number } {
  const buckets = buildDashboardExceptionBuckets(data);
  const rows = buckets
    .map((bucket, index) => ({ bucket, index }))
    .sort(
      (left, right) =>
        URGENCY_RANK[left.bucket.urgency] - URGENCY_RANK[right.bucket.urgency] ||
        left.index - right.index,
    )
    .map(({ bucket }) => ({
      id: bucket.id,
      count: bucket.count,
      urgency: bucket.urgency,
      title: bucket.title,
      detail: bucket.detail,
      href: bucket.href,
    }));

  return {
    rows,
    totalCount: buckets.reduce((sum, bucket) => sum + bucket.count, 0),
  };
}

/** Estimate pipeline totals for the overview ledger. */
export function summarizeEstimatePipeline(
  metrics: DocumentQueueMetrics["estimates"],
): { openCount: number; openAmount: number } {
  const open = [metrics.draft, metrics.sent, metrics.approved];
  return {
    openCount: open.reduce((sum, metric) => sum + metric.count, 0),
    openAmount: roundCurrency(
      open.reduce((sum, metric) => sum + metric.amount, 0),
    ),
  };
}

/** Lane bounds for the dispatch strip, in local hours. */
export const DISPATCH_LANE_START_HOUR = 7;
export const DISPATCH_LANE_END_HOUR = 19;

export type DispatchLaneMarker = {
  jobId: string;
  /** 0–100, position along the lane; jobs outside the band clamp to its edges. */
  percent: number;
  label: string;
  status: DispatchJob["status"];
};

export type DispatchLane = {
  technicianId: string;
  name: string;
  initials: string;
  timeState: DashboardData["technicians"][number]["timeState"];
  jobCount: number;
  markers: DispatchLaneMarker[];
};

export type DispatchStripSummary = {
  lanes: DispatchLane[];
  assignedJobs: number;
  unassignedJobs: number;
  clockedIn: number;
};

function minutesOfDayInTimeZone(iso: string, timeZone: string): number | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    }).formatToParts(date);
    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    const minute = Number(parts.find((part) => part.type === "minute")?.value);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return hour * 60 + minute;
  } catch {
    return date.getHours() * 60 + date.getMinutes();
  }
}

function laneLabel(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

/**
 * One lane per technician on the roster with a dot at each of today's job
 * start times. Dots, not bars: jobs carry a start time and no duration, so a
 * bar's width would be a measurement nothing recorded.
 */
export function buildDispatchStrip(
  data: DashboardData,
  timeZone: string,
): DispatchStripSummary {
  const today = getDateOnlyInTimeZone(new Date(), timeZone);
  const laneMinutes = (DISPATCH_LANE_END_HOUR - DISPATCH_LANE_START_HOUR) * 60;
  const startMinutes = DISPATCH_LANE_START_HOUR * 60;

  const jobsByTechnician = new Map<string, DispatchJob[]>();
  let assignedJobs = 0;
  for (const job of data.operations.todayJobs) {
    if (job.status === "cancelled") continue;
    if (!hasAssignedJobTechnician(job) || !job.technicianId) continue;
    assignedJobs += 1;
    const list = jobsByTechnician.get(job.technicianId) ?? [];
    list.push(job);
    jobsByTechnician.set(job.technicianId, list);
  }

  const lanes: DispatchLane[] = data.technicians.map((technician) => {
    const jobs = (jobsByTechnician.get(technician.id) ?? [])
      .slice()
      .sort((left, right) => left.scheduledDate.localeCompare(right.scheduledDate));
    const markers: DispatchLaneMarker[] = [];
    for (const job of jobs) {
      if (getDateOnlyInTimeZone(new Date(job.scheduledDate), timeZone) !== today) {
        continue;
      }
      const minutes = minutesOfDayInTimeZone(job.scheduledDate, timeZone);
      if (minutes == null) continue;
      const percent = Math.min(
        100,
        Math.max(0, ((minutes - startMinutes) / laneMinutes) * 100),
      );
      markers.push({
        jobId: job.id,
        percent,
        label: `${laneLabel(job.scheduledDate, timeZone)} · ${job.jobType} · ${job.customerName}`,
        status: job.status,
      });
    }
    return {
      technicianId: technician.id,
      name: technician.name,
      initials: technician.initials || getTeamMemberInitials(technician.name),
      timeState: technician.timeState,
      jobCount: jobs.length,
      markers,
    };
  });

  // Technicians with jobs today first, then by name, so the busy lanes lead.
  lanes.sort(
    (left, right) =>
      right.jobCount - left.jobCount || left.name.localeCompare(right.name),
  );

  return {
    lanes,
    assignedJobs,
    unassignedJobs: data.operations.unassignedToday,
    clockedIn: data.technicians.filter(
      (technician) => technician.timeState !== "off_clock",
    ).length,
  };
}

export function formatTimeState(
  state: DashboardData["technicians"][number]["timeState"],
): string {
  switch (state) {
    case "working_job":
      return "On a job";
    case "on_break":
      return "On break";
    case "clocked_in":
      return "Clocked in";
    default:
      return "Off clock";
  }
}
