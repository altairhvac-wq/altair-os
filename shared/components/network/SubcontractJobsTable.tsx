import { formatCurrency, formatDate } from "@/shared/types/customer";
import {
  formatSubcontractJobStatus,
  type SubcontractJob,
} from "@/shared/types/network";

type SubcontractJobsTableProps = {
  jobs: SubcontractJob[];
  selectedId: string | null;
  onSelect: (job: SubcontractJob) => void;
};

const statusStyles: Record<SubcontractJob["status"], string> = {
  open: "bg-blue-50 text-blue-700",
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-emerald-50 text-emerald-700",
  in_progress: "bg-violet-50 text-violet-700",
  completed: "bg-slate-100 text-slate-700",
  declined: "bg-rose-50 text-rose-700",
};

export function SubcontractJobsTable({
  jobs,
  selectedId,
  onSelect,
}: SubcontractJobsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Job</th>
            <th className="px-4 py-3">Trade</th>
            <th className="hidden px-4 py-3 md:table-cell">Location</th>
            <th className="px-4 py-3">Partner / Posted by</th>
            <th className="hidden px-4 py-3 lg:table-cell">Scheduled</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {jobs.map((job) => {
            const isSelected = job.id === selectedId;
            const amount =
              job.direction === "sent"
                ? job.payoutAmount
                : job.direction === "received"
                  ? job.earnedAmount
                  : job.budget;

            return (
              <tr
                key={job.id}
                onClick={() => onSelect(job)}
                className={`cursor-pointer transition-colors ${
                  isSelected ? "bg-cyan-50/70" : "hover:bg-slate-50"
                }`}
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{job.jobNumber}</p>
                  <p className="truncate text-xs text-slate-500">{job.title}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{job.tradeType}</td>
                <td className="hidden max-w-[160px] px-4 py-3 md:table-cell">
                  <p className="truncate text-slate-600">{job.city}</p>
                  <p className="truncate text-xs text-slate-500">{job.state}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="truncate font-medium text-slate-900">
                    {job.partnerCompanyName ?? job.postedBy ?? "—"}
                  </p>
                </td>
                <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">
                  {job.scheduledDate ? formatDate(job.scheduledDate) : "—"}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {amount != null ? formatCurrency(amount) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[job.status]}`}
                  >
                    {formatSubcontractJobStatus(job.status)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
