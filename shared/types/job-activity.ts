import { formatJobStatus, type JobStatus } from "@/shared/types/job";

export type JobActivityType =
  | "job_created"
  | "technician_assigned"
  | "start_route"
  | "start_work"
  | "complete_job"
  | "status_changed"
  | "job_cancelled";

export type JobActivityMetadata = {
  job_number?: string;
  from_status?: JobStatus;
  to_status?: JobStatus;
  action_id?: string;
  technician_id?: string;
  technician_name?: string;
  previous_technician_id?: string;
  previous_technician_name?: string;
};

export type JobActivity = {
  id: string;
  jobId: string;
  eventType: JobActivityType;
  metadata: JobActivityMetadata;
  actorId?: string;
  actorName?: string;
  createdAt: string;
};

const ACTIVITY_TYPE_LABELS: Record<JobActivityType, string> = {
  job_created: "Job created",
  technician_assigned: "Technician assigned",
  start_route: "Start Route",
  start_work: "Start Work",
  complete_job: "Complete Job",
  status_changed: "Status changed",
  job_cancelled: "Job cancelled",
};

export function formatJobActivityLabel(activity: JobActivity): string {
  return ACTIVITY_TYPE_LABELS[activity.eventType];
}

export function formatJobActivityDetails(activity: JobActivity): string | null {
  const { metadata, eventType } = activity;

  switch (eventType) {
    case "job_created":
      return metadata.job_number ? `Job ${metadata.job_number}` : null;

    case "technician_assigned":
      if (metadata.previous_technician_name && metadata.technician_name) {
        return `Reassigned to ${metadata.technician_name} (was ${metadata.previous_technician_name})`;
      }
      if (metadata.technician_name) {
        return `Assigned to ${metadata.technician_name}`;
      }
      return null;

    case "job_cancelled":
    case "start_route":
    case "start_work":
    case "complete_job":
    case "status_changed": {
      if (metadata.from_status && metadata.to_status) {
        return `${formatJobStatus(metadata.from_status)} → ${formatJobStatus(metadata.to_status)}`;
      }
      if (metadata.to_status) {
        return formatJobStatus(metadata.to_status);
      }
      return null;
    }

    default:
      return null;
  }
}

export function formatJobActivityTimestamp(isoDate: string): string {
  const date = new Date(isoDate);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
