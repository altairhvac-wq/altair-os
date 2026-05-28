import {
  recordInvoiceActivity,
  resolveInvoiceStatusEventType,
} from "@/lib/database/queries/invoice-activities";
import { emitInvoicePaidEvent } from "@/lib/database/services/operational-events";
import type { InvoiceStatus } from "@/shared/types/invoice";
import type { PaymentMethod } from "@/shared/types/invoice-payment";

type InvoiceActivityContext = {
  customerId?: string;
  jobId?: string;
  jobNumber?: string;
};

export async function recordInvoiceCreatedActivity(input: {
  companyId: string;
  invoiceId: string;
  actorId: string;
  invoiceNumber: string;
  customerId?: string;
  jobId?: string;
  jobNumber?: string;
}): Promise<void> {
  const { error } = await recordInvoiceActivity({
    company_id: input.companyId,
    invoice_id: input.invoiceId,
    actor_id: input.actorId,
    event_type: "invoice_created",
    metadata: {
      invoice_number: input.invoiceNumber,
      customer_id: input.customerId,
      job_id: input.jobId,
      job_number: input.jobNumber,
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
  customerId?: string;
  jobId?: string;
  jobNumber?: string;
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
      customer_id: input.customerId,
      job_id: input.jobId,
      job_number: input.jobNumber,
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

export async function recordInvoiceUpdatedActivity(input: {
  companyId: string;
  invoiceId: string;
  actorId: string;
  previousTotal: number;
  newTotal: number;
  lineItemCount: number;
  invoiceNumber?: string;
  customerId?: string;
  jobId?: string;
  jobNumber?: string;
}): Promise<void> {
  const { error } = await recordInvoiceActivity({
    company_id: input.companyId,
    invoice_id: input.invoiceId,
    actor_id: input.actorId,
    event_type: "invoice_updated",
    metadata: {
      invoice_id: input.invoiceId,
      invoice_number: input.invoiceNumber,
      previous_total: input.previousTotal,
      new_total: input.newTotal,
      line_item_count: input.lineItemCount,
      changed_by: input.actorId,
      customer_id: input.customerId,
      job_id: input.jobId,
      job_number: input.jobNumber,
    },
  });

  if (error) {
    console.error("[recordInvoiceUpdatedActivity] failed:", {
      invoiceId: input.invoiceId,
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
  invoiceNumber?: string;
  customerId?: string;
  jobId?: string;
  jobNumber?: string;
}): Promise<void> {
  const { error } = await recordInvoiceActivity({
    company_id: input.companyId,
    invoice_id: input.invoiceId,
    actor_id: input.actorId,
    event_type: resolveInvoiceStatusEventType(input.toStatus),
    metadata: {
      from_status: input.fromStatus,
      to_status: input.toStatus,
      invoice_number: input.invoiceNumber,
      customer_id: input.customerId,
      job_id: input.jobId,
      job_number: input.jobNumber,
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
  paymentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  fromStatus: InvoiceStatus;
  toStatus: InvoiceStatus;
  invoiceNumber?: string;
  customerId?: string;
  jobId?: string;
  jobNumber?: string;
}): Promise<void> {
  const context: InvoiceActivityContext = {
    customerId: input.customerId,
    jobId: input.jobId,
    jobNumber: input.jobNumber,
  };

  const { error } = await recordInvoiceActivity({
    company_id: input.companyId,
    invoice_id: input.invoiceId,
    actor_id: input.actorId,
    event_type: "payment_recorded",
    metadata: {
      payment_id: input.paymentId,
      amount: input.amount,
      payment_method: input.paymentMethod,
      reference: input.reference,
      from_status: input.fromStatus,
      to_status: input.toStatus,
      invoice_number: input.invoiceNumber,
      invoice_id: input.invoiceId,
      ...context,
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

export async function recordInvoicePaidActivity(input: {
  companyId: string;
  invoiceId: string;
  actorId: string;
  paymentId: string;
  amount: number;
  fromStatus: InvoiceStatus;
  invoiceNumber?: string;
  customerId?: string;
  jobId?: string;
  jobNumber?: string;
}): Promise<void> {
  const { error } = await recordInvoiceActivity({
    company_id: input.companyId,
    invoice_id: input.invoiceId,
    actor_id: input.actorId,
    event_type: "invoice_paid",
    metadata: {
      payment_id: input.paymentId,
      amount: input.amount,
      from_status: input.fromStatus,
      to_status: "paid",
      invoice_number: input.invoiceNumber,
      invoice_id: input.invoiceId,
      customer_id: input.customerId,
      job_id: input.jobId,
      job_number: input.jobNumber,
    },
  });

  if (error) {
    console.error("[recordInvoicePaidActivity] failed:", {
      invoiceId: input.invoiceId,
      error,
    });
    return;
  }

  await emitInvoicePaidEvent({
    companyId: input.companyId,
    invoiceId: input.invoiceId,
    actorId: input.actorId,
    paymentId: input.paymentId,
    amount: input.amount,
    fromStatus: input.fromStatus,
    invoiceNumber: input.invoiceNumber,
    customerId: input.customerId,
    jobId: input.jobId,
    jobNumber: input.jobNumber,
  });
}

export async function recordInvoiceEmailResentActivity(input: {
  companyId: string;
  invoiceId: string;
  actorId: string;
  invoiceNumber: string;
  customerId?: string;
  jobId?: string;
  jobNumber?: string;
}): Promise<void> {
  const { error } = await recordInvoiceActivity({
    company_id: input.companyId,
    invoice_id: input.invoiceId,
    actor_id: input.actorId,
    event_type: "invoice_email_resent",
    metadata: {
      invoice_number: input.invoiceNumber,
      customer_id: input.customerId,
      job_id: input.jobId,
      job_number: input.jobNumber,
    },
  });

  if (error) {
    console.error("[recordInvoiceEmailResentActivity] failed:", {
      invoiceId: input.invoiceId,
      error,
    });
  }
}
