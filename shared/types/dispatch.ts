export type DispatchJobStatus =
  | "scheduled"
  | "dispatched"
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
  jobNumber: string;
  customerName: string;
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
  { value: "dispatched", label: "Dispatched" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function formatDispatchStatus(status: DispatchJobStatus): string {
  return status.replace("_", " ");
}

export function formatDispatchTime(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDispatchDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatFullAddress(job: DispatchJob): string {
  return `${job.serviceAddress}, ${job.city}, ${job.state} ${job.zip}`;
}

export function isScheduledToday(date: string, reference = new Date()): boolean {
  const scheduled = new Date(date);
  return (
    scheduled.getFullYear() === reference.getFullYear() &&
    scheduled.getMonth() === reference.getMonth() &&
    scheduled.getDate() === reference.getDate()
  );
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
