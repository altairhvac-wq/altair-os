import { Mail, Phone } from "lucide-react";
import { LeadStatusBadge } from "@/shared/components/leads/LeadStatusBadge";
import { getLeadLastActivityLabel } from "@/shared/lib/leads/lead-status";
import {
  formatLeadDate,
  formatLeadName,
  formatLeadSource,
  getLeadInitials,
  type Lead,
} from "@/shared/types/lead";

type LeadCardProps = {
  lead: Lead;
  selected?: boolean;
  onSelect: (lead: Lead) => void;
  timeZone?: string;
};

export function LeadCard({
  lead,
  selected = false,
  onSelect,
  timeZone,
}: LeadCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(lead)}
      className={`w-full rounded-xl border p-3 text-left transition ${
        selected
          ? "border-cyan-300 bg-cyan-50/60 ring-1 ring-cyan-200"
          : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/80"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white">
          {getLeadInitials(lead)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">
              {formatLeadName(lead)}
            </p>
            <LeadStatusBadge status={lead.status} />
          </div>

          <div className="mt-2 space-y-1 text-xs text-slate-600">
            {lead.phone ? (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>{lead.phone}</span>
              </div>
            ) : null}
            {lead.email ? (
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{lead.email}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
            <div>
              <p className="font-medium uppercase tracking-wide">Source</p>
              <p className="mt-0.5 text-slate-700">{formatLeadSource(lead.source)}</p>
            </div>
            <div>
              <p className="font-medium uppercase tracking-wide">Follow-up</p>
              <p className="mt-0.5 text-slate-700">
                {formatLeadDate(lead.nextFollowUpAt, timeZone)}
              </p>
            </div>
          </div>

          <p className="mt-2 line-clamp-2 text-[11px] text-slate-500">
            {getLeadLastActivityLabel(lead)}
          </p>
        </div>
      </div>
    </button>
  );
}
