import { Mail, Phone } from "lucide-react";
import { LeadStatusBadge } from "@/shared/components/leads/LeadStatusBadge";
import { NetworkReferralBadge } from "@/shared/components/leads/NetworkReferralBadge";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { adminListRowSelectedClass } from "@/shared/lib/admin-density";
import {
  getLeadLastActivityLabel,
  isLeadFollowUpDue,
} from "@/shared/lib/leads/lead-status";
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
  northStar?: boolean;
};

export function LeadCard({
  lead,
  selected = false,
  onSelect,
  timeZone,
  northStar = false,
}: LeadCardProps) {
  const followUpDue = isLeadFollowUpDue(lead, undefined, timeZone);

  if (northStar) {
    return (
      <button
        type="button"
        onClick={() => onSelect(lead)}
        className={`w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(194,160,90,0.35)] ${
          selected
            ? `border-[rgba(194,160,90,0.42)] bg-[rgba(194,160,90,0.10)] shadow-[inset_3px_0_0_0_#C2A05A] ring-1 ring-[rgba(194,160,90,0.22)]`
            : "border-[rgba(119,89,27,0.12)] bg-[#FBF7EF] hover:border-[rgba(194,160,90,0.28)] hover:bg-[#FFF9EA]"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={lt.tableAvatar}>{getLeadInitials(lead)}</div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`truncate text-sm ${lt.tablePrimaryText}`}>
                {formatLeadName(lead)}
              </p>
              <LeadStatusBadge status={lead.status} northStar />
              <NetworkReferralBadge referral={lead.networkReferral} compact />
              {followUpDue ? (
                <span className="inline-flex rounded-full bg-[rgba(234,88,12,0.10)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#9A3412] ring-1 ring-[rgba(234,88,12,0.22)]">
                  Follow-up due
                </span>
              ) : null}
            </div>

            <div className="mt-2 space-y-1 text-xs text-[#4F4638]">
              {lead.phone ? (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-[#77591B]" />
                  <span>{lead.phone}</span>
                </div>
              ) : null}
              {lead.email ? (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-[#77591B]" />
                  <span className="truncate">{lead.email}</span>
                </div>
              ) : null}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#4F4638]">
              <div>
                <p className="font-medium uppercase tracking-wide">Source</p>
                <p className="mt-0.5 text-[#4F4638]">
                  {formatLeadSource(lead.source)}
                </p>
              </div>
              <div>
                <p className="font-medium uppercase tracking-wide">Created</p>
                <p className="mt-0.5 text-[#4F4638]">
                  {formatLeadDate(lead.createdAt, timeZone)}
                </p>
              </div>
              <div>
                <p className="font-medium uppercase tracking-wide">Follow-up</p>
                <p className="mt-0.5 text-[#4F4638]">
                  {formatLeadDate(lead.nextFollowUpAt, timeZone)}
                </p>
              </div>
            </div>

            <p className="mt-2 line-clamp-2 text-[11px] text-[#7C7259]">
              {getLeadLastActivityLabel(lead)}
            </p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(lead)}
      className={`w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40 focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated ${
        selected
          ? `border-altair-border-strong bg-altair-paper-elevated ${adminListRowSelectedClass} ring-1 ring-altair-ink-on-paper/20`
          : "border-altair-border bg-altair-paper-elevated hover:border-altair-border-strong hover:bg-altair-paper-subtle/80"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-altair-stone text-xs font-bold text-altair-ink-on-paper ring-1 ring-altair-border">
          {getLeadInitials(lead)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-altair-ink-on-paper">
              {formatLeadName(lead)}
            </p>
            <LeadStatusBadge status={lead.status} />
            <NetworkReferralBadge referral={lead.networkReferral} compact />
          </div>

          <div className="mt-2 space-y-1 text-xs text-altair-ink-on-paper-secondary">
            {lead.phone ? (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 shrink-0 text-altair-ink-on-paper-muted" />
                <span>{lead.phone}</span>
              </div>
            ) : null}
            {lead.email ? (
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 shrink-0 text-altair-ink-on-paper-muted" />
                <span className="truncate">{lead.email}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-altair-ink-on-paper-muted">
            <div>
              <p className="font-medium uppercase tracking-wide">Source</p>
              <p className="mt-0.5 text-altair-ink-on-paper-secondary">
                {formatLeadSource(lead.source)}
              </p>
            </div>
            <div>
              <p className="font-medium uppercase tracking-wide">Created</p>
              <p className="mt-0.5 text-altair-ink-on-paper-secondary">
                {formatLeadDate(lead.createdAt, timeZone)}
              </p>
            </div>
            <div>
              <p className="font-medium uppercase tracking-wide">Follow-up</p>
              <p className="mt-0.5 text-altair-ink-on-paper-secondary">
                {formatLeadDate(lead.nextFollowUpAt, timeZone)}
              </p>
            </div>
          </div>

          <p className="mt-2 line-clamp-2 text-[11px] text-altair-ink-on-paper-muted">
            {getLeadLastActivityLabel(lead)}
          </p>
        </div>
      </div>
    </button>
  );
}
