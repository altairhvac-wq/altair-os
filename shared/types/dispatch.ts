import {
  formatDateInTimeZone,
  formatTimeInTimeZone,
  isSameCalendarDayInTimeZone,
} from "@/shared/lib/datetime";

export type DispatchJobStatus =
  | "scheduled"
  | "dispatched"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled";

export type DispatchJobPriority = "low" | "normal" | "high" | "urgent";

export type TechnicianStatus = "available" | "on_job" | "off_duty";

export type Technician = {
  id: string;
  name: string;
  role: string;
  initials: string;
  status: TechnicianStatus;
  specialty: string;
  phone: string;
};

export type DispatchJob = {
  id: string;
  customerId: string;
  jobNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  serviceAddress: string;
  city: string;
  state: string;
  zip: string;
  jobType: string;
  technicianId?: string;
  scheduledDate: string;
  status: DispatchJobStatus;
  priority: DispatchJobPriority;
  description?: string;
  notes?: string;
  arrivedAt?: string;
  workStartedAt?: string;
};

export type DispatchSummary = {
  scheduledToday: number;
  inProgress: number;
  unassigned: number;
  completed: number;
};

export const DISPATCH_STATUS_OPTIONS: {
  value: DispatchJobStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "dispatched", label: "En Route" },
  { value: "arrived", label: "On Site" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const DISPATCH_STATUS_LABELS: Record<DispatchJobStatus, string> = {
  scheduled: "Scheduled",
  dispatched: "En Route",
  arrived: "On Site",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function formatDispatchStatus(status: DispatchJobStatus): string {
  return DISPATCH_STATUS_LABELS[status];
}

export function formatDispatchTime(date: string, timeZone?: string): string {
  return formatTimeInTimeZone(date, timeZone);
}

export function formatDispatchDate(date: string, timeZone?: string): string {
  return formatDateInTimeZone(date, timeZone, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatFullAddress(job: DispatchJob): string {
  return `${job.serviceAddress}, ${job.city}, ${job.state} ${job.zip}`;
}

export function hasAssignedJobTechnician(job: {
  technicianId?: string;
  assignedTechnicianId?: string;
}): boolean {
  return Boolean(job.technicianId ?? job.assignedTechnicianId);
}

export function canUnassignJobTechnician(
  job: {
    technicianId?: string;
    assignedTechnicianId?: string;
    status: DispatchJobStatus;
  },
  canDispatchJobs: boolean,
): boolean {
  return (
    canDispatchJobs &&
    hasAssignedJobTechnician(job) &&
    job.status !== "completed" &&
    job.status !== "cancelled"
  );
}

export function isScheduledToday(
  date: string,
  reference = new Date(),
  timeZone?: string,
): boolean {
  return isSameCalendarDayInTimeZone(date, reference, timeZone);
}

export function getDispatchSummary(
  jobs: DispatchJob[],
  reference = new Date(),
): DispatchSummary {
  return {
    scheduledToday: jobs.filter(
      (job) =>
        isScheduledToday(job.scheduledDate, reference) &&
        job.status !== "cancelled",
    ).length,
    inProgress: jobs.filter((job) => job.status === "in_progress").length,
    unassigned: jobs.filter(
      (job) => !job.technicianId && job.status !== "cancelled",
    ).length,
    completed: jobs.filter((job) => job.status === "completed").length,
  };
}

export function filterDispatchJobs(
  jobs: DispatchJob[],
  technicians: Technician[],
  search: string,
  statusFilter: DispatchJobStatus | "all",
  technicianFilter: string,
): DispatchJob[] {
  const query = search.trim().toLowerCase();
  const techById = new Map(technicians.map((t) => [t.id, t.name]));

  return jobs.filter((job) => {
    if (statusFilter !== "all" && job.status !== statusFilter) return false;

    if (technicianFilter === "unassigned") {
      if (job.technicianId) return false;
    } else if (technicianFilter !== "all") {
      if (job.technicianId !== technicianFilter) return false;
    }

    if (!query) return true;

    const technicianName = job.technicianId
      ? (techById.get(job.technicianId) ?? "")
      : "unassigned";

    const haystack = [
      job.customerName,
      job.jobType,
      technicianName,
      job.serviceAddress,
      job.city,
      job.state,
      formatDispatchStatus(job.status),
      job.jobNumber,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}
