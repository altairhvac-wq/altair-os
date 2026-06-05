"use client";

import { useState, useTransition } from "react";
import { updateMemberLaborCostRateAction } from "@/app/actions/team-member-profile";
import {
  adminCardSectionClass,
  adminEmptyWrapClass,
  adminFormActionsClass,
  adminFormInputClass,
  adminFormLabelClass,
} from "@/shared/lib/admin-density";
import {
  formatLaborCostRate,
  type TeamMemberProfile,
} from "@/shared/types/team-member-profile";

type TeamMemberProfitabilityCardProps = {
  membershipId: string;
  profile: TeamMemberProfile;
  canEdit: boolean;
  onProfileUpdated: (profile: TeamMemberProfile) => void;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
};

export function TeamMemberProfitabilityCard({
  membershipId,
  profile,
  canEdit,
  onProfileUpdated,
  onError,
  onSuccess,
}: TeamMemberProfitabilityCardProps) {
  const [rateInput, setRateInput] = useState(
    formatLaborCostRate(profile.laborCostRateCents),
  );
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateMemberLaborCostRateAction(
        membershipId,
        rateInput,
      );

      if (result.error) {
        onError?.(result.error);
        return;
      }

      if (result.profile) {
        onProfileUpdated(result.profile);
        setRateInput(formatLaborCostRate(result.profile.laborCostRateCents));
        onSuccess?.("Labor cost rate saved.");
      }
    });
  }

  const hasRate =
    profile.laborCostRateCents != null && profile.laborCostRateCents >= 0;

  return (
    <section className={adminCardSectionClass}>
      <h2 className="mb-1 text-sm font-semibold text-slate-900">
        Profitability Settings
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Used for technician profitability calculations. Not visible to
        technicians.
      </p>

      {!hasRate && !canEdit ? (
        <div className={adminEmptyWrapClass}>
          <p className="text-sm text-slate-500">
            Add a labor cost rate to unlock profitability reporting.
          </p>
        </div>
      ) : canEdit ? (
        <div className="space-y-2">
          <div>
            <label
              htmlFor="labor-cost-rate"
              className={adminFormLabelClass}
            >
              Labor Cost Rate
            </label>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-sm text-slate-500">$</span>
              <input
                id="labor-cost-rate"
                type="text"
                inputMode="decimal"
                value={rateInput}
                onChange={(event) => setRateInput(event.target.value)}
                placeholder="35.00"
                disabled={isPending}
                className={`${adminFormInputClass} min-w-0 flex-1`}
              />
              <span className="shrink-0 text-sm text-slate-500">/hr</span>
            </div>
          </div>
          <div className={adminFormActionsClass}>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex min-h-11 items-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Save rate"}
            </button>
          </div>
        </div>
      ) : hasRate ? (
        <p className="text-sm font-semibold text-slate-900">
          ${formatLaborCostRate(profile.laborCostRateCents)}/hr
        </p>
      ) : (
        <div className={adminEmptyWrapClass}>
          <p className="text-sm text-slate-500">
            Add a labor cost rate to unlock profitability reporting.
          </p>
        </div>
      )}
    </section>
  );
}
