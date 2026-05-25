import { recordCustomerActivity } from "@/lib/database/queries/customer-activities";
import type { CustomerEquipment } from "@/shared/types/customer-equipment";

type EquipmentActivityContext = {
  companyId: string;
  customerId: string;
  actorId: string;
  equipment: CustomerEquipment;
  jobId?: string;
  jobNumber?: string;
};

export async function recordEquipmentAddedActivity(
  input: EquipmentActivityContext,
): Promise<void> {
  const { error } = await recordCustomerActivity({
    company_id: input.companyId,
    customer_id: input.customerId,
    actor_id: input.actorId,
    event_type: "equipment_added",
    metadata: {
      equipment_id: input.equipment.id,
      equipment_name: input.equipment.name,
      job_id: input.jobId ?? input.equipment.jobId,
      job_number: input.jobNumber,
    },
  });

  if (error) {
    console.error("[recordEquipmentAddedActivity] failed:", {
      equipmentId: input.equipment.id,
      error,
    });
  }

  if (input.equipment.warrantyExpiresAt) {
    await recordWarrantyExpirationRecordedActivity({
      ...input,
      previousWarrantyExpiresAt: undefined,
    });
  }
}

export async function recordEquipmentUpdatedActivity(input: {
  companyId: string;
  customerId: string;
  actorId: string;
  equipment: CustomerEquipment;
  changedFields: string[];
  jobId?: string;
  jobNumber?: string;
}): Promise<void> {
  const { error } = await recordCustomerActivity({
    company_id: input.companyId,
    customer_id: input.customerId,
    actor_id: input.actorId,
    event_type: "equipment_updated",
    metadata: {
      equipment_id: input.equipment.id,
      equipment_name: input.equipment.name,
      job_id: input.jobId ?? input.equipment.jobId,
      job_number: input.jobNumber,
      changed_fields: input.changedFields,
    },
  });

  if (error) {
    console.error("[recordEquipmentUpdatedActivity] failed:", {
      equipmentId: input.equipment.id,
      error,
    });
  }
}

export async function recordWarrantyExpirationRecordedActivity(input: {
  companyId: string;
  customerId: string;
  actorId: string;
  equipment: CustomerEquipment;
  previousWarrantyExpiresAt?: string;
  jobId?: string;
  jobNumber?: string;
}): Promise<void> {
  const { error } = await recordCustomerActivity({
    company_id: input.companyId,
    customer_id: input.customerId,
    actor_id: input.actorId,
    event_type: "warranty_expiration_recorded",
    metadata: {
      equipment_id: input.equipment.id,
      equipment_name: input.equipment.name,
      job_id: input.jobId ?? input.equipment.jobId,
      job_number: input.jobNumber,
      warranty_expires_at: input.equipment.warrantyExpiresAt,
      previous_warranty_expires_at: input.previousWarrantyExpiresAt,
    },
  });

  if (error) {
    console.error("[recordWarrantyExpirationRecordedActivity] failed:", {
      equipmentId: input.equipment.id,
      error,
    });
  }
}
