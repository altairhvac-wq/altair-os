export type JobStatus =
  | "scheduled"
  | "dispatched"
  | "in_progress"
  | "completed"
  | "cancelled";

export type JobPriority = "low" | "normal" | "high" | "urgent";

export type Job = {
  id: string;
  jobNumber: string;
  customerId: string;
  customerName: string;
  serviceAddress: string;
  city: string;
  state: string;
  zip: string;
  jobType: string;
  assignedTechnicianId?: string;
  assignedTechnician?: string;
  scheduledDate: string;
  status: JobStatus;
  priority: JobPriority;
  description?: string;
  notes?: string;
  createdAt: string;
};

export type JobDetail = Job & {
  customerEmail?: string;
  customerPhone?: string;
  customerCompany?: string;
};

export type JobFormData = {
  customerId: string;
  serviceAddress: string;
  city: string;
  state: string;
  zip: string;
  jobType: string;
  scheduledDate: string;
  status: JobStatus;
  priority: JobPriority;
  description: string;
  notes: string;
};

export const JOB_STATUS_OPTIONS: {
  value: JobStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "dispatched", label: "En Route" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const JOB_PRIORITY_OPTIONS: {
  value: JobPriority | "all";
  label: string;
}[] = [
  { value: "all", label: "All priorities" },
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const JOB_TYPE_OPTIONS = [
  "HVAC Maintenance",
  "AC Repair",
  "Plumbing Repair",
  "Water Heater Replacement",
  "Electrical Install",
  "Drain Cleaning",
  "Duct Cleaning",
  "Emergency Service",
] as const;

const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  scheduled: "Scheduled",
  dispatched: "En Route",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function formatJobStatus(status: JobStatus): string {
  return JOB_STATUS_LABELS[status];
}

export function formatScheduledDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatScheduledTime(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}
