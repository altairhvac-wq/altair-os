import type { CustomerRow } from "@/lib/database/types/core-tables";
import { normalizeCustomerStatus, type Customer } from "@/shared/types/customer";

/**
 * Row -> domain mapping for customers.
 *
 * Extracted from lib/database/queries/customers.ts so it can be imported
 * WITHOUT dragging in the Supabase server client and, through it, next/headers.
 * That matters for one specific reason: the differential verifier that proves
 * the SQL work-queue filters agree with the TypeScript work-queue predicates has
 * to run the real mapper. A verifier that maps rows its own way is comparing the
 * SQL against a second implementation rather than against what ships.
 *
 * customers.ts re-exports this, so every existing import keeps working.
 */

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
