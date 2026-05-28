import { formatDateTimeInTimeZone } from "@/shared/lib/datetime";
import { formatJobStatus, type JobStatus } from "@/shared/types/job";

export type JobActivityType =
  | "job_created"
  | "technician_assigned"
  | "technician_unassigned"
  | "start_route"
  | "start_work"
  | "complete_job"
  | "technician_arrived"
  | "work_started"
  | "work_completed"
  | "status_changed"
  | "job_cancelled"
  | "job_attachment_uploaded"
  | "job_material_added"
  | "invoice_created_for_completed_job"
  | "labor_entries_closed"
  | "job_labor_auto_closed"
  | "pending_expenses_resolved"
  | "material_costs_completed";

export type JobActivityMetadata = {
  customer_id?: string;
  job_id?: string;
  job_number?: string;
  from_status?: JobStatus;
  to_status?: JobStatus;
  action_id?: string;
  source?: "manual" | "automatic";
  automated?: boolean;
  closed_reason?: "completed" | "cancelled";
  entries_closed_count?: number;
  technician_id?: string;
  technician_name?: string;
  actor_name?: string;
  previous_technician_id?: string;
  previous_technician_name?: string;
  dispatch_reactivated?: boolean;
  completion_notes?: string;
  follow_up_notes?: string;
  attachment_type?: string;
  file_name?: string;
  material_id?: string;
  service_item_id?: string;
  name?: string;
  quantity?: number;
  unit_cost?: number;
  unit_price?: number;
  taxable?: boolean;
  review_blocker?: string;
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
  technician_unassigned: "Technician unassigned",
  start_route: "En Route",
  start_work: "Start Work",
  complete_job: "Complete Job",
  technician_arrived: "Arrived on site",
  work_started: "Work started",
  work_completed: "Work completed",
  status_changed: "Status changed",
  job_cancelled: "Job cancelled",
  job_attachment_uploaded: "Attachment uploaded",
  job_material_added: "Material logged",
  invoice_created_for_completed_job:
    "Office review blocker resolved: Invoice created",
  labor_entries_closed:
    "Office review blocker resolved: Labor entries closed",
  job_labor_auto_closed: "Labor auto-closed",
  pending_expenses_resolved:
    "Office review blocker resolved: Pending expenses resolved",
  material_costs_completed:
    "Office review blocker resolved: Material costs completed",
};

function resolveStatusChangedLabel(metadata: JobActivityMetadata): string {
  if (metadata.action_id === "status_correction") {
    return "Status corrected";
  }
  if (metadata.action_id === "reopen") {
    return "Job reopened";
  }
  return ACTIVITY_TYPE_LABELS.status_changed;
}

export function formatJobActivityLabel(activity: JobActivity): string {
  if (activity.eventType === "status_changed") {
    return resolveStatusChangedLabel(activity.metadata);
  }
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

    case "technician_unassigned":
      if (metadata.technician_name) {
        return `Removed ${metadata.technician_name} from dispatch`;
      }
      return "Removed technician from dispatch";

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
      if (metadata.action_id === "status_correction") {
        const transition = formatStatusTransition(
          metadata.from_status,
          metadata.to_status,
        );
        return transition
          ? `Manual correction · ${transition}`
          : "Manual correction";
      }
      if (metadata.action_id === "reopen") {
        const transition = formatStatusTransition(
          metadata.from_status,
          metadata.to_status,
        );
        const parts: string[] = [];
        if (transition) {
          parts.push(transition);
        }
        if (metadata.dispatch_reactivated && metadata.technician_name) {
          parts.push(
            `Dispatch reactivated for ${metadata.technician_name}`,
          );
        }
        return parts.length > 0 ? parts.join(" · ") : "Job reopened";
      }
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

    case "job_material_added": {
      const parts: string[] = [];
      if (metadata.name) {
        parts.push(metadata.name);
      }
      if (typeof metadata.quantity === "number") {
        parts.push(`Qty ${metadata.quantity}`);
      }
      if (typeof metadata.unit_price === "number") {
        parts.push(
          new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(metadata.unit_price),
        );
      }
      return parts.length > 0 ? parts.join(" · ") : null;
    }

    case "invoice_created_for_completed_job":
    case "labor_entries_closed":
    case "pending_expenses_resolved":
    case "material_costs_completed":
      return metadata.job_number ? `Job ${metadata.job_number}` : null;

    case "job_labor_auto_closed": {
      const parts: string[] = ["Automatic cleanup"];
      const count = metadata.entries_closed_count ?? 1;
      parts.push(
        `${count} open labor segment${count === 1 ? "" : "s"}`,
      );
      if (metadata.closed_reason === "completed") {
        parts.push("when job was marked complete");
      } else if (metadata.closed_reason === "cancelled") {
        parts.push("when job was cancelled");
      }
      return parts.join(" · ");
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

export function formatJobActivityTimestamp(
  isoDate: string,
  timeZone?: string,
): string {
  return formatDateTimeInTimeZone(isoDate, timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
