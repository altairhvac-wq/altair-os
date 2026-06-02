import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import {
  buildTrashTimestampFields,
  countRelatedRecordsByColumn,
} from "@/lib/database/queries/entity-lifecycle-shared";
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
  const unitCost =
    row.unit_cost == null ? undefined : Number(row.unit_cost);

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    unitCost:
      unitCost == null || Number.isFinite(unitCost) ? unitCost : undefined,
    unitPrice: Number(row.unit_price),
    taxable: row.taxable,
    category: row.category ?? undefined,
    isActive: row.is_active,
    archivedAt: row.archived_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    deleteAfter: row.delete_after ?? undefined,
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
    unit_cost:
      data.unitCost == null ? null : Math.max(data.unitCost, 0),
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
    unit_cost:
      data.unitCost == null ? null : Math.max(data.unitCost, 0),
    unit_price: Math.max(data.unitPrice, 0),
    taxable: data.taxable,
    category: data.category.trim() || null,
    is_active: data.isActive,
  };
}

export type ListServiceItemsOptions = {
  includeArchived?: boolean;
  includeDeleted?: boolean;
};

export async function listServiceItems(
  companyId: string,
  options?: ListServiceItemsOptions,
): Promise<ServiceItem[]> {
  const supabase = await createClient();
  const includeArchived = options?.includeArchived ?? false;
  const includeDeleted = options?.includeDeleted ?? false;

  let query = supabase
    .from("service_items")
    .select("*")
    .eq("company_id", companyId);

  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }

  if (!includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query.order("name", { ascending: true });

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

export async function validateServiceItemIdsBelongToCompany(
  companyId: string,
  serviceItemIds: readonly (string | undefined)[],
): Promise<{ error: string | null }> {
  const ids = [
    ...new Set(
      serviceItemIds
        .map((id) => id?.trim())
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (ids.length === 0) {
    return { error: null };
  }

  const supabase = await createClient();

  const { count, error } = await supabase
    .from("service_items")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .in("id", ids);

  if (error) {
    console.error("[validateServiceItemIdsBelongToCompany] lookup failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  if ((count ?? 0) !== ids.length) {
    return { error: "One or more price book items are invalid for this company." };
  }

  return { error: null };
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
    .is("archived_at", null)
    .is("deleted_at", null)
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

export async function getActiveServiceItemForCompany(
  companyId: string,
  serviceItemId: string,
): Promise<ServiceItem | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("service_items")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", serviceItemId)
    .eq("is_active", true)
    .is("archived_at", null)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[getActiveServiceItemForCompany] lookup failed:", {
      companyId,
      serviceItemId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  if (!data) {
    return null;
  }

  return mapServiceItemRow(data as ServiceItemRow);
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

export async function listDeletedServiceItems(
  companyId: string,
): Promise<ServiceItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("service_items")
    .select("*")
    .eq("company_id", companyId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) {
    console.error("[listDeletedServiceItems] query failed:", { companyId, error });
    return [];
  }

  return ((data ?? []) as ServiceItemRow[]).map(mapServiceItemRow);
}

export async function getServiceItemDeleteDependencies(
  companyId: string,
  serviceItemId: string,
): Promise<{
  estimateLineItemCount: number;
  invoiceLineItemCount: number;
  jobMaterialCount: number;
}> {
  const supabase = await createClient();

  const [estimateLineItemCount, invoiceLineItemCount, jobMaterialCount] =
    await Promise.all([
      countRelatedRecordsByColumn(
        supabase,
        companyId,
        "estimate_line_items",
        "service_item_id",
        serviceItemId,
      ),
      countRelatedRecordsByColumn(
        supabase,
        companyId,
        "invoice_line_items",
        "service_item_id",
        serviceItemId,
      ),
      countRelatedRecordsByColumn(
        supabase,
        companyId,
        "job_materials",
        "service_item_id",
        serviceItemId,
      ),
    ]);

  return { estimateLineItemCount, invoiceLineItemCount, jobMaterialCount };
}

export async function archiveServiceItem(
  companyId: string,
  serviceItemId: string,
): Promise<{ serviceItem: ServiceItem | null; error: string | null }> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("service_items")
    .update({
      archived_at: new Date().toISOString(),
      is_active: false,
    })
    .eq("company_id", companyId)
    .eq("id", serviceItemId)
    .is("archived_at", null)
    .is("deleted_at", null)
    .select("*")
    .maybeSingle();

  if (error) {
    return { serviceItem: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { serviceItem: null, error: "This item could not be archived." };
  }

  return { serviceItem: mapServiceItemRow(row as ServiceItemRow), error: null };
}

export async function restoreServiceItem(
  companyId: string,
  serviceItemId: string,
): Promise<{ serviceItem: ServiceItem | null; error: string | null }> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("service_items")
    .update({
      archived_at: null,
      is_active: true,
    })
    .eq("company_id", companyId)
    .eq("id", serviceItemId)
    .not("archived_at", "is", null)
    .is("deleted_at", null)
    .select("*")
    .maybeSingle();

  if (error) {
    return { serviceItem: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { serviceItem: null, error: "This item is not archived." };
  }

  return { serviceItem: mapServiceItemRow(row as ServiceItemRow), error: null };
}

export async function moveServiceItemToTrash(
  companyId: string,
  serviceItemId: string,
): Promise<{ serviceItem: ServiceItem | null; error: string | null }> {
  const supabase = await createClient();
  const trashFields = buildTrashTimestampFields();

  const { data: row, error } = await supabase
    .from("service_items")
    .update({
      ...trashFields,
      is_active: false,
    })
    .eq("company_id", companyId)
    .eq("id", serviceItemId)
    .is("deleted_at", null)
    .select("*")
    .maybeSingle();

  if (error) {
    return { serviceItem: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return {
      serviceItem: null,
      error: "This item could not be moved to Recently Deleted.",
    };
  }

  return { serviceItem: mapServiceItemRow(row as ServiceItemRow), error: null };
}

export async function restoreServiceItemFromTrash(
  companyId: string,
  serviceItemId: string,
): Promise<{ serviceItem: ServiceItem | null; error: string | null }> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("service_items")
    .update({
      deleted_at: null,
      delete_after: null,
      archived_at: null,
      is_active: true,
    })
    .eq("company_id", companyId)
    .eq("id", serviceItemId)
    .not("deleted_at", "is", null)
    .select("*")
    .maybeSingle();

  if (error) {
    return { serviceItem: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { serviceItem: null, error: "This item is not in Recently Deleted." };
  }

  return { serviceItem: mapServiceItemRow(row as ServiceItemRow), error: null };
}

export async function permanentlyDeleteServiceItem(
  companyId: string,
  serviceItemId: string,
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("service_items")
    .delete()
    .eq("company_id", companyId)
    .eq("id", serviceItemId)
    .not("deleted_at", "is", null);

  if (error) {
    return { success: false, error: mapDatabaseError(error) };
  }

  return { success: true, error: null };
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
