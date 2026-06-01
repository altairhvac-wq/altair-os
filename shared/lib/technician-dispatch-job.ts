import type { DispatchJob } from "@/shared/types/dispatch";
import type { TechnicianJob } from "@/shared/types/technician";
import type { TechnicianTimeStateSnapshot } from "@/shared/types/time-entry";

/** Maps a technician-scoped job to the dispatch card shape (presentation only). */
export function technicianJobToDispatchJob(job: TechnicianJob): DispatchJob {
  return {
    id: job.id,
    customerId: job.customerId,
    jobNumber: job.jobNumber,
    customerName: job.customerName,
    customerEmail: job.customerEmail,
    customerPhone: job.customerPhone,
    serviceAddress: job.serviceAddress,
    city: job.city,
    state: job.state,
    zip: job.zip,
    jobType: job.jobType,
    scheduledDate: job.scheduledDate,
    status: job.status,
    priority: job.priority,
    description: job.description,
    notes: job.notes,
  };
}

export function isLiveTechnicianJob(
  job: TechnicianJob,
  timeState: TechnicianTimeStateSnapshot,
): boolean {
  if (job.status === "in_progress") {
    return true;
  }

  return (
    timeState.openJobLaborEntry?.jobId === job.id ||
    (timeState.state !== "off_clock" && timeState.activeJobId === job.id)
  );
}
