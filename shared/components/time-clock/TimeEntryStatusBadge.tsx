import {
  formatMockTimeEntryStatus,
  type MockTimeEntryStatus,
} from "@/shared/types/time-entry-mock";

type TimeEntryStatusBadgeProps = {
  status: MockTimeEntryStatus;
  className?: string;
};

const statusStyles: Record<MockTimeEntryStatus, string> = {
  active: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  rejected: "bg-red-50 text-red-700 ring-red-600/20",
};

export function TimeEntryStatusBadge({
  status,
  className = "",
}: TimeEntryStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyles[status]} ${className}`}
    >
      {formatMockTimeEntryStatus(status)}
    </span>
  );
}
