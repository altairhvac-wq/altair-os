import { Clock } from "lucide-react";
import { LeadStatusBadge } from "@/shared/components/leads/LeadStatusBadge";
import { formatLeadFollowUpQueueTitle } from "@/shared/lib/leads/lead-status";
import { formatLeadDate, formatLeadName, type Lead } from "@/shared/types/lead";

type LeadsFollowUpQueueProps = {
  leads: Lead[];
  timeZone: string;
  onSelectLead: (lead: Lead) => void;
  onViewAll: () => void;
};

export function LeadsFollowUpQueue({
  leads,
  timeZone,
  onSelectLead,
  onViewAll,
}: LeadsFollowUpQueueProps) {
  if (leads.length === 0) {
    return null;
  }

  return (
    <div
      className="shrink-0 border-b border-[rgba(119,89,27,0.12)] bg-[#FBF7EF] px-3 py-2.5 sm:px-4 lg:px-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#77591B]">
            Follow-up queue
          </p>
          <h2 className="mt-0.5 text-sm font-bold text-[#17130E]">
            {leads.length} lead{leads.length === 1 ? "" : "s"} need contact
          </h2>
          <p className="mt-0.5 text-[11px] leading-snug text-[#7C7259]">
            Next touchpoints due today or overdue — prioritize before they cool off.
          </p>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-[rgba(119,89,27,0.22)] bg-[#FFF9EA] px-3 py-1.5 text-xs font-semibold text-[#4F4638] transition-colors hover:border-[#C2A05A] hover:bg-[#F3EBDD]"
        >
          View all due
        </button>
      </div>

      <ul className="mt-3 space-y-2">
        {leads.map((lead) => (
          <li key={lead.id}>
            <button
              type="button"
              onClick={() => onSelectLead(lead)}
              className="flex w-full items-start gap-3 rounded-lg border border-[rgba(119,89,27,0.12)] bg-[#FFF9EA] px-3 py-2.5 text-left transition-colors hover:border-[rgba(194,160,90,0.28)] hover:bg-[#F3EBDD]"
            >
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EFE4CB] ring-1 ring-[rgba(119,89,27,0.12)]"
              >
                <Clock className="h-3.5 w-3.5 text-[#77591B]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-[#17130E]">
                    {formatLeadName(lead)}
                  </p>
                  <LeadStatusBadge status={lead.status} northStar />
                </div>
                <p className="mt-0.5 text-xs text-[#4F4638]">
                  {formatLeadFollowUpQueueTitle(lead)}
                </p>
                <p className="mt-1 text-[11px] font-medium text-[#7C7259]">
                  Due {formatLeadDate(lead.nextFollowUpAt, timeZone)}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
