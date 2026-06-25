"use client";

import { useState, useTransition } from "react";
import { updateLeadFollowUpAction } from "@/app/actions/leads";
import { ls } from "@/shared/components/leads/north-star-m14/lead-north-star-styles";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { addDaysToDateOnly, getDateOnlyInTimeZone } from "@/shared/lib/datetime";
import { formatActionError } from "@/shared/lib/operational-errors";
import { formatLeadDate, formatLeadDateTime, type Lead } from "@/shared/types/lead";

type LeadFollowUpCardProps = {
  lead: Lead;
  onLeadUpdated: (lead: Lead) => void;
  northStar?: boolean;
};

export function LeadFollowUpCard({
  lead,
  onLeadUpdated,
  northStar = false,
}: LeadFollowUpCardProps) {
  const timeZone = useCompanyTimezone();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function applyFollowUpDate(dateOnly: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateLeadFollowUpAction(lead.id, dateOnly);
      if (result.error || !result.lead) {
        setError(
          formatActionError(
            result.error,
            "We couldn't update the follow-up date.",
          ),
        );
        return;
      }

      onLeadUpdated(result.lead);
    });
  }

  const today = getDateOnlyInTimeZone(new Date(), timeZone);
  const actionButtonClass = northStar
    ? `${ls.secondaryButton} text-xs`
    : "admin-btn-secondary text-xs";

  return (
    <div
      className={
        northStar
          ? ls.sectionCard
          : "rounded-xl border border-slate-200 bg-white p-4"
      }
    >
      <h3 className={northStar ? ls.sectionTitle : "text-sm font-semibold text-slate-900"}>
        Follow-up
      </h3>
      <p className={northStar ? ls.helperText : "mt-1 text-xs text-slate-500"}>
        Keep the next touchpoint visible so leads do not get forgotten.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p
            className={
              northStar
                ? ls.sectionLabel
                : "text-xs font-medium uppercase tracking-wide text-slate-500"
            }
          >
            Next follow-up
          </p>
          <p
            className={
              northStar ? ls.sectionValueStrong : "mt-1 text-sm font-semibold text-slate-900"
            }
          >
            {lead.nextFollowUpAt
              ? formatLeadDate(lead.nextFollowUpAt, timeZone)
              : "Not scheduled"}
          </p>
          {!lead.nextFollowUpAt ? (
            <p className={northStar ? ls.helperText : "mt-1 text-xs text-slate-500"}>
              Set a follow-up date so this lead stays on your radar.
            </p>
          ) : null}
        </div>
        <div>
          <p
            className={
              northStar
                ? ls.sectionLabel
                : "text-xs font-medium uppercase tracking-wide text-slate-500"
            }
          >
            Last contacted
          </p>
          <p
            className={
              northStar ? ls.sectionValueStrong : "mt-1 text-sm font-semibold text-slate-900"
            }
          >
            {lead.lastContactedAt
              ? formatLeadDateTime(lead.lastContactedAt, timeZone)
              : "Not logged yet"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => applyFollowUpDate(today)}
          className={actionButtonClass}
        >
          Today
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => applyFollowUpDate(addDaysToDateOnly(today, 1))}
          className={actionButtonClass}
        >
          Tomorrow
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => applyFollowUpDate(addDaysToDateOnly(today, 7))}
          className={actionButtonClass}
        >
          Next week
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-xs text-rose-600">{error}</p>
      ) : null}
    </div>
  );
}
