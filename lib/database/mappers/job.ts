import type { JobRow } from "@/lib/database/types/core-tables";
import {
  resolveOptionalSubjectAttributionName,
  type ProfileSummary,
} from "@/shared/lib/profile-attribution";
import type { Job } from "@/shared/types/job";

/**
 * Row -> domain mapping for jobs.
 *
 * Extracted from lib/database/queries/jobs.ts for the same reason the customer
 * mapper was: so it can be imported WITHOUT pulling in the Supabase server
 * client and, through it, next/headers.
 *
 * That is what lets scripts/verify-job-filters-live.mjs run the real mapper. A
 * differential test that maps rows its own way is comparing the SQL against a
 * second implementation rather than against the one that ships, which is the
 * whole failure mode these tests exist to catch.
 *
 * jobs.ts re-exports this, so every existing import keeps working.
 */

export type JobRowWithCustomer = JobRow & {
  customers: {
    name: string;
    email?: string;
    phone?: string;
    company_name?: string | null;
  } | null;
};

export type JobRowWithTechnician = JobRowWithCustomer & {
  assigned_technician: ProfileSummary | null;
};

function toDateOnly(value: string): string {
  return value.split("T")[0] ?? value;
}

function resolveAssignedTechnician(row: JobRowWithTechnician): {
  assignedTechnicianId?: string;
  assignedTechnician?: string;
} {
  if (!row.assigned_technician_id) {
    return {};
  }

  return {
    assignedTechnicianId: row.assigned_technician_id,
    assignedTechnician: resolveOptionalSubjectAttributionName({
      profile: row.assigned_technician,
      subjectUserId: row.assigned_technician_id,
    }),
  };
}

export function mapJobRowToJob(row: JobRowWithTechnician): Job {
  const technician = resolveAssignedTechnician(row);

  return {
    id: row.id,
    jobNumber: row.job_number,
    customerId: row.customer_id,
    customerName: row.customers?.name ?? "Unknown customer",
    serviceAddress: row.service_address,
    city: row.city,
    state: row.state,
    zip: row.postal_code,
    jobType: row.job_type,
    scheduledDate: row.scheduled_at,
    status: row.status,
    priority: row.priority,
    description: row.description ?? undefined,
    notes: row.notes ?? undefined,
    arrivedAt: row.arrived_at ?? undefined,
    workStartedAt: row.work_started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    completionNotes: row.completion_notes ?? undefined,
    followUpNotes: row.follow_up_notes ?? undefined,
    createdAt: toDateOnly(row.created_at),
    archivedAt: row.archived_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    deleteAfter: row.delete_after ?? undefined,
    ...technician,
  };
}
