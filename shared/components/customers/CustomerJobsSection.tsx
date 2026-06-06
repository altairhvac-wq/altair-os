import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import {
  formatScheduledDate,
  formatScheduledTime,
  type Job,
} from "@/shared/types/job";
import { JobPriorityBadge } from "@/shared/components/jobs/JobPriorityBadge";
import { JobStatusBadge } from "@/shared/components/jobs/JobStatusBadge";
import { adminCardSectionClass } from "@/shared/lib/admin-density";
import { createJobForCustomerHref } from "@/shared/lib/customers/customer-action-links";
import { CUSTOMER_DETAIL_JOBS_ANCHOR } from "@/shared/lib/customers/customer-detail-anchors";

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
  const createJobHref = createJobForCustomerHref(customerId);

  return (
    <section
      className={`${adminCardSectionClass} scroll-mt-6`}
      id={CUSTOMER_DETAIL_JOBS_ANCHOR}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-900">Jobs</h2>

        {canCreateJob ? (
          <Link
            href={createJobHref}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 admin-btn-primary px-2.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            New job
          </Link>
        ) : null}
      </div>

      {jobs.length === 0 ? (
        <div className="mt-2 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-5 text-center">
          <p className="text-sm font-medium text-slate-700">No jobs yet</p>
          {canCreateJob ? (
            <Link
              href={createJobHref}
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-cyan-600 transition-colors hover:text-cyan-700"
            >
              <Plus className="h-4 w-4" />
              New job
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {jobs.map((job) => (
            <li key={job.id} className="py-2.5 first:pt-0 last:pb-0">
              <Link
                href={`/jobs/${job.id}`}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg transition-colors hover:bg-slate-50 -mx-2 px-2 py-1"
              >
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
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
