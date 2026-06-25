import { formatLeadStatus, type Lead, type LeadStatus } from "@/shared/types/lead";

const PIPELINE_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "scheduled",
  "estimate_sent",
  "won",
  "lost",
];

type LeadsPipelineSummaryProps = {
  leads: Lead[];
  statusFilter: LeadStatus | "all";
  followUpDueOnly: boolean;
  followUpsDue: number;
  openLeads: number;
  onStatusFilterChange: (value: LeadStatus | "all") => void;
  onFollowUpDueSelect: () => void;
};

function countActiveLeadsByStatus(leads: Lead[]): Record<LeadStatus, number> {
  const counts: Record<LeadStatus, number> = {
    new: 0,
    contacted: 0,
    scheduled: 0,
    estimate_sent: 0,
    won: 0,
    lost: 0,
  };

  for (const lead of leads) {
    if (lead.deletedAt || lead.archivedAt) {
      continue;
    }
    counts[lead.status] += 1;
  }

  return counts;
}

type SummaryChipProps = {
  label: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
};

function SummaryChip({ label, value, active = false, onClick }: SummaryChipProps) {
  const baseClass =
    "min-w-0 rounded-[1rem] border px-3 py-2.5 text-left transition-colors sm:px-3.5 sm:py-3";
  const surfaceClass = active
    ? "border-[rgba(201,164,77,0.42)] bg-[#FFF9EA] shadow-[inset_3px_0_0_0_#C9A44D] ring-1 ring-[rgba(201,164,77,0.22)]"
    : "border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] shadow-[0_2px_8px_rgba(3,7,12,0.08)] hover:border-[rgba(201,164,77,0.28)] hover:bg-[#FFF9EA]";

  const content = (
    <>
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4F4638]">
        {label}
      </p>
      <p className="mt-0.5 text-base font-bold tabular-nums text-[#17130E] sm:text-lg">
        {value}
      </p>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${baseClass} ${surfaceClass}`}>
        {content}
      </button>
    );
  }

  return <div className={`${baseClass} ${surfaceClass}`}>{content}</div>;
}

export function LeadsPipelineSummary({
  leads,
  statusFilter,
  followUpDueOnly,
  followUpsDue,
  openLeads,
  onStatusFilterChange,
  onFollowUpDueSelect,
}: LeadsPipelineSummaryProps) {
  const statusCounts = countActiveLeadsByStatus(leads);

  return (
    <div
      className="shrink-0 space-y-2.5 px-3 pb-2.5 sm:px-3.5 lg:px-5"
      aria-label="Lead pipeline summary"
    >
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <SummaryChip
          label="Open leads"
          value={openLeads}
          active={statusFilter === "all" && !followUpDueOnly}
          onClick={() => onStatusFilterChange("all")}
        />
        <SummaryChip
          label="Follow-ups due"
          value={followUpsDue}
          active={followUpDueOnly}
          onClick={onFollowUpDueSelect}
        />
        <SummaryChip
          label="Won"
          value={statusCounts.won}
          active={statusFilter === "won" && !followUpDueOnly}
          onClick={() => onStatusFilterChange("won")}
        />
        <SummaryChip
          label="Lost"
          value={statusCounts.lost}
          active={statusFilter === "lost" && !followUpDueOnly}
          onClick={() => onStatusFilterChange("lost")}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {PIPELINE_STATUSES.map((status) => {
          const count = statusCounts[status];
          const isActive = statusFilter === status && !followUpDueOnly;

          return (
            <button
              key={status}
              type="button"
              onClick={() => onStatusFilterChange(status)}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? "border-[rgba(201,164,77,0.42)] bg-[#FFF9EA] text-[#17130E] ring-1 ring-[rgba(201,164,77,0.22)]"
                  : "border-[rgba(138,99,36,0.14)] bg-[#FBF7EF] text-[#4F4638] hover:border-[rgba(201,164,77,0.28)] hover:bg-[#FFF9EA]"
              }`}
            >
              <span>{formatLeadStatus(status)}</span>
              <span className="tabular-nums text-[#64748B]">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
