import { formatInvoiceStatus, type InvoiceStatus } from "@/shared/types/invoice";
import {
  formatPaymentMethod,
  type PaymentMethod,
} from "@/shared/types/invoice-payment";

export type InvoiceActivityType =
  | "invoice_created"
  | "invoice_sent"
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
  status_changed: "Status changed",
  invoice_converted_from_estimate: "Converted from estimate",
  invoice_voided: "Invoice voided",
  invoice_cancelled: "Invoice cancelled",
  invoice_updated: "Invoice updated",
  payment_recorded: "Payment recorded",
  invoice_paid: "Invoice paid",
};

export function formatInvoiceActivityLabel(activity: InvoiceActivity): string {
  return ACTIVITY_TYPE_LABELS[activity.eventType];
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

    case "invoice_sent":
    case "invoice_voided":
    case "invoice_cancelled":
    case "status_changed": {
      if (metadata.from_status && metadata.to_status) {
        return `${formatInvoiceStatus(metadata.from_status)} → ${formatInvoiceStatus(metadata.to_status)}`;
      }
      if (metadata.to_status) {
        return formatInvoiceStatus(metadata.to_status);
      }
      return null;
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
      if (typeof metadata.amount === "number") {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(metadata.amount);
      }
      if (metadata.invoice_number) {
        return `Invoice ${metadata.invoice_number}`;
      }
      if (metadata.from_status && metadata.to_status) {
        return `${formatInvoiceStatus(metadata.from_status)} → ${formatInvoiceStatus(metadata.to_status)}`;
      }
      return null;
    }

    default:
      return null;
  }
}

export function formatInvoiceActivityTimestamp(isoDate: string): string {
  const date = new Date(isoDate);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
