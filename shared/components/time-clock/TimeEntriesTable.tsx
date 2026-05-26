import { AlertTriangle } from "lucide-react";
import { formatDate } from "@/shared/types/customer";
import { formatTime } from "@/shared/types/time-entry";
import {
  formatMockHours,
  type MockTimeEntry,
} from "@/shared/types/time-entry-mock";
import { TimeEntryStatusBadge } from "./TimeEntryStatusBadge";

type TimeEntriesTableProps = {
  entries: MockTimeEntry[];
  selectedId: string | null;
  onSelect: (entry: MockTimeEntry) => void;
};

export function TimeEntriesTable({
  entries,
  selectedId,
  onSelect,
}: TimeEntriesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Entry</th>
            <th className="px-4 py-3">Technician</th>
            <th className="hidden px-4 py-3 md:table-cell">Clock In</th>
            <th className="hidden px-4 py-3 md:table-cell">Clock Out</th>
            <th className="px-4 py-3">Hours</th>
            <th className="hidden px-4 py-3 lg:table-cell">Job / Customer</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {entries.map((entry) => {
            const isSelected = entry.id === selectedId;
            const hours =
              entry.totalHours ??
              (entry.status === "active" ? undefined : undefined);

            return (
              <tr
                key={entry.id}
                onClick={() => onSelect(entry)}
                className={`cursor-pointer transition-colors ${
                  isSelected ? "bg-cyan-50/70" : "hover:bg-slate-50"
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      {entry.entryNumber}
                    </p>
                    {entry.isOvertime ? (
                      <span
                        title="Overtime flagged"
                        className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        OT
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500">
                    {formatDate(entry.createdAt)}
                  </p>
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {entry.technician}
                </td>
                <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                  {formatTime(entry.clockInAt)}
                </td>
                <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                  {entry.clockOutAt ? formatTime(entry.clockOutAt) : "—"}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {hours != null ? formatMockHours(hours) : "In progress"}
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <p className="font-medium text-slate-900">
                    {entry.jobNumber ?? "—"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {entry.customerName ?? "No customer linked"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <TimeEntryStatusBadge status={entry.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
