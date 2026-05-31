import { recordExpenseActivity } from "@/lib/database/queries/expense-activities";
import { recordJobActivity } from "@/lib/database/queries/job-activities";
import { recordMembershipActivity } from "@/lib/database/queries/membership-activities";
import { maybeRunOperationalAutomation } from "@/lib/database/services/operational-automation";
import type { OperationalEventName } from "@/lib/database/services/operational-guards";
import { isNonEmptyId } from "@/lib/database/services/operational-guards";
import type {
  CompanyRole,
  Json,
  MembershipActivityType,
  MembershipStatus,
} from "@/lib/database/types/enums";
import type { Expense, ExpenseStatus } from "@/shared/types/expense";
import type { JobMaterial } from "@/shared/types/job-material";
import type { InvoiceStatus } from "@/shared/types/invoice";

/**
 * Lightweight operational event layer.
 *
 * Coordinates activity history and delegates side effects to the internal
 * automation hook. Side-effect failures remain fire-and-forget and never block
 * primary workflows.
 */

export type { OperationalEventName };

function hasOperationalEmitContext(input: {
  companyId: string;
  actorId: string;
}): boolean {
  return isNonEmptyId(input.companyId) && isNonEmptyId(input.actorId);
}

function buildExpenseActivityMetadata(expense: Expense) {
  return {
    expense_id: expense.id,
    expense_number: expense.expenseNumber,
    amount: expense.amount,
    merchant: expense.merchant,
    purchase_date: expense.purchaseDate,
    payment_method: expense.paymentMethod,
    is_reimbursable: expense.isReimbursable,
    job_id: expense.jobId,
    customer_id: expense.customerId,
    category: expense.category,
    status: expense.status,
  };
}

export async function emitExpenseSubmittedEvent(input: {
  companyId: string;
  expenseId: string;
  actorId: string;
  expense: Expense;
  fromStatus: ExpenseStatus;
}): Promise<void> {
  if (!hasOperationalEmitContext(input) || !isNonEmptyId(input.expenseId)) {
    console.warn("[emitExpenseSubmittedEvent] skipped: missing context", {
      expenseId: input.expenseId,
    });
    return;
  }

  const { error } = await recordExpenseActivity({
    company_id: input.companyId,
    expense_id: input.expenseId,
    actor_id: input.actorId,
    event_type: "expense_submitted",
    metadata: {
      ...buildExpenseActivityMetadata(input.expense),
      from_status: input.fromStatus,
      to_status: "submitted",
    },
  });

  if (error) {
    console.error("[emitExpenseSubmittedEvent] activity failed:", {
      expenseId: input.expenseId,
      error,
    });
    return;
  }

  maybeRunOperationalAutomation({
    type: "expense_submitted",
    companyId: input.companyId,
    actorId: input.actorId,
    expenseId: input.expenseId,
    expenseNumber: input.expense.expenseNumber,
    merchant: input.expense.merchant,
    amount: input.expense.amount,
    technicianName: input.expense.technician,
    jobId: input.expense.jobId,
  });
}

export async function emitExpenseRejectedEvent(input: {
  companyId: string;
  expenseId: string;
  actorId: string;
  expense: Expense;
  fromStatus: ExpenseStatus;
  rejectionReason?: string;
}): Promise<void> {
  if (
    !hasOperationalEmitContext(input) ||
    !isNonEmptyId(input.expenseId) ||
    !isNonEmptyId(input.expense.technicianId)
  ) {
    console.warn("[emitExpenseRejectedEvent] skipped: missing context", {
      expenseId: input.expenseId,
      technicianId: input.expense.technicianId,
    });
    return;
  }

  const { error } = await recordExpenseActivity({
    company_id: input.companyId,
    expense_id: input.expenseId,
    actor_id: input.actorId,
    event_type: "expense_rejected",
    metadata: {
      ...buildExpenseActivityMetadata(input.expense),
      from_status: input.fromStatus,
      to_status: "rejected",
      rejection_reason: input.rejectionReason?.trim() || undefined,
    },
  });

  if (error) {
    console.error("[emitExpenseRejectedEvent] activity failed:", {
      expenseId: input.expenseId,
      error,
    });
    return;
  }

  maybeRunOperationalAutomation({
    type: "expense_rejected",
    companyId: input.companyId,
    technicianId: input.expense.technicianId,
    actorId: input.actorId,
    expenseId: input.expenseId,
    expenseNumber: input.expense.expenseNumber,
    merchant: input.expense.merchant,
    amount: input.expense.amount,
    rejectionReason: input.rejectionReason,
  });
}

export async function emitJobAssignedEvent(input: {
  companyId: string;
  jobId: string;
  actorId: string;
  technicianId: string;
  previousTechnicianId?: string | null;
  customerId?: string;
  jobNumber?: string;
  technicianName?: string;
  previousTechnicianName?: string;
}): Promise<void> {
  if (
    !hasOperationalEmitContext(input) ||
    !isNonEmptyId(input.jobId) ||
    !isNonEmptyId(input.technicianId)
  ) {
    console.warn("[emitJobAssignedEvent] skipped: missing context", {
      jobId: input.jobId,
      technicianId: input.technicianId,
    });
    return;
  }

  const { error } = await recordJobActivity({
    company_id: input.companyId,
    job_id: input.jobId,
    actor_id: input.actorId,
    event_type: "technician_assigned",
    metadata: {
      customer_id: input.customerId,
      job_id: input.jobId,
      job_number: input.jobNumber,
      technician_id: input.technicianId,
      technician_name: input.technicianName,
      previous_technician_id: input.previousTechnicianId ?? undefined,
      previous_technician_name: input.previousTechnicianName,
      source: "manual",
    },
  });

  if (error) {
    console.error("[emitJobAssignedEvent] activity failed:", {
      jobId: input.jobId,
      error,
    });
    return;
  }

  maybeRunOperationalAutomation({
    type: "job_assigned",
    companyId: input.companyId,
    technicianId: input.technicianId,
    actorId: input.actorId,
    jobId: input.jobId,
    jobNumber: input.jobNumber,
    customerId: input.customerId,
    technicianName: input.technicianName,
  });
}

export async function emitWorkCompletedEvent(input: {
  companyId: string;
  jobId: string;
  actorId: string;
  customerId?: string;
  jobNumber?: string;
}): Promise<void> {
  // Activity is recorded upstream via recordJobStatusChangedActivity today.

  if (!hasOperationalEmitContext(input) || !isNonEmptyId(input.jobId)) {
    console.warn("[emitWorkCompletedEvent] skipped: missing context", {
      jobId: input.jobId,
    });
    return;
  }

  maybeRunOperationalAutomation({
    type: "work_completed",
    companyId: input.companyId,
    actorId: input.actorId,
    jobId: input.jobId,
    jobNumber: input.jobNumber,
    customerId: input.customerId,
  });
}

export async function emitInvoicePaidEvent(input: {
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
  // Activity is recorded upstream via recordInvoicePaidActivity today.

  if (
    !hasOperationalEmitContext(input) ||
    !isNonEmptyId(input.invoiceId) ||
    !isNonEmptyId(input.paymentId)
  ) {
    console.warn("[emitInvoicePaidEvent] skipped: missing context", {
      invoiceId: input.invoiceId,
    });
    return;
  }

  maybeRunOperationalAutomation({
    type: "invoice_paid",
    companyId: input.companyId,
    actorId: input.actorId,
    invoiceId: input.invoiceId,
    invoiceNumber: input.invoiceNumber,
    amount: input.amount,
    customerId: input.customerId,
    jobId: input.jobId,
  });
}

export async function emitEstimateApprovedEvent(input: {
  companyId: string;
  estimateId: string;
  actorId?: string | null;
  estimateNumber?: string;
  customerId?: string;
  jobId?: string;
  approvalSource?: "public_link" | "technician_device" | "admin_manual";
}): Promise<void> {
  // Activity is recorded upstream via recordEstimateStatusChangedActivity today.

  if (!isNonEmptyId(input.companyId) || !isNonEmptyId(input.estimateId)) {
    console.warn("[emitEstimateApprovedEvent] skipped: missing context", {
      estimateId: input.estimateId,
    });
    return;
  }

  if (
    input.approvalSource !== "public_link" &&
    !isNonEmptyId(input.actorId ?? undefined)
  ) {
    console.warn("[emitEstimateApprovedEvent] skipped: missing actor", {
      estimateId: input.estimateId,
    });
    return;
  }

  maybeRunOperationalAutomation({
    type: "estimate_approved",
    companyId: input.companyId,
    actorId: input.actorId ?? undefined,
    estimateId: input.estimateId,
    estimateNumber: input.estimateNumber,
    customerId: input.customerId,
    jobId: input.jobId,
    approvalSource: input.approvalSource,
  });
}

export async function emitJobMaterialAddedEvent(input: {
  companyId: string;
  jobId: string;
  actorId: string;
  customerId?: string;
  jobNumber?: string;
  material: JobMaterial;
}): Promise<void> {
  if (!hasOperationalEmitContext(input) || !isNonEmptyId(input.jobId)) {
    console.warn("[emitJobMaterialAddedEvent] skipped: missing context", {
      jobId: input.jobId,
    });
    return;
  }

  const { error } = await recordJobActivity({
    company_id: input.companyId,
    job_id: input.jobId,
    actor_id: input.actorId,
    event_type: "job_material_added",
    metadata: {
      customer_id: input.customerId,
      job_id: input.jobId,
      job_number: input.jobNumber,
      material_id: input.material.id,
      service_item_id: input.material.serviceItemId,
      name: input.material.name,
      quantity: input.material.quantity,
      unit_cost: input.material.unitCost,
      unit_price: input.material.unitPrice,
      taxable: input.material.taxable,
    },
  });

  if (error) {
    console.error("[emitJobMaterialAddedEvent] activity failed:", {
      jobId: input.jobId,
      materialId: input.material.id,
      error,
    });
    return;
  }

  maybeRunOperationalAutomation({
    type: "job_material_added",
    companyId: input.companyId,
    jobId: input.jobId,
    actorId: input.actorId,
    customerId: input.customerId,
    jobNumber: input.jobNumber,
  });
}

export type MembershipActivityTarget = {
  membershipId: string;
  userId?: string | null;
  email: string;
  name: string;
  role: CompanyRole;
  status?: MembershipStatus;
};

function buildMembershipTargetMetadata(target: MembershipActivityTarget) {
  return {
    membership_id: target.membershipId,
    target_user_id: target.userId ?? undefined,
    target_email: target.email,
    target_name: target.name,
    role: target.role,
    status: target.status,
  };
}

async function emitMembershipActivityEvent(input: {
  companyId: string;
  membershipId: string;
  actorId: string;
  eventType: MembershipActivityType;
  metadata: Json;
}): Promise<void> {
  if (
    !hasOperationalEmitContext(input) ||
    !isNonEmptyId(input.membershipId)
  ) {
    console.warn(`[emitMembershipActivity:${input.eventType}] skipped: missing context`, {
      membershipId: input.membershipId,
    });
    return;
  }

  const { error } = await recordMembershipActivity({
    company_id: input.companyId,
    membership_id: input.membershipId,
    actor_id: input.actorId,
    event_type: input.eventType,
    metadata: input.metadata,
  });

  if (error) {
    console.error(`[emitMembershipActivity:${input.eventType}] activity failed:`, {
      membershipId: input.membershipId,
      error,
    });
  }
}

export async function emitTeamInviteCreatedEvent(input: {
  companyId: string;
  actorId: string;
  target: MembershipActivityTarget;
  inviteEmail: string;
}): Promise<void> {
  await emitMembershipActivityEvent({
    companyId: input.companyId,
    membershipId: input.target.membershipId,
    actorId: input.actorId,
    eventType: "team_invite_created",
    metadata: {
      ...buildMembershipTargetMetadata(input.target),
      invite_email: input.inviteEmail,
      to_status: "invited",
      to_role: input.target.role,
    },
  });
}

export async function emitInviteAcceptedEvent(input: {
  companyId: string;
  actorId: string;
  target: MembershipActivityTarget;
  inviteEmail: string;
}): Promise<void> {
  await emitMembershipActivityEvent({
    companyId: input.companyId,
    membershipId: input.target.membershipId,
    actorId: input.actorId,
    eventType: "invite_accepted",
    metadata: {
      ...buildMembershipTargetMetadata(input.target),
      invite_email: input.inviteEmail,
      from_status: "invited",
      to_status: "active",
      to_role: input.target.role,
    },
  });
}

export async function emitMemberRoleChangedEvent(input: {
  companyId: string;
  actorId: string;
  target: MembershipActivityTarget;
  fromRole: CompanyRole;
  toRole: CompanyRole;
}): Promise<void> {
  await emitMembershipActivityEvent({
    companyId: input.companyId,
    membershipId: input.target.membershipId,
    actorId: input.actorId,
    eventType: "member_role_changed",
    metadata: {
      ...buildMembershipTargetMetadata(input.target),
      from_role: input.fromRole,
      to_role: input.toRole,
    },
  });
}

export async function emitMemberSuspendedEvent(input: {
  companyId: string;
  actorId: string;
  target: MembershipActivityTarget;
  fromStatus: MembershipStatus;
}): Promise<void> {
  await emitMembershipActivityEvent({
    companyId: input.companyId,
    membershipId: input.target.membershipId,
    actorId: input.actorId,
    eventType: "member_suspended",
    metadata: {
      ...buildMembershipTargetMetadata(input.target),
      from_status: input.fromStatus,
      to_status: "suspended",
    },
  });
}

export async function emitMemberReactivatedEvent(input: {
  companyId: string;
  actorId: string;
  target: MembershipActivityTarget;
  fromStatus: MembershipStatus;
}): Promise<void> {
  await emitMembershipActivityEvent({
    companyId: input.companyId,
    membershipId: input.target.membershipId,
    actorId: input.actorId,
    eventType: "member_reactivated",
    metadata: {
      ...buildMembershipTargetMetadata(input.target),
      from_status: input.fromStatus,
      to_status: "active",
    },
  });
}

export async function emitCompanySwitchedEvent(input: {
  companyId: string;
  actorId: string;
  membershipId: string;
  previousCompanyId?: string | null;
}): Promise<void> {
  await emitMembershipActivityEvent({
    companyId: input.companyId,
    membershipId: input.membershipId,
    actorId: input.actorId,
    eventType: "company_switched",
    metadata: {
      membership_id: input.membershipId,
      target_user_id: input.actorId,
      to_company_id: input.companyId,
      from_company_id: input.previousCompanyId ?? undefined,
    },
  });
}
