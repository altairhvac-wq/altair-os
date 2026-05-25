import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  CustomerEquipmentInsert,
  CustomerEquipmentRow,
  CustomerEquipmentUpdate,
} from "@/lib/database/types/core-tables";
import type {
  CustomerEquipment,
  CustomerEquipmentFormData,
} from "@/shared/types/customer-equipment";

function trimOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapCustomerEquipmentRow(row: CustomerEquipmentRow): CustomerEquipment {
  return {
    id: row.id,
    customerId: row.customer_id,
    jobId: row.job_id ?? undefined,
    name: row.name,
    equipmentType: row.equipment_type ?? undefined,
    brand: row.brand ?? undefined,
    modelNumber: row.model_number ?? undefined,
    serialNumber: row.serial_number ?? undefined,
    installDate: row.install_date ?? undefined,
    warrantyExpiresAt: row.warranty_expires_at ?? undefined,
    location: row.location ?? undefined,
    notes: row.notes ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCustomerEquipmentFormDataToInsert(
  companyId: string,
  customerId: string,
  data: CustomerEquipmentFormData,
  jobId?: string | null,
): CustomerEquipmentInsert {
  return {
    company_id: companyId,
    customer_id: customerId,
    job_id: jobId ?? null,
    name: data.name.trim(),
    equipment_type: trimOrNull(data.equipmentType),
    brand: trimOrNull(data.brand),
    model_number: trimOrNull(data.modelNumber),
    serial_number: trimOrNull(data.serialNumber),
    install_date: trimOrNull(data.installDate),
    warranty_expires_at: trimOrNull(data.warrantyExpiresAt),
    location: trimOrNull(data.location),
    notes: trimOrNull(data.notes),
    is_active: data.isActive,
  };
}

export function mapCustomerEquipmentFormDataToUpdate(
  data: CustomerEquipmentFormData,
  jobId?: string | null,
): CustomerEquipmentUpdate {
  return {
    job_id: jobId ?? null,
    name: data.name.trim(),
    equipment_type: trimOrNull(data.equipmentType),
    brand: trimOrNull(data.brand),
    model_number: trimOrNull(data.modelNumber),
    serial_number: trimOrNull(data.serialNumber),
    install_date: trimOrNull(data.installDate),
    warranty_expires_at: trimOrNull(data.warrantyExpiresAt),
    location: trimOrNull(data.location),
    notes: trimOrNull(data.notes),
    is_active: data.isActive,
  };
}

export async function listCustomerEquipment(
  companyId: string,
  customerId: string,
  options?: { includeInactive?: boolean },
): Promise<CustomerEquipment[]> {
  const supabase = await createClient();

  let query = supabase
    .from("customer_equipment")
    .select("*")
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .order("name", { ascending: true });

  if (!options?.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[listCustomerEquipment] query failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as CustomerEquipmentRow[]).map(mapCustomerEquipmentRow);
}

export async function getCustomerEquipmentById(
  companyId: string,
  equipmentId: string,
): Promise<CustomerEquipment | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customer_equipment")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", equipmentId)
    .maybeSingle();

  if (error) {
    console.error("[getCustomerEquipmentById] query failed:", {
      companyId,
      equipmentId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  if (!data) {
    return null;
  }

  return mapCustomerEquipmentRow(data as CustomerEquipmentRow);
}

export async function createCustomerEquipment(
  companyId: string,
  customerId: string,
  data: CustomerEquipmentFormData,
  jobId?: string | null,
): Promise<{ equipment: CustomerEquipment | null; error: string | null }> {
  const supabase = await createClient();
  const insert = mapCustomerEquipmentFormDataToInsert(
    companyId,
    customerId,
    data,
    jobId,
  );

  const { data: row, error } = await supabase
    .from("customer_equipment")
    .insert(insert)
    .select("*")
    .single();

  if (error) {
    console.error("[createCustomerEquipment] insert failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
    });
    return { equipment: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { equipment: null, error: "Failed to create equipment record." };
  }

  return {
    equipment: mapCustomerEquipmentRow(row as CustomerEquipmentRow),
    error: null,
  };
}

export async function updateCustomerEquipment(
  companyId: string,
  equipmentId: string,
  data: CustomerEquipmentFormData,
  jobId?: string | null,
): Promise<{ equipment: CustomerEquipment | null; error: string | null }> {
  const supabase = await createClient();
  const update = mapCustomerEquipmentFormDataToUpdate(data, jobId);

  const { data: row, error } = await supabase
    .from("customer_equipment")
    .update(update)
    .eq("company_id", companyId)
    .eq("id", equipmentId)
    .select("*")
    .single();

  if (error) {
    console.error("[updateCustomerEquipment] update failed:", {
      companyId,
      equipmentId,
      code: error.code,
      message: error.message,
    });
    return { equipment: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { equipment: null, error: "Equipment record not found." };
  }

  return {
    equipment: mapCustomerEquipmentRow(row as CustomerEquipmentRow),
    error: null,
  };
}

export async function setCustomerEquipmentActive(
  companyId: string,
  equipmentId: string,
  isActive: boolean,
): Promise<{ equipment: CustomerEquipment | null; error: string | null }> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("customer_equipment")
    .update({ is_active: isActive })
    .eq("company_id", companyId)
    .eq("id", equipmentId)
    .select("*")
    .single();

  if (error) {
    console.error("[setCustomerEquipmentActive] update failed:", {
      companyId,
      equipmentId,
      code: error.code,
      message: error.message,
    });
    return { equipment: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { equipment: null, error: "Equipment record not found." };
  }

  return {
    equipment: mapCustomerEquipmentRow(row as CustomerEquipmentRow),
    error: null,
  };
}

const EQUIPMENT_FIELD_LABELS: Record<string, string> = {
  name: "name",
  equipment_type: "type",
  brand: "brand",
  model_number: "model",
  serial_number: "serial",
  install_date: "install date",
  warranty_expires_at: "warranty expiration",
  location: "location",
  notes: "notes",
  is_active: "status",
  job_id: "linked job",
};

export function getCustomerEquipmentChangedFields(
  previous: CustomerEquipmentRow,
  next: CustomerEquipmentRow,
): string[] {
  const fields: string[] = [];

  for (const [key, label] of Object.entries(EQUIPMENT_FIELD_LABELS)) {
    const prevValue = previous[key as keyof CustomerEquipmentRow];
    const nextValue = next[key as keyof CustomerEquipmentRow];

    if (prevValue !== nextValue) {
      fields.push(label);
    }
  }

  return fields;
}

export type { CustomerEquipmentRow };
