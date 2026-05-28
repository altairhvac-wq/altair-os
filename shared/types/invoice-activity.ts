import { formatDateTimeInTimeZone } from "@/shared/lib/datetime";
import { formatInvoiceStatus, type InvoiceStatus } from "@/shared/types/invoice";
import {
  formatPaymentMethod,
  type PaymentMethod,
} from "@/shared/types/invoice-payment";

export type InvoiceActivityType =
  | "invoice_created"
  | "invoice_sent"
  | "invoice_email_resent"
  | "status_changed"
  | "invoice_converted_from_estimate"
  | "invoice_voided"
  | "invoice_cancelled"
  | "invoice_updated"
  | "payment_recorded"
  | "invoice_paid";

export type InvoiceActivityMetadata = {
  invoice_id?: string;
  invoice_number?: string;
  from_status?: InvoiceStatus;
  to_status?: InvoiceStatus;
  customer_id?: string;
  estimate_id?: string;
  estimate_number?: string;
  job_id?: string;
  job_number?: string;
  payment_id?: string;
  amount?: number;
  previous_total?: number;
  new_total?: number;
  line_item_count?: number;
  changed_by?: string;
  payment_method?: PaymentMethod;
  reference?: string;
  automated?: boolean;
  source?: "manual" | "automatic";
};

export type InvoiceActivity = {
  id: string;
  invoiceId: string;
  eventType: InvoiceActivityType;
  metadata: InvoiceActivityMetadata;
  actorId?: string;
  actorName?: string;
  createdAt: string;
};

const ACTIVITY_TYPE_LABELS: Record<InvoiceActivityType, string> = {
  invoice_created: "Invoice created",
  invoice_sent: "Invoice sent",
  invoice_email_resent: "Invoice email resent",
  status_changed: "Status changed",
  invoice_converted_from_estimate: "Converted from estimate",
  invoice_voided: "Invoice voided",
  invoice_cancelled: "Invoice cancelled",
  invoice_updated: "Invoice updated",
  payment_recorded: "Payment recorded",
  invoice_paid: "Invoice paid",
};

export function formatInvoiceActivityLabel(activity: InvoiceActivity): string {
  if (
    activity.eventType === "status_changed" &&
    activity.metadata.automated
  ) {
    return "Status changed (automatic)";
  }

  return (
    ACTIVITY_TYPE_LABELS[activity.eventType] ??
    activity.eventType.replace(/_/g, " ")
  );
}

export function formatInvoiceActivityDetails(
  activity: InvoiceActivity,
): string | null {
  const { metadata, eventType } = activity;

  switch (eventType) {
    case "invoice_created":
      return metadata.invoice_number
        ? `Invoice ${metadata.invoice_number}`
        : null;

    case "invoice_converted_from_estimate":
      return metadata.estimate_number
        ? `From estimate ${metadata.estimate_number}`
        : metadata.estimate_id
          ? "Converted from estimate"
          : null;

    case "invoice_updated": {
      const parts: string[] = [];
      if (
        typeof metadata.previous_total === "number" &&
        typeof metadata.new_total === "number"
      ) {
        const formatter = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        });
        parts.push(
          `${formatter.format(metadata.previous_total)} → ${formatter.format(metadata.new_total)}`,
        );
      }
      if (typeof metadata.line_item_count === "number") {
        parts.push(
          `${metadata.line_item_count} line item${metadata.line_item_count === 1 ? "" : "s"}`,
        );
      }
      return parts.length > 0 ? parts.join(" · ") : null;
    }

    case "invoice_email_resent":
      return metadata.invoice_number
        ? `Email resent to customer · Invoice ${metadata.invoice_number}`
        : "Email resent to customer";

    case "invoice_sent":
    case "invoice_voided":
    case "invoice_cancelled":
    case "status_changed": {
      const parts: string[] = [];
      if (eventType === "invoice_sent") {
        parts.push("Email sent to customer");
        if (metadata.invoice_number) {
          parts.push(`Invoice ${metadata.invoice_number}`);
        }
      }
      if (metadata.from_status && metadata.to_status) {
        parts.push(
          `${formatInvoiceStatus(metadata.from_status)} → ${formatInvoiceStatus(metadata.to_status)}`,
        );
      } else if (metadata.to_status) {
        parts.push(formatInvoiceStatus(metadata.to_status));
      }
      if (metadata.automated) {
        parts.push("Overdue sync · automatic");
      }
      return parts.length > 0 ? parts.join(" · ") : null;
    }

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
      if (metadata.from_status && metadata.to_status) {
        parts.push(
          `${formatInvoiceStatus(metadata.from_status)} → ${formatInvoiceStatus(metadata.to_status)}`,
        );
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
      if (metadata.from_status && metadata.to_status) {
        parts.push(
          `${formatInvoiceStatus(metadata.from_status)} → ${formatInvoiceStatus(metadata.to_status)}`,
        );
      }
      return parts.length > 0 ? parts.join(" · ") : null;
    }

    default:
      return null;
  }
}

export function formatInvoiceActivityAttribution(
  activity: InvoiceActivity,
): string | null {
  if (activity.actorName) {
    if (
      activity.eventType === "payment_recorded" ||
      activity.eventType === "invoice_paid"
    ) {
      return `Recorded by ${activity.actorName}`;
    }
    if (activity.metadata.automated && activity.metadata.source === "automatic") {
      return "System · automatic";
    }
    return `by ${activity.actorName}`;
  }

  if (activity.metadata.automated || activity.metadata.source === "automatic") {
    return "System · automatic";
  }

  return null;
}

export function formatInvoiceActivityTimestamp(
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
