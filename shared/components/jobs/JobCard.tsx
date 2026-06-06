import { Calendar, MapPin, User, Wrench } from "lucide-react";
import {
  formatScheduledDate,
  formatScheduledTime,
  type Job,
} from "@/shared/types/job";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
import { JobPriorityBadge } from "./JobPriorityBadge";
import { JobStatusBadge } from "./JobStatusBadge";

type JobCardProps = {
  job: Job;
  compact?: boolean;
};

export function JobCard({ job, compact = false }: JobCardProps) {
  const location = `${job.city}, ${job.state}`;

  return (
    <div
      className={
        compact
          ? "space-y-4"
          : "rounded-xl border border-slate-100 bg-white p-4"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {job.jobNumber}
          </p>
          <h3 className="mt-1 truncate text-base font-bold text-slate-900">
            <DemoDisplayName>{job.customerName}</DemoDisplayName>
          </h3>
          <p className="mt-0.5 truncate text-sm text-slate-500">{job.jobType}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <JobStatusBadge status={job.status} />
          <JobPriorityBadge priority={job.priority} />
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate">
            {job.serviceAddress}, {location}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
          <span>
            {formatScheduledDate(job.scheduledDate)} at{" "}
            {formatScheduledTime(job.scheduledDate)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 shrink-0 text-slate-400" />
          <span>{job.assignedTechnician ?? "Unassigned"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate">{job.jobType}</span>
        </div>
      </div>

      {!compact && job.description ? (
        <p className="border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-600">
          {job.description}
        </p>
      ) : null}
    </div>
  );
}
