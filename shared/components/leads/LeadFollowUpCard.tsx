"use client";

import { useState, useTransition } from "react";
import { updateLeadFollowUpAction } from "@/app/actions/leads";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { addDaysToDateOnly, getDateOnlyInTimeZone } from "@/shared/lib/datetime";
import { formatActionError } from "@/shared/lib/operational-errors";
import { formatLeadDate, formatLeadDateTime, type Lead } from "@/shared/types/lead";

type LeadFollowUpCardProps = {
  lead: Lead;
  onLeadUpdated: (lead: Lead) => void;
};

export function LeadFollowUpCard({
  lead,
  onLeadUpdated,
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Follow-up</h3>
      <p className="mt-1 text-xs text-slate-500">
        Keep the next touchpoint visible so leads do not get forgotten.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Next follow-up
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {lead.nextFollowUpAt
              ? formatLeadDate(lead.nextFollowUpAt, timeZone)
              : "Not scheduled"}
          </p>
          {!lead.nextFollowUpAt ? (
            <p className="mt-1 text-xs text-slate-500">
              Set a follow-up date so this lead stays on your radar.
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Last contacted
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
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
          className="admin-btn-secondary text-xs"
        >
          Today
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => applyFollowUpDate(addDaysToDateOnly(today, 1))}
          className="admin-btn-secondary text-xs"
        >
          Tomorrow
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => applyFollowUpDate(addDaysToDateOnly(today, 7))}
          className="admin-btn-secondary text-xs"
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
