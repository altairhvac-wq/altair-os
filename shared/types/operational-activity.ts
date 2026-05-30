import { formatDateTimeInTimeZone } from "@/shared/lib/datetime";
import { formatEstimateStatus } from "@/shared/types/estimate";
import { formatExpenseStatus } from "@/shared/types/expense";
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
  | "job_status_corrected"
  | "job_reopened"
  | "technician_assigned"
  | "technician_unassigned"
  | "job_labor_auto_closed"
  | "work_completed"
  | "estimate_created"
  | "estimate_sent"
  | "estimate_email_resent"
  | "estimate_approved"
  | "estimate_declined"
  | "estimate_cancelled"
  | "estimate_converted_to_invoice"
  | "invoice_created"
  | "invoice_sent"
  | "invoice_email_resent"
  | "invoice_voided"
  | "invoice_updated"
  | "invoice_cancelled"
  | "payment_recorded"
  | "invoice_paid"
  | "job_attachment_uploaded"
  | "job_material_added"
  | "expense_receipt_uploaded"
  | "expense_created"
  | "expense_submitted"
  | "expense_approved"
  | "expense_rejected"
  | "expense_reimbursed"
  | "status_changed"
  | "invoice_created_for_completed_job"
  | "invoice_auto_created_from_completion"
  | "labor_entries_closed"
  | "pending_expenses_resolved"
  | "material_costs_completed";

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
  source?: "manual" | "automatic";
  automated?: boolean;
  closed_reason?: "completed" | "cancelled";
  entries_closed_count?: number;
  dispatch_reactivated?: boolean;
  technician_id?: string;
  technician_name?: string;
  actor_name?: string;
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
  material_id?: string;
  service_item_id?: string;
  name?: string;
  quantity?: number;
  unit_cost?: number;
  unit_price?: number;
  taxable?: boolean;
  expense_id?: string;
  expense_number?: string;
  merchant?: string;
  purchase_date?: string;
  category?: string;
  rejection_reason?: string;
  is_reimbursable?: boolean;
  review_blocker?: string;
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
  job_status_corrected: "Status corrected",
  job_reopened: "Job reopened",
  technician_assigned: "Technician assigned",
  technician_unassigned: "Technician unassigned",
  job_labor_auto_closed: "Labor auto-closed",
  work_completed: "Work completed",
  estimate_created: "Estimate created",
  estimate_sent: "Estimate sent",
  estimate_email_resent: "Estimate email resent",
  estimate_approved: "Estimate approved",
  estimate_declined: "Estimate declined",
  estimate_cancelled: "Estimate cancelled",
  estimate_converted_to_invoice: "Estimate converted to invoice",
  invoice_created: "Invoice created",
  invoice_sent: "Invoice sent",
  invoice_email_resent: "Invoice email resent",
  invoice_voided: "Invoice voided",
  invoice_updated: "Invoice updated",
  invoice_cancelled: "Invoice cancelled",
  payment_recorded: "Payment recorded",
  invoice_paid: "Invoice paid",
  job_attachment_uploaded: "Attachment uploaded",
  job_material_added: "Material logged",
  expense_receipt_uploaded: "Receipt uploaded",
  expense_created: "Expense created",
  expense_submitted: "Expense submitted",
  expense_approved: "Expense approved",
  expense_rejected: "Expense rejected",
  expense_reimbursed: "Expense reimbursed",
  status_changed: "Status changed",
  invoice_created_for_completed_job:
    "Invoice created (office review complete)",
  invoice_auto_created_from_completion:
    "Draft invoice auto-created after completion",
  labor_entries_closed: "Labor entries closed (office review complete)",
  pending_expenses_resolved:
    "Pending expenses resolved (office review complete)",
  material_costs_completed:
    "Material costs completed (office review complete)",
};

export function normalizeOperationalEventType(
  source: OperationalActivitySource,
  rawEventType: string,
  metadata?: OperationalActivityMetadata,
): OperationalActivityEventType {
  if (source === "job" && rawEventType === "status_changed") {
    if (metadata?.action_id === "status_correction") {
      return "job_status_corrected";
    }
    if (metadata?.action_id === "reopen") {
      return "job_reopened";
    }
  }

  if (source === "job" && rawEventType === "work_completed") {
    return "work_completed";
  }

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
  if (
    activity.eventType === "status_changed" &&
    activity.metadata.automated
  ) {
    return "Status changed (automatic)";
  }

  return ACTIVITY_TYPE_LABELS[activity.eventType];
}

export function formatOperationalActivityAttribution(
  activity: OperationalActivity,
): string | null {
  if (activity.actorName) {
    if (activity.metadata.automated && activity.metadata.source === "automatic") {
      return `Triggered by ${activity.actorName} · automatic cleanup`;
    }
    return `by ${activity.actorName}`;
  }

  if (activity.metadata.automated || activity.metadata.source === "automatic") {
    return "System · automatic";
  }

  return null;
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

function formatExpenseActivityDetails(
  metadata: OperationalActivityMetadata,
): string | null {
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

  if (metadata.expense_number) {
    parts.push(metadata.expense_number);
  }

  const statusLine = formatStatusTransition(
    metadata.from_status,
    metadata.to_status,
  );

  if (statusLine) {
    parts.push(statusLine);
  }

  if (metadata.rejection_reason?.trim()) {
    parts.push(metadata.rejection_reason.trim());
  }

  return parts.length > 0 ? parts.join(" · ") : null;
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

  const expenseStatuses = [
    "draft",
    "submitted",
    "approved",
    "rejected",
    "reimbursed",
  ];
  if (expenseStatuses.includes(status)) {
    return formatExpenseStatus(
      status as Parameters<typeof formatExpenseStatus>[0],
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

    case "technician_unassigned":
      if (metadata.technician_name) {
        return `Removed ${metadata.technician_name} from dispatch`;
      }
      return "Removed technician from dispatch";

    case "job_status_corrected": {
      const transition = formatStatusTransition(
        metadata.from_status,
        metadata.to_status,
      );
      return transition
        ? `Manual correction · ${transition}`
        : "Manual correction";
    }

    case "job_reopened": {
      const transition = formatStatusTransition(
        metadata.from_status,
        metadata.to_status,
      );
      const parts: string[] = [];
      if (transition) {
        parts.push(transition);
      }
      if (metadata.dispatch_reactivated && metadata.technician_name) {
        parts.push(`Dispatch reactivated for ${metadata.technician_name}`);
      }
      return parts.length > 0 ? parts.join(" · ") : null;
    }

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

    case "estimate_created":
      return metadata.estimate_number
        ? `Estimate ${metadata.estimate_number}`
        : null;

    case "estimate_sent":
      return metadata.estimate_number
        ? `Email sent to customer · Estimate ${metadata.estimate_number}`
        : formatStatusTransition(metadata.from_status, metadata.to_status) ??
            "Email sent to customer";

    case "estimate_email_resent":
      return metadata.estimate_number
        ? `Email resent to customer · Estimate ${metadata.estimate_number}`
        : "Email resent to customer";

    case "estimate_declined":
    case "estimate_cancelled":
      return metadata.estimate_number
        ? `Estimate ${metadata.estimate_number}`
        : formatStatusTransition(metadata.from_status, metadata.to_status);

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

    case "invoice_sent":
      return metadata.invoice_number
        ? `Email sent to customer · Invoice ${metadata.invoice_number}`
        : formatStatusTransition(metadata.from_status, metadata.to_status) ??
            "Email sent to customer";

    case "invoice_email_resent":
      return metadata.invoice_number
        ? `Email resent to customer · Invoice ${metadata.invoice_number}`
        : "Email resent to customer";

    case "invoice_voided":
    case "invoice_cancelled":
    case "invoice_updated":
      return metadata.invoice_number
        ? `Invoice ${metadata.invoice_number}`
        : formatStatusTransition(metadata.from_status, metadata.to_status);

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

    case "invoice_paid": {
      const parts: string[] = ["Paid in full"];
      if (typeof metadata.amount === "number") {
        parts.push(
          new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(metadata.amount),
        );
      }
      if (metadata.invoice_number) {
        parts.push(`Invoice ${metadata.invoice_number}`);
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

    case "job_status_changed":
    case "work_completed": {
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
      return parts.length > 0
        ? `Uploaded · ${parts.join(" · ")}`
        : "Uploaded to job";
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
      if (metadata.job_number) {
        parts.push(`Job ${metadata.job_number}`);
      }
      return parts.length > 0
        ? `Logged on site · ${parts.join(" · ")}`
        : "Logged on site";
    }

    case "expense_receipt_uploaded": {
      const parts: string[] = ["Receipt attached"];
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
      return parts.join(" · ");
    }

    case "expense_created":
    case "expense_submitted":
    case "expense_approved":
    case "expense_rejected":
    case "expense_reimbursed":
      return formatExpenseActivityDetails(metadata);

    case "invoice_created_for_completed_job":
    case "invoice_auto_created_from_completion": {
      const parts: string[] = [];
      if (metadata.invoice_number) {
        parts.push(`Invoice ${metadata.invoice_number}`);
      }
      if (metadata.estimate_number) {
        parts.push(`from estimate ${metadata.estimate_number}`);
      }
      if (metadata.automated) {
        parts.push("automatic");
      }
      return parts.length > 0 ? parts.join(" · ") : "Draft invoice ready for office review";
    }

    case "labor_entries_closed":
    case "pending_expenses_resolved":
    case "material_costs_completed":
      return metadata.job_number ? `Job ${metadata.job_number}` : null;

    case "estimate_approved":
    case "invoice_sent":
    case "status_changed": {
      const parts: string[] = [];
      const statusLine = formatStatusTransition(
        metadata.from_status,
        metadata.to_status,
      );
      if (statusLine) {
        parts.push(statusLine);
      }
      if (metadata.automated) {
        parts.push("Overdue sync · automatic");
      }
      return parts.length > 0 ? parts.join(" · ") : null;
    }

    default:
      return null;
  }
}

export function getOperationalActivityHref(
  activity: OperationalActivity,
  access?: { canViewBilling?: boolean; canManageCustomers?: boolean },
): string | null {
  if (activity.jobId) {
    return `/jobs/${activity.jobId}`;
  }

  if (activity.estimateId) {
    if (access?.canViewBilling === false) {
      return null;
    }
    return `/estimates/${activity.estimateId}`;
  }

  if (activity.invoiceId) {
    if (access?.canViewBilling === false) {
      return null;
    }
    return `/invoices/${activity.invoiceId}`;
  }

  if (activity.expenseId) {
    return `/expenses?selected=${activity.expenseId}`;
  }

  if (activity.customerId) {
    if (access?.canManageCustomers === false) {
      return null;
    }
    return `/customers/${activity.customerId}`;
  }

  return null;
}

export function formatOperationalActivityLabelForAccess(
  activity: OperationalActivity,
  canViewBilling: boolean,
): string {
  return formatOperationalActivityLabel(activity);
}

export function formatOperationalActivityDetailsForAccess(
  activity: OperationalActivity,
  canViewBilling: boolean,
): string | null {
  if (!canViewBilling && activity.eventType === "job_material_added") {
    const { metadata } = activity;
    const parts: string[] = ["Logged on site"];
    if (metadata.name) {
      parts.push(metadata.name);
    }
    if (typeof metadata.quantity === "number") {
      parts.push(`Qty ${metadata.quantity}`);
    }
    if (metadata.job_number) {
      parts.push(`Job ${metadata.job_number}`);
    }
    return parts.join(" · ");
  }

  if (
    !canViewBilling &&
    (activity.eventType === "expense_created" ||
      activity.eventType === "expense_submitted" ||
      activity.eventType === "expense_approved" ||
      activity.eventType === "expense_rejected" ||
      activity.eventType === "expense_reimbursed" ||
      activity.eventType === "expense_receipt_uploaded")
  ) {
    const { metadata } = activity;
    const parts: string[] = [];
    if (metadata.merchant?.trim()) {
      parts.push(metadata.merchant.trim());
    }
    if (metadata.expense_number) {
      parts.push(metadata.expense_number);
    }
    const statusLine = formatStatusTransition(
      metadata.from_status,
      metadata.to_status,
    );
    if (statusLine) {
      parts.push(statusLine);
    }
    if (metadata.rejection_reason?.trim()) {
      parts.push(metadata.rejection_reason.trim());
    }
    if (metadata.file_name && activity.eventType === "expense_receipt_uploaded") {
      parts.push(metadata.file_name);
    }
    return parts.length > 0 ? parts.join(" · ") : "Expense activity";
  }

  return formatOperationalActivityDetails(activity);
}

export function formatOperationalActivityTimestamp(
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
