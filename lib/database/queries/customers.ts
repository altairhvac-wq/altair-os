import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  CustomerInsert,
  CustomerRow,
} from "@/lib/database/types/core-tables";
import type { Customer, CustomerFormData } from "@/shared/types/customer";

function toDateOnly(value: string): string {
  return value.split("T")[0] ?? value;
}

export function mapCustomerRowToCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company_name ?? undefined,
    status: row.status,
    address: row.address_line1,
    city: row.city,
    state: row.state,
    zip: row.postal_code,
    totalJobs: row.total_jobs,
    totalRevenue: Number(row.total_revenue),
    lastServiceDate: row.last_service_date
      ? toDateOnly(row.last_service_date)
      : undefined,
    tags: row.tags,
    notes: row.notes ?? undefined,
    createdAt: toDateOnly(row.created_at),
  };
}

export function mapCustomerFormDataToInsert(
  companyId: string,
  data: CustomerFormData,
): CustomerInsert {
  return {
    company_id: companyId,
    name: data.name.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    company_name: data.company.trim() || null,
    status: data.status,
    address_line1: data.address.trim(),
    city: data.city.trim(),
    state: data.state.trim(),
    postal_code: data.zip.trim(),
    notes: data.notes.trim() || null,
  };
}

export async function listCustomers(companyId: string): Promise<Customer[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listCustomers] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  return ((data ?? []) as CustomerRow[]).map(mapCustomerRowToCustomer);
}

export async function createCustomer(
  companyId: string,
  data: CustomerFormData,
): Promise<{ customer: Customer | null; error: string | null }> {
  const supabase = await createClient();
  const insert = mapCustomerFormDataToInsert(companyId, data);

  const { data: row, error } = await supabase
    .from("customers")
    .insert(insert)
    .select("*")
    .single();

  if (error) {
    console.error("[createCustomer] insert failed:", {
      companyId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { customer: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { customer: null, error: "Failed to create customer." };
  }

  return {
    customer: mapCustomerRowToCustomer(row as CustomerRow),
    error: null,
  };
}

export async function getCustomerById(
  companyId: string,
  customerId: string,
): Promise<Customer | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    console.error("[getCustomerById] query failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(mapDatabaseError(error));
  }

  if (!data) {
    return null;
  }

  return mapCustomerRowToCustomer(data as CustomerRow);
}
