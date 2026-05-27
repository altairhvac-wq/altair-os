import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  AlphaTrackerItemInsert,
  AlphaTrackerItemRow,
  AlphaTrackerItemUpdate,
} from "@/lib/database/types/core-tables";
import type {
  AlphaTrackerItem,
  AlphaTrackerItemFormData,
  AlphaTrackerStatus,
} from "@/shared/types/alpha-tracker";

function mapAlphaTrackerItemRow(row: AlphaTrackerItemRow): AlphaTrackerItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    type: row.type,
    severity: row.severity,
    status: row.status,
    pageOrArea: row.page_or_area ?? undefined,
    device: row.device,
    notes: row.notes ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAlphaTrackerItemFormDataToInsert(
  companyId: string,
  createdBy: string,
  data: AlphaTrackerItemFormData,
): AlphaTrackerItemInsert {
  return {
    company_id: companyId,
    created_by: createdBy,
    title: data.title.trim(),
    description: data.description.trim() || null,
    type: data.type,
    severity: data.severity,
    page_or_area: data.pageOrArea.trim() || null,
    device: data.device,
    notes: data.notes.trim() || null,
  };
}

export async function listAlphaTrackerItems(
  companyId: string,
): Promise<AlphaTrackerItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("alpha_tracker_items")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listAlphaTrackerItems] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as AlphaTrackerItemRow[]).map(mapAlphaTrackerItemRow);
}

export async function createAlphaTrackerItem(
  companyId: string,
  createdBy: string,
  data: AlphaTrackerItemFormData,
): Promise<{ item: AlphaTrackerItem | null; error: string | null }> {
  const supabase = await createClient();
  const insert = mapAlphaTrackerItemFormDataToInsert(companyId, createdBy, data);

  const { data: row, error } = await supabase
    .from("alpha_tracker_items")
    .insert(insert)
    .select("*")
    .single();

  if (error) {
    console.error("[createAlphaTrackerItem] insert failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return { item: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { item: null, error: "Failed to create tracker item." };
  }

  return {
    item: mapAlphaTrackerItemRow(row as AlphaTrackerItemRow),
    error: null,
  };
}

export async function updateAlphaTrackerItemStatus(
  companyId: string,
  itemId: string,
  status: AlphaTrackerStatus,
): Promise<{ item: AlphaTrackerItem | null; error: string | null }> {
  const supabase = await createClient();
  const update: AlphaTrackerItemUpdate = { status };

  const { data: row, error } = await supabase
    .from("alpha_tracker_items")
    .update(update)
    .eq("company_id", companyId)
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) {
    console.error("[updateAlphaTrackerItemStatus] update failed:", {
      companyId,
      itemId,
      code: error.code,
      message: error.message,
    });
    return { item: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { item: null, error: "Tracker item not found." };
  }

  return {
    item: mapAlphaTrackerItemRow(row as AlphaTrackerItemRow),
    error: null,
  };
}
