import Link from "next/link";
import { Briefcase, MapPin, Plus } from "lucide-react";
import {
  formatScheduledDate,
  formatScheduledTime,
  type Job,
} from "@/shared/types/job";
import { JobPriorityBadge } from "@/shared/components/jobs/JobPriorityBadge";
import { JobStatusBadge } from "@/shared/components/jobs/JobStatusBadge";

type CustomerJobsSectionProps = {
  customerId: string;
  jobs: Job[];
  canCreateJob: boolean;
};

export function CustomerJobsSection({
  customerId,
  jobs,
  canCreateJob,
}: CustomerJobsSectionProps) {
  const createJobHref = `/jobs?customerId=${encodeURIComponent(customerId)}&create=1`;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <Briefcase className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Jobs</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Recent service history and scheduled work
            </p>
          </div>
        </div>

        {canCreateJob ? (
          <Link
            href={createJobHref}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-700"
          >
            <Plus className="h-4 w-4" />
            Create job for this customer
          </Link>
        ) : null}
      </div>

      {jobs.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">No jobs yet</p>
          {canCreateJob ? (
            <Link
              href={createJobHref}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-600 transition-colors hover:text-cyan-700"
            >
              <Plus className="h-4 w-4" />
              Create job for this customer
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-slate-100">
          {jobs.map((job) => (
            <li key={job.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{job.jobNumber}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{job.jobType}</p>
                  <div className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <p>{job.serviceAddress}</p>
                      <p className="text-xs text-slate-500">
                        {job.city}, {job.state} {job.zip}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {formatScheduledDate(job.scheduledDate)} at{" "}
                    {formatScheduledTime(job.scheduledDate)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <JobStatusBadge status={job.status} />
                  <JobPriorityBadge priority={job.priority} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
