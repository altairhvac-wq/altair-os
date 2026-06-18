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
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

type CustomerJobsSectionProps = {
  customerId: string;
  jobs: Job[];
  canCreateJob: boolean;
  northStar?: boolean;
  compact?: boolean;
};

const COMPACT_JOBS_LIMIT = 5;

export function CustomerJobsSection({
  customerId,
  jobs,
  canCreateJob,
  northStar = false,
  compact = false,
}: CustomerJobsSectionProps) {
  const createJobHref = createJobForCustomerHref(customerId);
  const sectionClass = northStar
    ? compact
      ? dt.compactSectionSurface
      : dt.sectionSurface
    : adminCardSectionClass;
  const visibleJobs = compact ? jobs.slice(0, COMPACT_JOBS_LIMIT) : jobs;
  const hiddenJobCount = compact ? Math.max(0, jobs.length - COMPACT_JOBS_LIMIT) : 0;

  return (
    <section
      className={`${sectionClass} scroll-mt-6`}
      id={CUSTOMER_DETAIL_JOBS_ANCHOR}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className={northStar ? dt.sectionTitle : "text-sm font-bold text-slate-900"}>
          Jobs
        </h2>

        {canCreateJob ? (
          <Link
            href={createJobHref}
            className={
              northStar
                ? dt.primaryAction
                : "inline-flex min-h-11 shrink-0 items-center gap-1.5 admin-btn-primary px-2.5 text-xs"
            }
          >
            <Plus className="h-3.5 w-3.5" />
            New job
          </Link>
        ) : null}
      </div>

      {jobs.length === 0 ? (
        <div
          className={
            northStar
              ? `mt-2 ${dt.emptyState}`
              : "mt-2 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-5 text-center"
          }
        >
          <p
            className={
              northStar
                ? "text-sm font-medium text-[#4F4638]"
                : "text-sm font-medium text-slate-700"
            }
          >
            No jobs yet
          </p>
          {canCreateJob ? (
            <Link
              href={createJobHref}
              className={
                northStar
                  ? `mt-2 inline-flex min-h-11 items-center gap-1.5 ${dt.link}`
                  : "mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-cyan-600 transition-colors hover:text-cyan-700"
              }
            >
              <Plus className="h-4 w-4" />
              New job
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className={`mt-3 ${northStar ? dt.listDivider : "divide-y divide-slate-100"}`}>
          {visibleJobs.map((job) => (
            <li key={job.id} className="py-2.5 first:pt-0 last:pb-0">
              <Link
                href={`/jobs/${job.id}`}
                className={
                  northStar
                    ? `flex flex-wrap items-start justify-between gap-3 ${dt.listRowHover}`
                    : "flex flex-wrap items-start justify-between gap-3 rounded-lg transition-colors hover:bg-slate-50 -mx-2 px-2 py-1"
                }
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      northStar
                        ? "font-semibold text-[#17130E]"
                        : "font-semibold text-slate-900"
                    }
                  >
                    {job.jobNumber}
                  </p>
                  <p
                    className={
                      northStar
                        ? "mt-0.5 text-sm text-[#4F4638]"
                        : "mt-0.5 text-sm text-slate-600"
                    }
                  >
                    {job.jobType}
                  </p>
                  <div
                    className={
                      northStar
                        ? "mt-2 flex items-start gap-2 text-sm text-[#4F4638]"
                        : "mt-2 flex items-start gap-2 text-sm text-slate-600"
                    }
                  >
                    <MapPin
                      className={
                        northStar
                          ? "mt-0.5 h-4 w-4 shrink-0 text-[#8A6324]"
                          : "mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                      }
                    />
                    <div>
                      <p>{job.serviceAddress}</p>
                      <p className={northStar ? "text-xs text-[#6B6255]" : "text-xs text-slate-500"}>
                        {job.city}, {job.state} {job.zip}
                      </p>
                    </div>
                  </div>
                  <p className={northStar ? "mt-2 text-sm text-[#4F4638]" : "mt-2 text-sm text-slate-600"}>
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
      {hiddenJobCount > 0 ? (
        <p className={northStar ? dt.truncatedHint : "mt-2 text-xs text-slate-500"}>
          Showing {visibleJobs.length} of {jobs.length} jobs
        </p>
      ) : null}
    </section>
  );
}
