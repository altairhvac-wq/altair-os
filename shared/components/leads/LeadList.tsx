import { LeadCard } from "@/shared/components/leads/LeadCard";
import { LeadStatusBadge } from "@/shared/components/leads/LeadStatusBadge";
import { getLeadLastActivityLabel } from "@/shared/lib/leads/lead-status";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
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

/**
 * Leads have no dedicated detail route (a lead opens in the in-page panel
 * via `onSelect`, not a navigation) — so the primary cell cannot use a real
 * `<Link>` the way Customers/Jobs/Invoices/Estimates do. This button reuses
 * the same "text link masquerading as a button" quiet-action pattern (see
 * the Buttons section of the Altair Design Foundation) so the row's primary
 * action stays keyboard-focusable without inventing a new control. Same
 * focus ring as the other ledgers' primary-cell links, reused rather than a
 * new token.
 */
const leadNameButtonFocusClass =
  "text-left hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated";

type LeadListProps = {
  leads: Lead[];
  selectedId: string | null;
  onSelect: (lead: Lead) => void;
  timeZone?: string;
  northStar?: boolean;
};

export function LeadList({
  leads,
  selectedId,
  onSelect,
  timeZone,
  northStar = false,
}: LeadListProps) {
  if (northStar) {
    return (
      <>
        <div className="hidden min-w-0 lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead>
                <tr className={lt.tableHeaderRow}>
                  <th className={`${lt.tableHeaderCell} px-4 py-3`}>Lead Name</th>
                  <th className={`${lt.tableHeaderCell} px-4 py-3`}>Phone</th>
                  <th className={`${lt.tableHeaderCell} hidden px-4 py-3 md:table-cell`}>
                    Source
                  </th>
                  <th className={`${lt.tableHeaderCell} px-4 py-3`}>Status</th>
                  <th className={`${lt.tableHeaderCell} hidden px-4 py-3 lg:table-cell`}>
                    Next Follow-Up
                  </th>
                  <th className={`${lt.tableHeaderCell} px-4 py-3`}>Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const isSelected = lead.id === selectedId;

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => onSelect(lead)}
                      className={`${lt.tableRow} ${
                        isSelected ? lt.tableRowSelected : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelect(lead);
                          }}
                          className={`${lt.tablePrimaryText} ${leadNameButtonFocusClass}`}
                        >
                          {formatLeadName(lead)}
                        </button>
                      </td>
                      <td className={`px-4 py-3 ${lt.tableSecondaryText}`}>
                        {lead.phone || "—"}
                      </td>
                      <td
                        className={`hidden px-4 py-3 md:table-cell ${lt.tableSecondaryText}`}
                      >
                        {formatLeadSource(lead.source)}
                      </td>
                      <td className="px-4 py-3">
                        <LeadStatusBadge status={lead.status} northStar />
                      </td>
                      <td
                        className={`hidden px-4 py-3 lg:table-cell ${lt.tableDateText}`}
                      >
                        {formatLeadDate(lead.nextFollowUpAt, timeZone)}
                      </td>
                      <td className={`px-4 py-3 ${lt.tableMutedText}`}>
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
              northStar
            />
          ))}
        </div>
      </>
    );
  }

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
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelect(lead);
                        }}
                        className={`font-medium text-slate-900 ${leadNameButtonFocusClass}`}
                      >
                        {formatLeadName(lead)}
                      </button>
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
