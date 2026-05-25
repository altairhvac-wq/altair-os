import {
  recordInvoiceActivity,
  resolveInvoiceStatusEventType,
} from "@/lib/database/queries/invoice-activities";
import type { InvoiceStatus } from "@/shared/types/invoice";
import type { PaymentMethod } from "@/shared/types/invoice-payment";

export async function recordInvoiceCreatedActivity(input: {
  companyId: string;
  invoiceId: string;
  actorId: string;
  invoiceNumber: string;
}): Promise<void> {
  const { error } = await recordInvoiceActivity({
    company_id: input.companyId,
    invoice_id: input.invoiceId,
    actor_id: input.actorId,
    event_type: "invoice_created",
    metadata: {
      invoice_number: input.invoiceNumber,
    },
  });

  if (error) {
    console.error("[recordInvoiceCreatedActivity] failed:", {
      invoiceId: input.invoiceId,
      error,
    });
  }
}

export async function recordInvoiceConvertedFromEstimateActivity(input: {
  companyId: string;
  invoiceId: string;
  actorId: string;
  invoiceNumber: string;
  estimateId: string;
  estimateNumber: string;
}): Promise<void> {
  const { error } = await recordInvoiceActivity({
    company_id: input.companyId,
    invoice_id: input.invoiceId,
    actor_id: input.actorId,
    event_type: "invoice_converted_from_estimate",
    metadata: {
      invoice_number: input.invoiceNumber,
      estimate_id: input.estimateId,
      estimate_number: input.estimateNumber,
    },
  });

  if (error) {
    console.error("[recordInvoiceConvertedFromEstimateActivity] failed:", {
      invoiceId: input.invoiceId,
      estimateId: input.estimateId,
      error,
    });
  }
}

export async function recordInvoiceStatusChangedActivity(input: {
  companyId: string;
  invoiceId: string;
  actorId: string;
  fromStatus: InvoiceStatus;
  toStatus: InvoiceStatus;
}): Promise<void> {
  const { error } = await recordInvoiceActivity({
    company_id: input.companyId,
    invoice_id: input.invoiceId,
    actor_id: input.actorId,
    event_type: resolveInvoiceStatusEventType(input.toStatus),
    metadata: {
      from_status: input.fromStatus,
      to_status: input.toStatus,
    },
  });

  if (error) {
    console.error("[recordInvoiceStatusChangedActivity] failed:", {
      invoiceId: input.invoiceId,
      toStatus: input.toStatus,
      error,
    });
  }
}

export async function recordInvoicePaymentActivity(input: {
  companyId: string;
  invoiceId: string;
  actorId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  fromStatus: InvoiceStatus;
  toStatus: InvoiceStatus;
}): Promise<void> {
  const { error } = await recordInvoiceActivity({
    company_id: input.companyId,
    invoice_id: input.invoiceId,
    actor_id: input.actorId,
    event_type: "payment_recorded",
    metadata: {
      amount: input.amount,
      payment_method: input.paymentMethod,
      reference: input.reference,
      from_status: input.fromStatus,
      to_status: input.toStatus,
    },
  });

  if (error) {
    console.error("[recordInvoicePaymentActivity] failed:", {
      invoiceId: input.invoiceId,
      amount: input.amount,
      error,
    });
  }
}
