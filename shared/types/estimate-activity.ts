import { formatDateTimeInTimeZone } from "@/shared/lib/datetime";
import { formatEstimateStatus, type EstimateStatus } from "@/shared/types/estimate";

export type EstimateActivityType =
  | "estimate_created"
  | "status_changed"
  | "estimate_sent"
  | "estimate_email_resent"
  | "estimate_approved"
  | "estimate_declined"
  | "estimate_cancelled"
  | "estimate_converted";

export type EstimateActivityMetadata = {
  estimate_number?: string;
  customer_id?: string;
  from_status?: EstimateStatus;
  to_status?: EstimateStatus;
  job_id?: string;
  job_number?: string;
  invoice_id?: string;
  invoice_number?: string;
  approval_source?: "public_link";
  creation_source?: "field" | "office";
  signer_name?: string;
};

export type EstimateActivity = {
  id: string;
  estimateId: string;
  eventType: EstimateActivityType;
  metadata: EstimateActivityMetadata;
  actorId?: string;
  actorName?: string;
  createdAt: string;
};

const ACTIVITY_TYPE_LABELS: Record<EstimateActivityType, string> = {
  estimate_created: "Estimate created",
  status_changed: "Status changed",
  estimate_sent: "Estimate sent",
  estimate_email_resent: "Estimate email resent",
  estimate_approved: "Estimate approved",
  estimate_declined: "Estimate declined",
  estimate_cancelled: "Estimate cancelled",
  estimate_converted: "Estimate converted",
};

export function formatEstimateActivityLabel(
  activity: EstimateActivity,
): string {
  return (
    ACTIVITY_TYPE_LABELS[activity.eventType] ??
    activity.eventType.replace(/_/g, " ")
  );
}

export function formatEstimateActivityDetails(
  activity: EstimateActivity,
): string | null {
  const { metadata, eventType } = activity;

  switch (eventType) {
    case "estimate_created":
      if (metadata.creation_source === "field") {
        const parts = ["Created from field"];
        if (metadata.estimate_number) {
          parts.push(`Estimate ${metadata.estimate_number}`);
        }
        return parts.join(" · ");
      }
      return metadata.estimate_number
        ? `Estimate ${metadata.estimate_number}`
        : null;

    case "estimate_converted":
      if (metadata.invoice_number) {
        return `Converted to invoice ${metadata.invoice_number}`;
      }
      if (metadata.job_number) {
        return `Converted to job ${metadata.job_number}`;
      }
      return metadata.job_id ? "Linked to job" : null;

    case "estimate_email_resent":
      return metadata.estimate_number
        ? `Email resent to customer · Estimate ${metadata.estimate_number}`
        : "Email resent to customer";

    case "estimate_sent":
    case "estimate_approved":
    case "estimate_declined":
    case "estimate_cancelled":
    case "status_changed": {
      if (
        eventType === "estimate_approved" &&
        metadata.approval_source === "public_link"
      ) {
        const parts: string[] = ["Approved by customer"];
        if (metadata.signer_name) {
          parts.push(metadata.signer_name);
        }
        if (metadata.estimate_number) {
          parts.push(`Estimate ${metadata.estimate_number}`);
        }
        if (metadata.from_status && metadata.to_status) {
          parts.push(
            `${formatEstimateStatus(metadata.from_status)} → ${formatEstimateStatus(metadata.to_status)}`,
          );
        }
        return parts.join(" · ");
      }

      if (eventType === "estimate_sent") {
        const statusLine =
          metadata.from_status && metadata.to_status
            ? `${formatEstimateStatus(metadata.from_status)} → ${formatEstimateStatus(metadata.to_status)}`
            : null;
        const parts: string[] = ["Email sent to customer"];
        if (metadata.estimate_number) {
          parts.push(`Estimate ${metadata.estimate_number}`);
        }
        if (statusLine) {
          parts.push(statusLine);
        }
        return parts.join(" · ");
      }

      if (metadata.from_status && metadata.to_status) {
        return `${formatEstimateStatus(metadata.from_status)} → ${formatEstimateStatus(metadata.to_status)}`;
      }
      if (metadata.to_status) {
        return formatEstimateStatus(metadata.to_status);
      }
      return null;
    }

    default:
      return null;
  }
}

export function formatEstimateActivityAttribution(
  activity: EstimateActivity,
): string | null {
  if (activity.actorName) {
    return `by ${activity.actorName}`;
  }

  if (
    activity.eventType === "estimate_approved" &&
    activity.metadata.approval_source === "public_link" &&
    activity.metadata.signer_name
  ) {
    return `by ${activity.metadata.signer_name}`;
  }

  return null;
}

export function formatEstimateActivityTimestamp(
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
