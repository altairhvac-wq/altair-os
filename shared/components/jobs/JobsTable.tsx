import {
  formatScheduledDate,
  formatScheduledTime,
  type Job,
} from "@/shared/types/job";
import { JobPriorityBadge } from "./JobPriorityBadge";
import { JobStatusBadge } from "./JobStatusBadge";

type JobsTableProps = {
  jobs: Job[];
  onSelect: (job: Job) => void;
};

export function JobsTable({ jobs, onSelect }: JobsTableProps) {
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Job</th>
            <th className="px-4 py-3">Customer</th>
            <th className="hidden px-4 py-3 md:table-cell">Service address</th>
            <th className="px-4 py-3">Type</th>
            <th className="hidden px-4 py-3 lg:table-cell">Technician</th>
            <th className="px-4 py-3">Scheduled</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Priority</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {jobs.map((job) => (
              <tr
                key={job.id}
                onClick={() => onSelect(job)}
                className="cursor-pointer transition-colors hover:bg-slate-50"
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{job.jobNumber}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="truncate font-medium text-slate-900">
                    {job.customerName}
                  </p>
                </td>
                <td className="hidden max-w-[180px] px-4 py-3 md:table-cell">
                  <p className="truncate text-slate-600">{job.serviceAddress}</p>
                  <p className="truncate text-xs text-slate-500">
                    {job.city}, {job.state}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-600">{job.jobType}</td>
                <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">
                  {job.assignedTechnician ?? (
                    <span className="text-slate-400">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <p>{formatScheduledDate(job.scheduledDate)}</p>
                  <p className="text-xs text-slate-500">
                    {formatScheduledTime(job.scheduledDate)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <JobStatusBadge status={job.status} />
                </td>
                <td className="px-4 py-3">
                  <JobPriorityBadge priority={job.priority} />
                </td>
              </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
