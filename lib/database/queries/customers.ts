import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import { phonesMatch } from "@/shared/lib/phone";
import type {
  CustomerInsert,
  CustomerRow,
  CustomerUpdate,
} from "@/lib/database/types/core-tables";
import { listInvoicesByCustomer } from "@/lib/database/queries/invoices";
import {
  normalizeCustomerStatus,
  type Customer,
  type CustomerFormData,
} from "@/shared/types/customer";
import type { CustomerDeleteDependencies } from "@/shared/lib/customer-lifecycle";
import {
  computeCustomerFinancialSummary,
  type CustomerFinancialSummary,
} from "@/shared/types/customer-financial";

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
    status: normalizeCustomerStatus(row.status),
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
    archivedAt: row.archived_at ? row.archived_at : undefined,
    deletedAt: row.deleted_at ? row.deleted_at : undefined,
    deleteAfter: row.delete_after ? row.delete_after : undefined,
  };
}

function mapCustomerFormDataToRowFields(
  data: CustomerFormData,
): Pick<
  CustomerInsert,
  | "name"
  | "email"
  | "phone"
  | "company_name"
  | "status"
  | "address_line1"
  | "city"
  | "state"
  | "postal_code"
  | "notes"
> {
  return {
    name: data.name.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    company_name: data.company.trim() || null,
    status: normalizeCustomerStatus(data.status),
    address_line1: data.address.trim(),
    city: data.city.trim(),
    state: data.state.trim(),
    postal_code: data.zip.trim(),
    notes: data.notes.trim() || null,
  };
}

export function mapCustomerFormDataToInsert(
  companyId: string,
  data: CustomerFormData,
): CustomerInsert {
  return {
    company_id: companyId,
    ...mapCustomerFormDataToRowFields(data),
  };
}

export function mapCustomerFormDataToUpdate(
  data: CustomerFormData,
): CustomerUpdate {
  return mapCustomerFormDataToRowFields(data);
}

export type ListCustomersOptions = {
  includeArchived?: boolean;
  includeDeleted?: boolean;
};

export async function listCustomers(
  companyId: string,
  options?: ListCustomersOptions,
): Promise<Customer[]> {
  const supabase = await createClient();
  const includeArchived = options?.includeArchived ?? false;
  const includeDeleted = options?.includeDeleted ?? false;

  let query = supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId);

  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }

  if (!includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

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

export async function listArchivedCustomers(
  companyId: string,
): Promise<Customer[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .not("archived_at", "is", null)
    .is("deleted_at", null)
    .order("archived_at", { ascending: false });

  if (error) {
    console.error("[listArchivedCustomers] query failed:", {
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

export async function listDeletedCustomers(
  companyId: string,
): Promise<Customer[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) {
    console.error("[listDeletedCustomers] query failed:", {
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

export async function findCustomerByContact(
  companyId: string,
  contact: { email: string; phone: string },
): Promise<{ customer: Customer | null; conflict?: string }> {
  const supabase = await createClient();
  const email = contact.email.trim().toLowerCase();
  const phone = contact.phone.trim();

  if (!email && !phone) {
    return { customer: null };
  }

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .is("deleted_at", null);

  if (error) {
    console.error("[findCustomerByContact] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return { customer: null };
  }

  const rows = (data ?? []) as CustomerRow[];
  const emailMatches = email
    ? rows.filter((row) => row.email.trim().toLowerCase() === email)
    : [];
  const phoneMatches = phone
    ? rows.filter((row) => phonesMatch(row.phone, phone))
    : [];

  if (emailMatches.length > 1 || phoneMatches.length > 1) {
    return {
      customer: null,
      conflict:
        "Multiple customers match this contact info. Link the lead manually from the customer record.",
    };
  }

  if (emailMatches.length === 1 && phoneMatches.length === 1) {
    if (emailMatches[0]!.id !== phoneMatches[0]!.id) {
      return {
        customer: null,
        conflict:
          "Email and phone match different customers. Review the existing records before converting.",
      };
    }

    return { customer: mapCustomerRowToCustomer(emailMatches[0]!) };
  }

  if (emailMatches.length === 1) {
    return { customer: mapCustomerRowToCustomer(emailMatches[0]!) };
  }

  if (phoneMatches.length === 1) {
    return { customer: mapCustomerRowToCustomer(phoneMatches[0]!) };
  }

  return { customer: null };
}

export async function promoteLegacyLeadCustomerStatus(
  companyId: string,
  customerId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("customers")
    .update({ status: "active" })
    .eq("company_id", companyId)
    .eq("id", customerId)
    .eq("status", "lead");

  if (error) {
    console.error("[promoteLegacyLeadCustomerStatus] update failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  return { error: null };
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

export async function getCustomerFinancialSummary(
  companyId: string,
  customerId: string,
): Promise<CustomerFinancialSummary> {
  const invoices = await listInvoicesByCustomer(companyId, customerId);
  return computeCustomerFinancialSummary(invoices);
}

export async function updateCustomer(
  companyId: string,
  customerId: string,
  data: CustomerFormData,
): Promise<{ customer: Customer | null; error: string | null }> {
  const supabase = await createClient();
  const update = mapCustomerFormDataToUpdate(data);

  const { data: row, error } = await supabase
    .from("customers")
    .update(update)
    .eq("company_id", companyId)
    .eq("id", customerId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[updateCustomer] update failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { customer: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { customer: null, error: "Customer not found." };
  }

  return {
    customer: mapCustomerRowToCustomer(row as CustomerRow),
    error: null,
  };
}

async function countRelatedRecords(
  companyId: string,
  customerId: string,
  table: "jobs" | "estimates" | "invoices",
): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("customer_id", customerId);

  if (error) {
    console.error(`[countRelatedRecords] ${table} count failed:`, {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
    });
    return 0;
  }

  return count ?? 0;
}

async function countCustomerInvoicePayments(
  companyId: string,
  customerId: string,
): Promise<number> {
  const supabase = await createClient();

  const { data: invoices, error: invoiceError } = await supabase
    .from("invoices")
    .select("id")
    .eq("company_id", companyId)
    .eq("customer_id", customerId);

  if (invoiceError) {
    console.error("[countCustomerInvoicePayments] invoice lookup failed:", {
      companyId,
      customerId,
      code: invoiceError.code,
      message: invoiceError.message,
    });
    return 0;
  }

  const invoiceIds = (invoices ?? []).map((invoice) => invoice.id);
  if (invoiceIds.length === 0) {
    return 0;
  }

  const { count, error } = await supabase
    .from("invoice_payments")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .in("invoice_id", invoiceIds);

  if (error) {
    console.error("[countCustomerInvoicePayments] count failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
    });
    return 0;
  }

  return count ?? 0;
}

export async function getCustomerDeleteDependencies(
  companyId: string,
  customerId: string,
): Promise<CustomerDeleteDependencies> {
  const [jobCount, estimateCount, invoiceCount, invoicePaymentCount] =
    await Promise.all([
      countRelatedRecords(companyId, customerId, "jobs"),
      countRelatedRecords(companyId, customerId, "estimates"),
      countRelatedRecords(companyId, customerId, "invoices"),
      countCustomerInvoicePayments(companyId, customerId),
    ]);

  return {
    jobCount,
    estimateCount,
    invoiceCount,
    invoicePaymentCount,
  };
}

export async function archiveCustomer(
  companyId: string,
  customerId: string,
): Promise<{ customer: Customer | null; error: string | null }> {
  const supabase = await createClient();
  const archivedAt = new Date().toISOString();

  const { data: row, error } = await supabase
    .from("customers")
    .update({ archived_at: archivedAt })
    .eq("company_id", companyId)
    .eq("id", customerId)
    .is("archived_at", null)
    .is("deleted_at", null)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[archiveCustomer] update failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
    });
    return { customer: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    const existing = await getCustomerById(companyId, customerId);
    if (!existing) {
      return { customer: null, error: "Customer not found." };
    }
    return { customer: null, error: "This customer is already archived." };
  }

  return {
    customer: mapCustomerRowToCustomer(row as CustomerRow),
    error: null,
  };
}

export async function restoreCustomer(
  companyId: string,
  customerId: string,
): Promise<{ customer: Customer | null; error: string | null }> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("customers")
    .update({ archived_at: null })
    .eq("company_id", companyId)
    .eq("id", customerId)
    .not("archived_at", "is", null)
    .is("deleted_at", null)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[restoreCustomer] update failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
    });
    return { customer: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    const existing = await getCustomerById(companyId, customerId);
    if (!existing) {
      return { customer: null, error: "Customer not found." };
    }
    return { customer: null, error: "This customer is not archived." };
  }

  return {
    customer: mapCustomerRowToCustomer(row as CustomerRow),
    error: null,
  };
}

const TRASH_RETENTION_DAYS = 60;

export async function moveCustomerToTrash(
  companyId: string,
  customerId: string,
): Promise<{ customer: Customer | null; error: string | null }> {
  const supabase = await createClient();
  const deletedAt = new Date();
  const deleteAfter = new Date(deletedAt);
  deleteAfter.setDate(deleteAfter.getDate() + TRASH_RETENTION_DAYS);

  const { data: row, error } = await supabase
    .from("customers")
    .update({
      deleted_at: deletedAt.toISOString(),
      delete_after: deleteAfter.toISOString(),
    })
    .eq("company_id", companyId)
    .eq("id", customerId)
    .is("deleted_at", null)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[moveCustomerToTrash] update failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
    });
    return { customer: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    const existing = await getCustomerById(companyId, customerId);
    if (!existing) {
      return { customer: null, error: "Customer not found." };
    }
    return {
      customer: null,
      error: "This customer is already in Recently Deleted.",
    };
  }

  return {
    customer: mapCustomerRowToCustomer(row as CustomerRow),
    error: null,
  };
}

export async function restoreCustomerFromTrash(
  companyId: string,
  customerId: string,
): Promise<{ customer: Customer | null; error: string | null }> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("customers")
    .update({
      deleted_at: null,
      delete_after: null,
      archived_at: null,
    })
    .eq("company_id", companyId)
    .eq("id", customerId)
    .not("deleted_at", "is", null)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[restoreCustomerFromTrash] update failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
    });
    return { customer: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    const existing = await getCustomerById(companyId, customerId);
    if (!existing) {
      return { customer: null, error: "Customer not found." };
    }
    return {
      customer: null,
      error: "This customer is not in Recently Deleted.",
    };
  }

  return {
    customer: mapCustomerRowToCustomer(row as CustomerRow),
    error: null,
  };
}

export async function permanentlyDeleteCustomer(
  companyId: string,
  customerId: string,
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("company_id", companyId)
    .eq("id", customerId)
    .not("deleted_at", "is", null);

  if (error) {
    console.error("[permanentlyDeleteCustomer] delete failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
    });
    return { success: false, error: mapDatabaseError(error) };
  }

  return { success: true, error: null };
}

/** @deprecated Use permanentlyDeleteCustomer instead. */
export async function deleteCustomer(
  companyId: string,
  customerId: string,
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("company_id", companyId)
    .eq("id", customerId);

  if (error) {
    console.error("[deleteCustomer] delete failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
    });
    return { success: false, error: mapDatabaseError(error) };
  }

  return { success: true, error: null };
}
