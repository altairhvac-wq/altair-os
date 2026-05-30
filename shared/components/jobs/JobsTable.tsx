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
          <tr className="border-b border-slate-100/90 bg-white text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="admin-table-cell">Job</th>
            <th className="admin-table-cell">Customer</th>
            <th className="hidden admin-table-cell md:table-cell">Service address</th>
            <th className="admin-table-cell">Type</th>
            <th className="hidden admin-table-cell lg:table-cell">Technician</th>
            <th className="admin-table-cell">Scheduled</th>
            <th className="admin-table-cell">Status</th>
            <th className="admin-table-cell">Priority</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {jobs.map((job) => (
              <tr
                key={job.id}
                onClick={() => onSelect(job)}
                className="cursor-pointer transition-colors hover:bg-slate-50"
              >
                <td className="admin-table-cell">
                  <p className="font-semibold text-slate-900">{job.jobNumber}</p>
                </td>
                <td className="admin-table-cell">
                  <p className="truncate font-medium text-slate-900">
                    {job.customerName}
                  </p>
                </td>
                <td className="hidden max-w-[180px] admin-table-cell md:table-cell">
                  <p className="truncate text-slate-600">{job.serviceAddress}</p>
                  <p className="truncate text-xs text-slate-500">
                    {job.city}, {job.state}
                  </p>
                </td>
                <td className="admin-table-cell text-slate-600">{job.jobType}</td>
                <td className="hidden admin-table-cell text-slate-600 lg:table-cell">
                  {job.assignedTechnician ?? (
                    <span className="text-slate-400">Unassigned</span>
                  )}
                </td>
                <td className="admin-table-cell text-slate-600">
                  <p>{formatScheduledDate(job.scheduledDate)}</p>
                  <p className="text-xs text-slate-500">
                    {formatScheduledTime(job.scheduledDate)}
                  </p>
                </td>
                <td className="admin-table-cell">
                  <JobStatusBadge status={job.status} />
                </td>
                <td className="admin-table-cell">
                  <JobPriorityBadge priority={job.priority} />
                </td>
              </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
