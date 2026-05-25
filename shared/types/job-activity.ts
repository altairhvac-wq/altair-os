import { formatJobStatus, type JobStatus } from "@/shared/types/job";

export type JobActivityType =
  | "job_created"
  | "technician_assigned"
  | "start_route"
  | "start_work"
  | "complete_job"
  | "technician_arrived"
  | "work_started"
  | "work_completed"
  | "status_changed"
  | "job_cancelled"
  | "job_attachment_uploaded";

export type JobActivityMetadata = {
  customer_id?: string;
  job_id?: string;
  job_number?: string;
  from_status?: JobStatus;
  to_status?: JobStatus;
  action_id?: string;
  technician_id?: string;
  technician_name?: string;
  previous_technician_id?: string;
  previous_technician_name?: string;
  completion_notes?: string;
  follow_up_notes?: string;
  attachment_type?: string;
  file_name?: string;
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
  start_route: "En Route",
  start_work: "Start Work",
  complete_job: "Complete Job",
  technician_arrived: "Arrived on site",
  work_started: "Work started",
  work_completed: "Work completed",
  status_changed: "Status changed",
  job_cancelled: "Job cancelled",
  job_attachment_uploaded: "Attachment uploaded",
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

    case "work_completed": {
      const parts: string[] = [];
      const statusLine = formatStatusTransition(
        metadata.from_status,
        metadata.to_status,
      );
      if (statusLine) {
        parts.push(statusLine);
      }
      if (metadata.completion_notes?.trim()) {
        parts.push(metadata.completion_notes.trim());
      }
      if (metadata.follow_up_notes?.trim()) {
        parts.push(`Follow-up: ${metadata.follow_up_notes.trim()}`);
      }
      return parts.length > 0 ? parts.join(" · ") : null;
    }

    case "job_cancelled":
    case "start_route":
    case "start_work":
    case "complete_job":
    case "technician_arrived":
    case "work_started":
    case "status_changed":
      return formatStatusTransition(metadata.from_status, metadata.to_status);

    case "job_attachment_uploaded": {
      const parts: string[] = [];
      if (metadata.attachment_type) {
        parts.push(
          metadata.attachment_type.charAt(0).toUpperCase() +
            metadata.attachment_type.slice(1),
        );
      }
      if (metadata.file_name) {
        parts.push(metadata.file_name);
      }
      return parts.length > 0 ? parts.join(" · ") : null;
    }

    default:
      return null;
  }
}

function formatStatusTransition(
  fromStatus: JobStatus | undefined,
  toStatus: JobStatus | undefined,
): string | null {
  if (fromStatus && toStatus) {
    return `${formatJobStatus(fromStatus)} → ${formatJobStatus(toStatus)}`;
  }
  if (toStatus) {
    return formatJobStatus(toStatus);
  }
  return null;
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
