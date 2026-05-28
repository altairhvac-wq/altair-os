"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  createCustomerEquipment,
  getCustomerEquipmentById,
  listCustomerEquipment,
  setCustomerEquipmentActive,
  updateCustomerEquipment,
} from "@/lib/database/queries/customer-equipment";
import { getJobById, listAssignedJobs } from "@/lib/database/queries/jobs";
import {
  recordEquipmentAddedActivity,
  recordEquipmentUpdatedActivity,
  recordWarrantyExpirationRecordedActivity,
} from "@/lib/database/services/customer-equipment-activity";
import type {
  CustomerEquipment,
  CustomerEquipmentFormData,
} from "@/shared/types/customer-equipment";

export type CustomerEquipmentActionResult = {
  error?: string;
  equipment?: CustomerEquipment;
};

export type CustomerEquipmentListActionResult = {
  error?: string;
  equipment?: CustomerEquipment[];
};

function revalidateEquipmentPaths(customerId: string, jobId?: string | null) {
  revalidatePath(`/customers/${customerId}`);
  if (jobId) {
    revalidatePath(`/jobs/${jobId}`);
  }
  revalidatePath("/technician");
}

function getChangedFields(
  previous: CustomerEquipment,
  next: CustomerEquipment,
): string[] {
  const fields: string[] = [];
  const checks: [string, unknown, unknown][] = [
    ["name", previous.name, next.name],
    ["type", previous.equipmentType, next.equipmentType],
    ["brand", previous.brand, next.brand],
    ["model", previous.modelNumber, next.modelNumber],
    ["serial", previous.serialNumber, next.serialNumber],
    ["install date", previous.installDate, next.installDate],
    ["warranty expiration", previous.warrantyExpiresAt, next.warrantyExpiresAt],
    ["location", previous.location, next.location],
    ["notes", previous.notes, next.notes],
    ["status", previous.isActive, next.isActive],
  ];

  for (const [label, prevValue, nextValue] of checks) {
    if (prevValue !== nextValue) {
      fields.push(label);
    }
  }

  return fields;
}

async function assertEquipmentWritePermission(input: {
  customerId: string;
  jobId?: string | null;
}): Promise<{ error?: string; jobNumber?: string }> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (context.permissions.manageCustomers) {
    if (input.jobId) {
      const job = await getJobById(context.company.id, input.jobId);
      if (!job) {
        return { error: "Job not found." };
      }
      if (job.customerId !== input.customerId) {
        return { error: "Equipment customer does not match this job." };
      }
      return { jobNumber: job.jobNumber };
    }
    return {};
  }

  if (!context.permissions.viewAssignedJobs) {
    return { error: "You do not have permission to manage equipment." };
  }

  if (!input.jobId) {
    return {
      error: "Technicians can only manage equipment during an assigned job.",
    };
  }

  const job = await getJobById(context.company.id, input.jobId);

  if (!job) {
    return { error: "Job not found." };
  }

  if (job.customerId !== input.customerId) {
    return { error: "Equipment customer does not match this job." };
  }

  if (job.assignedTechnicianId !== context.user.id) {
    return {
      error: "You can only manage equipment on jobs assigned to you.",
    };
  }

  return { jobNumber: job.jobNumber };
}

async function assertCustomerEquipmentReadPermission(
  customerId: string,
): Promise<string | null> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return "No active company workspace.";
  }

  if (context.permissions.manageCustomers) {
    return null;
  }

  if (!context.permissions.viewAssignedJobs) {
    return "You do not have permission to view equipment.";
  }

  const assignedJobs = await listAssignedJobs(
    context.company.id,
    context.user.id,
  );
  const hasAssignedJobForCustomer = assignedJobs.some(
    (job) => job.customerId === customerId,
  );

  if (!hasAssignedJobForCustomer) {
    return "You can only view equipment for customers on your assigned jobs.";
  }

  return null;
}

export async function listCustomerEquipmentAction(
  customerId: string,
  options?: { includeInactive?: boolean },
): Promise<CustomerEquipmentListActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  const readError = await assertCustomerEquipmentReadPermission(customerId);

  if (readError) {
    return { error: readError };
  }

  const equipment = await listCustomerEquipment(
    context.company.id,
    customerId,
    options,
  );

  return { equipment };
}

export async function createCustomerEquipmentAction(
  customerId: string,
  data: CustomerEquipmentFormData,
  jobId?: string | null,
): Promise<CustomerEquipmentActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!data.name.trim()) {
    return { error: "Equipment name is required." };
  }

  const permission = await assertEquipmentWritePermission({ customerId, jobId });

  if (permission.error) {
    return { error: permission.error };
  }

  const { equipment, error } = await createCustomerEquipment(
    context.company.id,
    customerId,
    data,
    jobId,
  );

  if (error || !equipment) {
    return { error: error ?? "Failed to create equipment record." };
  }

  await recordEquipmentAddedActivity({
    companyId: context.company.id,
    customerId,
    actorId: context.user.id,
    equipment,
    jobId: jobId ?? undefined,
    jobNumber: permission.jobNumber,
  });

  revalidateEquipmentPaths(customerId, jobId);
  return { equipment };
}

export async function updateCustomerEquipmentAction(
  equipmentId: string,
  data: CustomerEquipmentFormData,
  jobId?: string | null,
): Promise<CustomerEquipmentActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!data.name.trim()) {
    return { error: "Equipment name is required." };
  }

  const existing = await getCustomerEquipmentById(
    context.company.id,
    equipmentId,
  );

  if (!existing) {
    return { error: "Equipment record not found." };
  }

  const permission = await assertEquipmentWritePermission({
    customerId: existing.customerId,
    jobId: jobId ?? existing.jobId,
  });

  if (permission.error) {
    return { error: permission.error };
  }

  const { equipment, error } = await updateCustomerEquipment(
    context.company.id,
    equipmentId,
    data,
    jobId ?? existing.jobId,
  );

  if (error || !equipment) {
    return { error: error ?? "Failed to update equipment record." };
  }

  const changedFields = getChangedFields(existing, equipment);

  if (changedFields.length > 0) {
    await recordEquipmentUpdatedActivity({
      companyId: context.company.id,
      customerId: existing.customerId,
      actorId: context.user.id,
      equipment,
      changedFields,
      jobId: jobId ?? existing.jobId,
      jobNumber: permission.jobNumber,
    });
  }

  if (
    existing.warrantyExpiresAt !== equipment.warrantyExpiresAt &&
    equipment.warrantyExpiresAt
  ) {
    await recordWarrantyExpirationRecordedActivity({
      companyId: context.company.id,
      customerId: existing.customerId,
      actorId: context.user.id,
      equipment,
      previousWarrantyExpiresAt: existing.warrantyExpiresAt,
      jobId: jobId ?? existing.jobId,
      jobNumber: permission.jobNumber,
    });
  }

  revalidateEquipmentPaths(existing.customerId, jobId ?? existing.jobId);
  return { equipment };
}

export async function setCustomerEquipmentActiveAction(
  equipmentId: string,
  isActive: boolean,
): Promise<CustomerEquipmentActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.manageCustomers) {
    return { error: "You do not have permission to manage equipment." };
  }

  const existing = await getCustomerEquipmentById(
    context.company.id,
    equipmentId,
  );

  if (!existing) {
    return { error: "Equipment record not found." };
  }

  const { equipment, error } = await setCustomerEquipmentActive(
    context.company.id,
    equipmentId,
    isActive,
  );

  if (error || !equipment) {
    return { error: error ?? "Failed to update equipment status." };
  }

  if (existing.isActive !== equipment.isActive) {
    await recordEquipmentUpdatedActivity({
      companyId: context.company.id,
      customerId: existing.customerId,
      actorId: context.user.id,
      equipment,
      changedFields: ["status"],
    });
  }

  revalidateEquipmentPaths(existing.customerId, existing.jobId);
  return { equipment };
}
