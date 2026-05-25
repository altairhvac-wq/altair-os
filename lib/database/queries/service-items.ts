import { createClient } from "@/lib/supabase/server";
import type { ServiceItemRow } from "@/lib/database/types/core-tables";
import type { ServiceItem } from "@/shared/types/service-item";

function mapServiceItemRow(row: ServiceItemRow): ServiceItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    unitPrice: Number(row.unit_price),
    taxable: row.taxable,
  };
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
