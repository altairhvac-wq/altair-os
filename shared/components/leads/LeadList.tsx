import { LeadCard } from "@/shared/components/leads/LeadCard";
import { LeadStatusBadge } from "@/shared/components/leads/LeadStatusBadge";
import { getLeadLastActivityLabel } from "@/shared/lib/leads/lead-status";
import {
  adminTableRowClass,
  adminTableRowSelectedClass,
} from "@/shared/lib/admin-density";
import {
  formatLeadDate,
  formatLeadName,
  formatLeadSource,
  type Lead,
} from "@/shared/types/lead";

type LeadListProps = {
  leads: Lead[];
  selectedId: string | null;
  onSelect: (lead: Lead) => void;
  timeZone?: string;
};

export function LeadList({
  leads,
  selectedId,
  onSelect,
  timeZone,
}: LeadListProps) {
  return (
    <>
      <div className="hidden min-w-0 lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100/90 bg-white text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Lead Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="hidden px-4 py-3 md:table-cell">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="hidden px-4 py-3 lg:table-cell">Next Follow-Up</th>
                <th className="px-4 py-3">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leads.map((lead) => {
                const isSelected = lead.id === selectedId;

                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelect(lead)}
                    className={`${adminTableRowClass} ${
                      isSelected ? adminTableRowSelectedClass : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {formatLeadName(lead)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{lead.phone || "—"}</td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                      {formatLeadSource(lead.source)}
                    </td>
                    <td className="px-4 py-3">
                      <LeadStatusBadge status={lead.status} />
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">
                      {formatLeadDate(lead.nextFollowUpAt, timeZone)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {getLeadLastActivityLabel(lead)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 p-4 lg:hidden">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            selected={lead.id === selectedId}
            onSelect={onSelect}
            timeZone={timeZone}
          />
        ))}
      </div>
    </>
  );
}
