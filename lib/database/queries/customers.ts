import { countInChunks } from "@/lib/database/queries/chunked-in";
import { mapCustomerRowToCustomer } from "@/lib/database/mappers/customer";
import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import { normalizePhoneDigits } from "@/shared/lib/phone";
import type {
  CustomerInsert,
  CustomerRow,
  CustomerUpdate,
} from "@/lib/database/types/core-tables";
import {
  normalizeCustomerStatus,
  type Customer,
  type CustomerFormData,
} from "@/shared/types/customer";
import type { CustomerDeleteDependencies } from "@/shared/lib/customer-lifecycle";
import {
  computeCustomerOperationalStatsFromRecords,
  type CustomerOperationalStats,
  mergeCustomerOperationalStats,
} from "@/shared/lib/customers/customer-operational-stats";
import { isActiveInvoice, type InvoiceStatus } from "@/shared/types/invoice";

function toDateOnly(value: string): string {
  return value.split("T")[0] ?? value;
}

/**
 * Re-exported from lib/database/mappers/customer.ts, which has no server
 * imports so the queue differential verifier can run the real mapper.
 */
export { mapCustomerRowToCustomer };

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

/** One PostgREST page. Explicit, because the default is what truncated. */
const CUSTOMER_PAGE = 1000;

// unbounded-ok: paged to completion — see the note inside. It reads every
// customer because the job detail picker must be able to offer every customer;
// what it no longer does is read the FIRST THOUSAND and present them as all.
// [was-debt] reads every customer. Two live uses: the reports and
// dashboard aggregates (Phase 5), and the customer pickers on the sales and
// work create forms -- which need the bounded-option-source treatment the
// expenses dropdowns already have, not a bigger limit. Past 1,000 customers
// the picker silently cannot offer the rest.
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

  // Paged. The job detail page renders this straight into a native <select> of
  // every customer, so a read that stopped at PostgREST's 1,000-row default made
  // customers 1,001+ UNSELECTABLE: a job could not be reassigned to them, and
  // nothing on the page said why. reportIfRowCapped noticed the cap and logged
  // it, which is not the same as not truncating.
  //
  // Completeness is the requirement here. The page weight it costs on a large
  // tenant is real and is tracked separately — listCustomerOptions in
  // customers-page.ts is the search-driven shape this picker should end up
  // using, and the Work hub already moved to it.
  const rows: CustomerRow[] = [];
  for (let from = 0; ; from += CUSTOMER_PAGE) {
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + CUSTOMER_PAGE - 1);

    if (error) {
      console.error("[listCustomers] query failed:", {
        companyId,
        page: from / CUSTOMER_PAGE,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return [];
    }

    const page = (data ?? []) as CustomerRow[];
    rows.push(...page);
    if (page.length < CUSTOMER_PAGE) break;
  }

  return rows.map(mapCustomerRowToCustomer);
}

export async function listCustomerImportContacts(
  companyId: string,
): Promise<{ contacts: { email: string; phone: string }[]; error: string | null }> {
  const supabase = await createClient();

  // ============================== READ TO COMPLETION, IN PAGES ==============================
  // This one genuinely needs every contact: it is the duplicate check an import
  // runs against, and a partial list turns "already a customer" into "new
  // customer" for everybody it did not see. It cannot be a page.
  //
  // So it is a range walk rather than an unbounded select. Same rows, same
  // answer, except that PostgREST's 1,000-row ceiling no longer truncates it
  // into a quietly wrong one. The cap below is a runaway guard, not a limit on
  // correctness: it is far above any plausible customer book, and reaching it
  // is logged rather than ignored.
  const PAGE = 1000;
  const MAX_ROWS = 200_000;
  const rows: { email: string; phone: string }[] = [];
  let error: { code?: string; message: string; details?: string } | null = null;

  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const page = await supabase
      .from("customers")
      .select("email, phone")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);

    if (page.error) {
      error = page.error;
      break;
    }

    const batch = (page.data ?? []) as { email: string; phone: string }[];
    rows.push(...batch);
    if (batch.length < PAGE) break;

    if (from + PAGE >= MAX_ROWS) {
      console.error("[listCustomerImportContacts] hit the runaway guard:", {
        companyId,
        rows: rows.length,
      });
    }
  }

  const data = rows;

  if (error) {
    console.error("[listCustomerImportContacts] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return { contacts: [], error: mapDatabaseError(error) };
  }

  return {
    contacts: ((data ?? []) as Pick<CustomerRow, "email" | "phone">[]).map(
      (row) => ({
        email: row.email,
        phone: row.phone,
      }),
    ),
    error: null,
  };
}

/**
 * A ceiling on the match lookups.
 *
 * Two is already a conflict — the function refuses to guess and asks the user
 * to link manually — so anything above that is only ever used to say "more than
 * one". Reading five is enough to say it and cannot become a page-sized read.
 */
const CONTACT_MATCH_LIMIT = 5;

/**
 * The stored phone_match_key for a value being searched for.
 *
 * Deliberately derived from the same two rules migration 163 encodes, and
 * deliberately NOT a second definition of "do these phones match": both sides
 * reduce to a key and the database compares the keys.
 */
function buildPhoneMatchKey(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return "";
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export async function findCustomerByContact(
  companyId: string,
  contact: { email: string; phone: string },
): Promise<{ customer: Customer | null; conflict?: string; error?: string }> {
  const supabase = await createClient();
  const email = contact.email.trim().toLowerCase();
  const phone = contact.phone.trim();

  if (!email && !phone) {
    return { customer: null };
  }

  // ============================== TWO LOOKUPS, NOT THE WHOLE BOOK ==============================
  // This used to read every customer in the company and filter the array. That
  // is the query that decides whether converting a lead LINKS to an existing
  // customer or CREATES a new one, and PostgREST capped it at 1,000 rows — so
  // past a thousand customers it reported "no match" for people who were
  // already there and silently duplicated them, oldest first.
  //
  // Migration 163 added phone_match_key and email_match_key as stored generated
  // columns. phone_match_key is the phonesMatch rule itself, not an
  // approximation of it (the derivation is written out in that migration), so
  // this is an equality lookup on an index rather than a heuristic followed by
  // a re-check. The "more than one match" conflict path below still works
  // because both lookups return every match, not the first.
  const phoneKey = buildPhoneMatchKey(phone);

  const [emailResult, phoneResult] = await Promise.all([
    email
      ? supabase
          .from("customers")
          .select("*")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .eq("email_match_key", email)
          .limit(CONTACT_MATCH_LIMIT)
      : Promise.resolve({ data: [], error: null }),
    phoneKey
      ? supabase
          .from("customers")
          .select("*")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .eq("phone_match_key", phoneKey)
          .limit(CONTACT_MATCH_LIMIT)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const error = emailResult.error ?? phoneResult.error;

  if (error) {
    console.error("[findCustomerByContact] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return {
      customer: null,
      error:
        "We couldn't verify existing customers right now. Try again in a moment.",
    };
  }

  const emailMatches = (emailResult.data ?? []) as CustomerRow[];
  const phoneMatches = (phoneResult.data ?? []) as CustomerRow[];

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

export async function getCustomerOperationalStats(
  companyId: string,
  customerId: string,
): Promise<CustomerOperationalStats> {
  const supabase = await createClient();

  const [jobCountResult, completedJobsResult, invoicesResult] =
    await Promise.all([
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("customer_id", customerId)
        .is("deleted_at", null)
        .is("archived_at", null),
      supabase
        .from("jobs")
        .select("status, completed_at, scheduled_at")
        .eq("company_id", companyId)
        .eq("customer_id", customerId)
        .eq("status", "completed")
        .is("deleted_at", null)
        .is("archived_at", null),
      supabase
        .from("invoices")
        .select("status, amount_paid, total, balance_due")
        .eq("company_id", companyId)
        .eq("customer_id", customerId)
        .is("deleted_at", null)
        .is("archived_at", null),
    ]);

  if (jobCountResult.error) {
    console.error("[getCustomerOperationalStats] job count failed:", {
      companyId,
      customerId,
      code: jobCountResult.error.code,
      message: jobCountResult.error.message,
    });
  }

  if (completedJobsResult.error) {
    console.error("[getCustomerOperationalStats] completed jobs failed:", {
      companyId,
      customerId,
      code: completedJobsResult.error.code,
      message: completedJobsResult.error.message,
    });
  }

  if (invoicesResult.error) {
    console.error("[getCustomerOperationalStats] invoices failed:", {
      companyId,
      customerId,
      code: invoicesResult.error.code,
      message: invoicesResult.error.message,
    });
  }

  const completedJobs = (completedJobsResult.data ?? []).map((row) => ({
    status: row.status as "completed",
    completedAt: row.completed_at ?? undefined,
    scheduledDate: row.scheduled_at,
  }));

  const invoices = (invoicesResult.data ?? [])
    .filter((row) => isActiveInvoice({ status: row.status }))
    .map((row) => ({
      status: row.status as InvoiceStatus,
      total: Number(row.total),
      amountPaid: Number(row.amount_paid),
      balanceDue: Number(row.balance_due),
    }));

  return computeCustomerOperationalStatsFromRecords({
    jobCount: jobCountResult.count ?? 0,
    completedJobs,
    invoices,
  });
}

export function applyCustomerOperationalStats(
  customers: Customer[],
  statsByCustomer: Map<string, CustomerOperationalStats>,
  options?: { includeRevenue?: boolean },
): Customer[] {
  const includeRevenue = options?.includeRevenue ?? true;

  return customers.map((customer) => {
    const stats = statsByCustomer.get(customer.id);
    if (!stats) {
      return {
        ...customer,
        totalJobs: 0,
        totalRevenue: 0,
        lastServiceDate: undefined,
        hasOverdueInvoice: undefined,
      };
    }

    const merged = mergeCustomerOperationalStats(customer, stats);
    return includeRevenue
      ? merged
      : { ...merged, totalRevenue: 0, hasOverdueInvoice: undefined };
  });
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

/** One PostgREST page. The default ceiling is 1,000; this is explicit. */
const INVOICE_ID_PAGE = 1000;

async function countCustomerInvoicePayments(
  companyId: string,
  customerId: string,
): Promise<number> {
  const supabase = await createClient();

  // The invoice ids are PAGED, and that is the fix rather than a detail.
  //
  // This function already chunked the payment count below, because the author
  // knew a long-standing customer can have more invoices than one .in() filter
  // accepts. The read that PRODUCED those ids had no .limit() or .range(), so
  // it stopped at PostgREST's 1,000-row default — the chunking was carefully
  // applied to an already-truncated list, and past a thousand invoices the
  // payment count came back quietly low.
  //
  // The number gates a delete dependency check, so understating it understates
  // what deleting the customer would take with it.
  //
  // A single inner-join count would be shorter and is deliberately not used
  // here: an exact count under the caller's RLS evaluates the policy for every
  // matching row, which is the cost verify-rls-count-cost exists to prevent.
  // Chunked counts stay narrowed to a bounded set of parent invoice ids.
  const invoiceIds: string[] = [];
  for (let from = 0; ; from += INVOICE_ID_PAGE) {
    const { data, error: invoiceError } = await supabase
      .from("invoices")
      .select("id")
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .order("id", { ascending: true })
      .range(from, from + INVOICE_ID_PAGE - 1);

    if (invoiceError) {
      console.error("[countCustomerInvoicePayments] invoice lookup failed:", {
        companyId,
        customerId,
        page: from / INVOICE_ID_PAGE,
        code: invoiceError.code,
        message: invoiceError.message,
      });
      return 0;
    }

    const page = data ?? [];
    invoiceIds.push(...page.map((invoice) => invoice.id));
    if (page.length < INVOICE_ID_PAGE) break;
  }

  if (invoiceIds.length === 0) {
    return 0;
  }

  // Chunked: more invoice ids than PostgREST will accept in one .in() filter,
  // which is now reachable in earnest because the list above is complete.
  const { count, error } = await countInChunks(invoiceIds, (chunk) =>
    supabase
      .from("invoice_payments")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .in("invoice_id", chunk),
  );

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
