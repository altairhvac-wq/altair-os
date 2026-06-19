import type { Job } from "@/shared/types/job";

export function filterJobsByArchiveQuery(jobs: Job[], query: string): Job[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 2) {
    return [];
  }

  return jobs.filter((job) => {
    const haystack = [
      job.jobNumber,
      job.customerName,
      job.jobType,
      job.serviceAddress,
      job.city,
      job.state,
      job.assignedTechnician ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}
