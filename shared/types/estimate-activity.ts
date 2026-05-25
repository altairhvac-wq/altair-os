import { formatEstimateStatus, type EstimateStatus } from "@/shared/types/estimate";

export type EstimateActivityType =
  | "estimate_created"
  | "status_changed"
  | "estimate_sent"
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
  estimate_approved: "Estimate approved",
  estimate_declined: "Estimate declined",
  estimate_cancelled: "Estimate cancelled",
  estimate_converted: "Estimate converted",
};

export function formatEstimateActivityLabel(
  activity: EstimateActivity,
): string {
  return ACTIVITY_TYPE_LABELS[activity.eventType];
}

export function formatEstimateActivityDetails(
  activity: EstimateActivity,
): string | null {
  const { metadata, eventType } = activity;

  switch (eventType) {
    case "estimate_created":
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

    case "estimate_sent":
    case "estimate_approved":
    case "estimate_declined":
    case "estimate_cancelled":
    case "status_changed": {
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

export function formatEstimateActivityTimestamp(isoDate: string): string {
  const date = new Date(isoDate);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
