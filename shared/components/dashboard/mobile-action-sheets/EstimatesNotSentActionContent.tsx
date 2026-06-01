"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateEstimateStatusAction } from "@/app/actions/estimates";
import {
  MobileActionButton,
  MobileActionRecordRow,
} from "@/shared/components/dashboard/mobile-action-sheets/MobileActionRecordRow";
import type { MobileActionSheetData } from "@/shared/lib/mobile-action-dashboard";
import { canBatchSendEstimate } from "@/shared/lib/estimate-batch-send";
import { formatCurrency } from "@/shared/types/customer";

type EstimatesNotSentActionContentProps = {
  sheetData: MobileActionSheetData;
  totalCount: number;
};

export function EstimatesNotSentActionContent({
  sheetData,
  totalCount,
}: EstimatesNotSentActionContentProps) {
  const router = useRouter();
  const [pendingEstimateId, setPendingEstimateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { unsentEstimates, access } = sheetData;
  const canManageBilling = access.canViewBilling;
  const hiddenCount = Math.max(0, totalCount - unsentEstimates.length);

  function handleSend(estimateId: string) {
    if (isPending) {
      return;
    }

    setError(null);
    setPendingEstimateId(estimateId);

    startTransition(async () => {
      try {
        const result = await updateEstimateStatusAction(
          estimateId,
          "draft",
          "sent",
        );

        if (result.error) {
          setError(result.error);
          return;
        }

        router.refresh();
      } finally {
        setPendingEstimateId(null);
      }
    });
  }

  if (unsentEstimates.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No draft estimates in the preview. Open estimates for the full list.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? (
        <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
          {error}
        </p>
      ) : null}

      <ul className="space-y-1.5">
        {unsentEstimates.map((estimate) => {
          const isRowPending = pendingEstimateId === estimate.id && isPending;
          const canSend =
            canManageBilling && canBatchSendEstimate(estimate);

          return (
            <MobileActionRecordRow
              key={estimate.id}
              title={`Estimate ${estimate.estimateNumber}`}
              subtitle={estimate.customerName}
              meta={formatCurrency(estimate.total)}
              actions={
                <>
                  {canSend ? (
                    <MobileActionButton
                      label="Send estimate"
                      onClick={() => handleSend(estimate.id)}
                      pending={isRowPending}
                    />
                  ) : null}
                  <MobileActionButton
                    label="Open estimate"
                    href={`/estimates/${estimate.id}`}
                    variant="secondary"
                  />
                </>
              }
            />
          );
        })}
      </ul>

      {hiddenCount > 0 ? (
        <p className="text-center text-xs font-medium text-slate-500">
          +{hiddenCount} more draft estimates
        </p>
      ) : null}

      <MobileActionButton
        label="View all estimates"
        href="/estimates"
        variant="secondary"
      />
    </div>
  );
}
