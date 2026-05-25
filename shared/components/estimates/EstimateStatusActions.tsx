"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateEstimateStatusAction } from "@/app/actions/estimates";
import type { EstimateDetail, EstimateStatus } from "@/shared/types/estimate";

type EstimateStatusActionsProps = {
  estimate: EstimateDetail;
  canManageEstimates: boolean;
};

type StatusAction = {
  label: string;
  toStatus: EstimateStatus;
  className: string;
};

function getAvailableActions(status: EstimateStatus): StatusAction[] {
  switch (status) {
    case "draft":
      return [
        {
          label: "Send estimate",
          toStatus: "sent",
          className:
            "bg-slate-900 text-white hover:bg-slate-800",
        },
        {
          label: "Cancel",
          toStatus: "cancelled",
          className:
            "border border-slate-200 text-slate-700 hover:bg-slate-50",
        },
      ];
    case "sent":
      return [
        {
          label: "Mark approved",
          toStatus: "approved",
          className:
            "bg-emerald-600 text-white hover:bg-emerald-700",
        },
        {
          label: "Mark declined",
          toStatus: "declined",
          className:
            "border border-slate-200 text-slate-700 hover:bg-slate-50",
        },
        {
          label: "Cancel",
          toStatus: "cancelled",
          className:
            "border border-slate-200 text-slate-700 hover:bg-slate-50",
        },
      ];
    case "approved":
      return [
        {
          label: "Mark converted",
          toStatus: "converted",
          className:
            "bg-violet-600 text-white hover:bg-violet-700",
        },
        {
          label: "Cancel",
          toStatus: "cancelled",
          className:
            "border border-slate-200 text-slate-700 hover:bg-slate-50",
        },
      ];
    case "declined":
      return [
        {
          label: "Cancel",
          toStatus: "cancelled",
          className:
            "border border-slate-200 text-slate-700 hover:bg-slate-50",
        },
      ];
    default:
      return [];
  }
}

export function EstimateStatusActions({
  estimate,
  canManageEstimates,
}: EstimateStatusActionsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const actions = getAvailableActions(estimate.status);

  if (!canManageEstimates || actions.length === 0) {
    return null;
  }

  function handleStatusChange(toStatus: EstimateStatus) {
    startTransition(async () => {
      const result = await updateEstimateStatusAction(
        estimate.id,
        estimate.status,
        toStatus,
      );

      if (!result.error) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.toStatus}
          type="button"
          disabled={isPending}
          onClick={() => handleStatusChange(action.toStatus)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${action.className}`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
