import { LeadCard } from "@/shared/components/leads/LeadCard";
import { LeadStatusBadge } from "@/shared/components/leads/LeadStatusBadge";
import { getLeadLastActivityLabel } from "@/shared/lib/leads/lead-status";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
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
  return (
    <>
      <div className="hidden min-w-0 lg:block">
        <div className="overflow-x-auto">
          <AltairTable className="min-w-[920px]">
            <AltairTableHeader>
              <AltairTableRow className={northStar ? lt.tableHeaderRow : undefined}>
                <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                  Lead Name
                </AltairTableHead>
                <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                  Phone
                </AltairTableHead>
                <AltairTableHead
                  className={`hidden md:table-cell ${northStar ? lt.tableHeaderCell : ""}`}
                >
                  Source
                </AltairTableHead>
                <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                  Status
                </AltairTableHead>
                <AltairTableHead
                  className={`hidden lg:table-cell ${northStar ? lt.tableHeaderCell : ""}`}
                >
                  Next Follow-Up
                </AltairTableHead>
                <AltairTableHead className={northStar ? lt.tableHeaderCell : undefined}>
                  Last Activity
                </AltairTableHead>
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
                    className={northStar ? lt.tableRow : undefined}
                  >
                    <AltairTablePrimaryCell
                      primary={
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelect(lead);
                          }}
                          className={
                            northStar
                              ? `${lt.tablePrimaryText} ${leadNameButtonFocusClass}`
                              : `font-medium text-slate-900 ${leadNameButtonFocusClass}`
                          }
                        >
                          {formatLeadName(lead)}
                        </button>
                      }
                    />
                    <AltairTableCell
                      className={northStar ? lt.tableSecondaryText : "text-slate-600"}
                    >
                      {lead.phone || "—"}
                    </AltairTableCell>
                    <AltairTableCell
                      className={`hidden md:table-cell ${
                        northStar ? lt.tableSecondaryText : "text-slate-600"
                      }`}
                    >
                      {formatLeadSource(lead.source)}
                    </AltairTableCell>
                    <AltairTableCell>
                      <LeadStatusBadge status={lead.status} northStar={northStar} />
                    </AltairTableCell>
                    <AltairTableCell
                      className={`hidden lg:table-cell ${
                        northStar ? lt.tableDateText : "text-slate-600"
                      }`}
                    >
                      {formatLeadDate(lead.nextFollowUpAt, timeZone)}
                    </AltairTableCell>
                    <AltairTableCell
                      className={northStar ? lt.tableMutedText : "text-slate-600"}
                    >
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
            northStar={northStar}
          />
        ))}
      </div>
    </>
  );
}
