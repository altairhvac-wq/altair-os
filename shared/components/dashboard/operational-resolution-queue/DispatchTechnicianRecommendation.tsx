"use client";

import { MobileActionButton } from "@/shared/components/dashboard/mobile-action-sheets/MobileActionRecordRow";
import { formatDispatchRecommendationConfidence } from "@/shared/lib/dispatch-recommendations";
import type { DispatchTechnicianRecommendation } from "@/shared/types/dispatch-recommendations";

type DispatchTechnicianRecommendationProps = {
  recommendation: DispatchTechnicianRecommendation;
  canAssign: boolean;
  isPending: boolean;
  onAccept: () => void;
  onChooseOther: () => void;
};

export function DispatchTechnicianRecommendation({
  recommendation,
  canAssign,
  isPending,
  onAccept,
  onChooseOther,
}: DispatchTechnicianRecommendationProps) {
  const confidenceLabel = formatDispatchRecommendationConfidence(
    recommendation.confidence,
  );

  return (
    <section className="rounded-xl border border-cyan-100 bg-cyan-50/40 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800">
        Recommended technician
      </p>
      <p className="mt-1 text-base font-bold text-slate-900">
        {recommendation.technicianName}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-600">
        Confidence: {confidenceLabel}
      </p>

      {recommendation.reasons.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Why
          </p>
          <ul className="mt-1.5 space-y-1">
            {recommendation.reasons.map((reason) => (
              <li
                key={reason}
                className="flex gap-1.5 text-sm font-medium text-slate-700"
              >
                <span aria-hidden="true">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canAssign ? (
        <div className="mt-4 flex flex-col gap-2">
          <MobileActionButton
            label="Accept recommendation"
            onClick={onAccept}
            pending={isPending}
          />
          <MobileActionButton
            label="Choose someone else"
            onClick={onChooseOther}
            disabled={isPending}
            variant="secondary"
          />
        </div>
      ) : null}
    </section>
  );
}
