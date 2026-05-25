import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  ServiceItemInsert,
  ServiceItemRow,
  ServiceItemUpdate,
} from "@/lib/database/types/core-tables";
import type {
  ServiceItem,
  ServiceItemFormData,
} from "@/shared/types/service-item";

function mapServiceItemRow(row: ServiceItemRow): ServiceItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    unitPrice: Number(row.unit_price),
    taxable: row.taxable,
    category: row.category ?? undefined,
    isActive: row.is_active,
  };
}

export function mapServiceItemFormDataToInsert(
  companyId: string,
  data: ServiceItemFormData,
): ServiceItemInsert {
  return {
    company_id: companyId,
    name: data.name.trim(),
    description: data.description.trim() || null,
    unit_price: Math.max(data.unitPrice, 0),
    taxable: data.taxable,
    category: data.category.trim() || null,
    is_active: data.isActive,
  };
}

export function mapServiceItemFormDataToUpdate(
  data: ServiceItemFormData,
): ServiceItemUpdate {
  return {
    name: data.name.trim(),
    description: data.description.trim() || null,
    unit_price: Math.max(data.unitPrice, 0),
    taxable: data.taxable,
    category: data.category.trim() || null,
    is_active: data.isActive,
  };
}

export async function listServiceItems(
  companyId: string,
): Promise<ServiceItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("service_items")
    .select("*")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error) {
    console.error("[listServiceItems] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as ServiceItemRow[]).map(mapServiceItemRow);
}

export async function listActiveServiceItems(
  companyId: string,
): Promise<ServiceItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("service_items")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("[listActiveServiceItems] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as ServiceItemRow[]).map(mapServiceItemRow);
}

export async function createServiceItem(
  companyId: string,
  data: ServiceItemFormData,
): Promise<{ serviceItem: ServiceItem | null; error: string | null }> {
  const supabase = await createClient();
  const insert = mapServiceItemFormDataToInsert(companyId, data);

  const { data: row, error } = await supabase
    .from("service_items")
    .insert(insert)
    .select("*")
    .single();

  if (error) {
    console.error("[createServiceItem] insert failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return { serviceItem: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { serviceItem: null, error: "Failed to create service item." };
  }

  return {
    serviceItem: mapServiceItemRow(row as ServiceItemRow),
    error: null,
  };
}

export async function updateServiceItem(
  companyId: string,
  serviceItemId: string,
  data: ServiceItemFormData,
): Promise<{ serviceItem: ServiceItem | null; error: string | null }> {
  const supabase = await createClient();
  const update = mapServiceItemFormDataToUpdate(data);

  const { data: row, error } = await supabase
    .from("service_items")
    .update(update)
    .eq("company_id", companyId)
    .eq("id", serviceItemId)
    .select("*")
    .single();

  if (error) {
    console.error("[updateServiceItem] update failed:", {
      companyId,
      serviceItemId,
      code: error.code,
      message: error.message,
    });
    return { serviceItem: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { serviceItem: null, error: "Service item not found." };
  }

  return {
    serviceItem: mapServiceItemRow(row as ServiceItemRow),
    error: null,
  };
}

export async function setServiceItemActive(
  companyId: string,
  serviceItemId: string,
  isActive: boolean,
): Promise<{ serviceItem: ServiceItem | null; error: string | null }> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("service_items")
    .update({ is_active: isActive })
    .eq("company_id", companyId)
    .eq("id", serviceItemId)
    .select("*")
    .single();

  if (error) {
    console.error("[setServiceItemActive] update failed:", {
      companyId,
      serviceItemId,
      code: error.code,
      message: error.message,
    });
    return { serviceItem: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { serviceItem: null, error: "Service item not found." };
  }

  return {
    serviceItem: mapServiceItemRow(row as ServiceItemRow),
    error: null,
  };
}
