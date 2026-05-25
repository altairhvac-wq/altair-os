import { formatEstimateStatus } from "@/shared/types/estimate";
import { formatInvoiceStatus } from "@/shared/types/invoice";
import {
  formatPaymentMethod,
  type PaymentMethod,
} from "@/shared/types/invoice-payment";
import { formatJobStatus, type JobStatus } from "@/shared/types/job";
import type { CustomerStatus } from "@/shared/types/customer";

export type OperationalActivitySource =
  | "customer"
  | "job"
  | "estimate"
  | "invoice"
  | "expense";

export type OperationalActivityEventType =
  | "customer_created"
  | "equipment_added"
  | "equipment_updated"
  | "warranty_expiration_recorded"
  | "job_created"
  | "job_status_changed"
  | "technician_assigned"
  | "estimate_created"
  | "estimate_approved"
  | "estimate_converted_to_invoice"
  | "invoice_created"
  | "invoice_sent"
  | "payment_recorded"
  | "invoice_paid"
  | "job_attachment_uploaded"
  | "expense_receipt_uploaded"
  | "status_changed";

export type OperationalActivityMetadata = {
  customer_id?: string;
  customer_name?: string;
  status?: CustomerStatus;
  job_id?: string;
  job_number?: string;
  estimate_id?: string;
  estimate_number?: string;
  invoice_id?: string;
  invoice_number?: string;
  payment_id?: string;
  from_status?: string;
  to_status?: string;
  action_id?: string;
  technician_id?: string;
  technician_name?: string;
  previous_technician_id?: string;
  previous_technician_name?: string;
  completion_notes?: string;
  follow_up_notes?: string;
  equipment_id?: string;
  equipment_name?: string;
  changed_fields?: string[];
  warranty_expires_at?: string;
  previous_warranty_expires_at?: string;
  amount?: number;
  payment_method?: PaymentMethod;
  reference?: string;
  attachment_type?: string;
  file_name?: string;
  expense_id?: string;
  expense_number?: string;
  merchant?: string;
  purchase_date?: string;
  category?: string;
};

export type OperationalActivity = {
  id: string;
  source: OperationalActivitySource;
  eventType: OperationalActivityEventType;
  rawEventType: string;
  metadata: OperationalActivityMetadata;
  actorId?: string;
  actorName?: string;
  createdAt: string;
  customerId?: string;
  jobId?: string;
  estimateId?: string;
  invoiceId?: string;
  paymentId?: string;
  expenseId?: string;
};

const JOB_STATUS_CHANGE_EVENTS = new Set([
  "start_route",
  "start_work",
  "complete_job",
  "technician_arrived",
  "work_started",
  "work_completed",
  "status_changed",
  "job_cancelled",
]);

const ACTIVITY_TYPE_LABELS: Record<OperationalActivityEventType, string> = {
  customer_created: "Customer created",
  equipment_added: "Equipment added",
  equipment_updated: "Equipment updated",
  warranty_expiration_recorded: "Warranty recorded",
  job_created: "Job created",
  job_status_changed: "Job status changed",
  technician_assigned: "Technician assigned",
  estimate_created: "Estimate created",
  estimate_approved: "Estimate approved",
  estimate_converted_to_invoice: "Estimate converted to invoice",
  invoice_created: "Invoice created",
  invoice_sent: "Invoice sent",
  payment_recorded: "Payment recorded",
  invoice_paid: "Invoice paid",
  job_attachment_uploaded: "Attachment uploaded",
  expense_receipt_uploaded: "Receipt uploaded",
  status_changed: "Status changed",
};

export function normalizeOperationalEventType(
  source: OperationalActivitySource,
  rawEventType: string,
): OperationalActivityEventType {
  if (source === "job" && JOB_STATUS_CHANGE_EVENTS.has(rawEventType)) {
    return "job_status_changed";
  }

  if (
    rawEventType === "estimate_converted" ||
    rawEventType === "invoice_converted_from_estimate"
  ) {
    return "estimate_converted_to_invoice";
  }

  if (rawEventType in ACTIVITY_TYPE_LABELS) {
    return rawEventType as OperationalActivityEventType;
  }

  return "status_changed";
}

export function formatOperationalActivityLabel(
  activity: OperationalActivity,
): string {
  return ACTIVITY_TYPE_LABELS[activity.eventType];
}

function formatStatusTransition(
  fromStatus: string | undefined,
  toStatus: string | undefined,
): string | null {
  if (fromStatus && toStatus) {
    return `${formatGenericStatus(fromStatus)} → ${formatGenericStatus(toStatus)}`;
  }

  if (toStatus) {
    return formatGenericStatus(toStatus);
  }

  return null;
}

function formatGenericStatus(status: string): string {
  const jobStatuses: JobStatus[] = [
    "scheduled",
    "dispatched",
    "arrived",
    "in_progress",
    "completed",
    "cancelled",
  ];

  if (jobStatuses.includes(status as JobStatus)) {
    return formatJobStatus(status as JobStatus);
  }

  const estimateStatuses = [
    "draft",
    "sent",
    "approved",
    "declined",
    "converted",
    "cancelled",
  ];
  if (estimateStatuses.includes(status)) {
    return formatEstimateStatus(
      status as Parameters<typeof formatEstimateStatus>[0],
    );
  }

  const invoiceStatuses = [
    "draft",
    "sent",
    "partially_paid",
    "paid",
    "overdue",
    "void",
    "cancelled",
  ];
  if (invoiceStatuses.includes(status)) {
    return formatInvoiceStatus(
      status as Parameters<typeof formatInvoiceStatus>[0],
    );
  }

  return status.replace(/_/g, " ");
}

export function formatOperationalActivityDetails(
  activity: OperationalActivity,
): string | null {
  const { metadata, eventType } = activity;

  switch (eventType) {
    case "customer_created":
      return metadata.customer_name ?? null;

    case "equipment_added":
    case "equipment_updated":
      if (metadata.equipment_name && metadata.job_number) {
        return `${metadata.equipment_name} · Job ${metadata.job_number}`;
      }
      if (metadata.changed_fields?.length) {
        return `${metadata.equipment_name ?? "Equipment"} · ${metadata.changed_fields.join(", ")}`;
      }
      return metadata.equipment_name ?? null;

    case "warranty_expiration_recorded":
      if (metadata.equipment_name && metadata.warranty_expires_at) {
        return `${metadata.equipment_name} · expires ${metadata.warranty_expires_at}`;
      }
      return metadata.equipment_name ?? null;

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

    case "estimate_created":
      return metadata.estimate_number
        ? `Estimate ${metadata.estimate_number}`
        : null;

    case "estimate_converted_to_invoice":
      if (metadata.invoice_number && metadata.estimate_number) {
        return `Estimate ${metadata.estimate_number} → Invoice ${metadata.invoice_number}`;
      }
      if (metadata.invoice_number) {
        return `Invoice ${metadata.invoice_number}`;
      }
      if (metadata.estimate_number) {
        return `Estimate ${metadata.estimate_number}`;
      }
      return null;

    case "invoice_created":
      return metadata.invoice_number
        ? `Invoice ${metadata.invoice_number}`
        : null;

    case "payment_recorded": {
      const parts: string[] = [];
      if (typeof metadata.amount === "number") {
        parts.push(
          new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(metadata.amount),
        );
      }
      if (metadata.payment_method) {
        parts.push(`via ${formatPaymentMethod(metadata.payment_method)}`);
      }
      if (metadata.reference?.trim()) {
        parts.push(`Ref ${metadata.reference.trim()}`);
      }
      const statusLine = formatStatusTransition(
        metadata.from_status,
        metadata.to_status,
      );
      if (statusLine) {
        parts.push(statusLine);
      }
      return parts.length > 0 ? parts.join(" · ") : null;
    }

    case "invoice_paid":
      if (typeof metadata.amount === "number") {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(metadata.amount);
      }
      if (metadata.invoice_number) {
        return `Invoice ${metadata.invoice_number}`;
      }
      return formatStatusTransition(metadata.from_status, metadata.to_status);

    case "job_status_changed": {
      const statusLine = formatStatusTransition(
        metadata.from_status,
        metadata.to_status,
      );
      const parts: string[] = [];
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
      if (metadata.job_number) {
        parts.push(`Job ${metadata.job_number}`);
      }
      return parts.length > 0 ? parts.join(" · ") : null;
    }

    case "expense_receipt_uploaded": {
      const parts: string[] = [];
      if (metadata.merchant?.trim()) {
        parts.push(metadata.merchant.trim());
      }
      if (typeof metadata.amount === "number") {
        parts.push(
          new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(metadata.amount),
        );
      }
      if (metadata.file_name) {
        parts.push(metadata.file_name);
      }
      if (metadata.expense_number) {
        parts.push(metadata.expense_number);
      }
      return parts.length > 0 ? parts.join(" · ") : null;
    }

    case "estimate_approved":
    case "invoice_sent":
    case "status_changed":
      return formatStatusTransition(metadata.from_status, metadata.to_status);

    default:
      return null;
  }
}

export function formatOperationalActivityTimestamp(isoDate: string): string {
  const date = new Date(isoDate);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
