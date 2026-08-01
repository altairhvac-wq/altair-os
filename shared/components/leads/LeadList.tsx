import { LeadCard } from "@/shared/components/leads/LeadCard";
import { LeadStatusBadge } from "@/shared/components/leads/LeadStatusBadge";
import { getLeadLastActivityLabel } from "@/shared/lib/leads/lead-status";
import {
  AltairTable,
  AltairTableBody,
  AltairTableCell,
  AltairTableHead,
  AltairTableHeader,
  AltairTablePrimaryCell,
  AltairTableRow,
} from "@/shared/design-system/table";
import {
  formatLeadDate,
  formatLeadName,
  formatLeadSource,
  type Lead,
} from "@/shared/types/lead";
import { leadMissionClasses as lm } from "./lead-list-presentation";

/**
 * Leads have no dedicated detail route (a lead opens in the in-page panel
 * via `onSelect`, not a navigation) — so the primary cell cannot use a real
 * `<Link>` the way Customers/Jobs/Invoices/Estimates do. This button reuses
 * the same "text link masquerading as a button" quiet-action pattern (see
 * the Buttons section of the Altair Design Foundation) so the row's primary
 * action stays keyboard-focusable without inventing a new control.
 */
const leadNameButtonFocusClass =
  "text-left hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40 focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated";

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
      <div className={`hidden min-w-0 lg:block ${lm.listShell}`}>
        <div className="overflow-x-auto">
          <AltairTable className="min-w-[1040px]">
            <AltairTableHeader>
              <AltairTableRow>
                <AltairTableHead>Lead Name</AltairTableHead>
                <AltairTableHead>Phone</AltairTableHead>
                <AltairTableHead className="hidden md:table-cell">
                  Source
                </AltairTableHead>
                <AltairTableHead>Status</AltairTableHead>
                <AltairTableHead className="hidden xl:table-cell">
                  Created
                </AltairTableHead>
                <AltairTableHead className="hidden lg:table-cell">
                  Next Follow-Up
                </AltairTableHead>
                <AltairTableHead>Last Activity</AltairTableHead>
              </AltairTableRow>
            </AltairTableHeader>
            <AltairTableBody>
              {leads.map((lead) => {
                const isSelected = lead.id === selectedId;

                return (
                  <AltairTableRow
                    key={lead.id}
                    selected={isSelected}
                    onClick={() => onSelect(lead)}
                  >
                    <AltairTablePrimaryCell
                      primary={
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelect(lead);
                          }}
                          className={`${lm.primaryText} ${leadNameButtonFocusClass}`}
                        >
                          {formatLeadName(lead)}
                        </button>
                      }
                    />
                    <AltairTableCell className={lm.secondaryText}>
                      {lead.phone || "—"}
                    </AltairTableCell>
                    <AltairTableCell
                      className={`hidden md:table-cell ${lm.secondaryText}`}
                    >
                      {formatLeadSource(lead.source)}
                    </AltairTableCell>
                    <AltairTableCell>
                      <LeadStatusBadge status={lead.status} />
                    </AltairTableCell>
                    <AltairTableCell
                      className={`hidden xl:table-cell ${lm.mutedText}`}
                    >
                      {formatLeadDate(lead.createdAt, timeZone)}
                    </AltairTableCell>
                    <AltairTableCell
                      className={`hidden lg:table-cell ${lm.secondaryText}`}
                    >
                      {formatLeadDate(lead.nextFollowUpAt, timeZone)}
                    </AltairTableCell>
                    <AltairTableCell className={lm.mutedText}>
                      {getLeadLastActivityLabel(lead)}
                    </AltairTableCell>
                  </AltairTableRow>
                );
              })}
            </AltairTableBody>
          </AltairTable>
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
