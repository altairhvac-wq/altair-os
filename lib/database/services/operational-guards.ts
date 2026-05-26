export type OperationalEventName =
  | "job_assigned"
  | "work_completed"
  | "expense_submitted"
  | "expense_rejected"
  | "invoice_paid"
  | "estimate_approved"
  | "job_material_added";

export type OperationalAutomationEvent =
  | {
      type: "job_assigned";
      companyId: string;
      jobId: string;
      actorId: string;
      technicianId: string;
      jobNumber?: string;
      customerId?: string;
      technicianName?: string;
    }
  | {
      type: "work_completed";
      companyId: string;
      jobId: string;
      actorId: string;
      jobNumber?: string;
      customerId?: string;
    }
  | {
      type: "expense_submitted";
      companyId: string;
      actorId: string;
      expenseId: string;
      expenseNumber?: string;
      merchant: string;
      amount?: number;
      technicianName?: string;
      jobId?: string;
    }
  | {
      type: "expense_rejected";
      companyId: string;
      technicianId: string;
      actorId: string;
      expenseId: string;
      expenseNumber?: string;
      merchant: string;
      amount?: number;
      rejectionReason?: string;
    }
  | {
      type: "invoice_paid";
      companyId: string;
      actorId: string;
      invoiceId: string;
      invoiceNumber?: string;
      amount?: number;
      customerId?: string;
      jobId?: string;
    }
  | {
      type: "estimate_approved";
      companyId: string;
      actorId: string;
      estimateId: string;
      estimateNumber?: string;
      customerId?: string;
      jobId?: string;
    }
  | {
      type: "job_material_added";
      companyId: string;
      jobId: string;
      actorId: string;
      customerId?: string;
      jobNumber?: string;
    };

const NON_EMPTY_ID = /^\S+$/;

export function isNonEmptyId(value: string | undefined | null): value is string {
  return typeof value === "string" && NON_EMPTY_ID.test(value);
}

export function sanitizeNotificationMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!metadata) {
    return {};
  }

  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) {
      continue;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        cleaned[key] = trimmed;
      }
      continue;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      cleaned[key] = value;
      continue;
    }

    if (typeof value === "boolean") {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

export function isRunnableAutomationEvent(
  event: OperationalAutomationEvent,
): boolean {
  if (!isNonEmptyId(event.companyId)) {
    return false;
  }

  switch (event.type) {
    case "job_assigned":
      return (
        isNonEmptyId(event.jobId) &&
        isNonEmptyId(event.technicianId) &&
        isNonEmptyId(event.actorId)
      );

    case "work_completed":
      return isNonEmptyId(event.jobId) && isNonEmptyId(event.actorId);

    case "expense_submitted":
      return (
        isNonEmptyId(event.expenseId) &&
        isNonEmptyId(event.actorId) &&
        event.merchant.trim().length > 0
      );

    case "expense_rejected":
      return (
        isNonEmptyId(event.expenseId) &&
        isNonEmptyId(event.technicianId) &&
        isNonEmptyId(event.actorId) &&
        event.merchant.trim().length > 0
      );

    case "invoice_paid":
      return isNonEmptyId(event.invoiceId) && isNonEmptyId(event.actorId);

    case "estimate_approved":
      return isNonEmptyId(event.estimateId) && isNonEmptyId(event.actorId);

    case "job_material_added":
      return isNonEmptyId(event.jobId) && isNonEmptyId(event.actorId);
  }
}

export function assertNever(value: never): never {
  throw new Error(`Unhandled operational event: ${JSON.stringify(value)}`);
}
