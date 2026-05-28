"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { convertEstimateToInvoiceAction } from "@/app/actions/invoices";
import {
  resendEstimateEmailAction,
  updateEstimateStatusAction,
} from "@/app/actions/estimates";
import {
  canResendEstimateEmail,
  type EstimateDetail,
  type EstimateStatus,
} from "@/shared/types/estimate";

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
          className: "bg-slate-900 text-white hover:bg-slate-800",
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
          className: "bg-emerald-600 text-white hover:bg-emerald-700",
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
  const [error, setError] = useState<string | null>(null);
  const [resendPending, setResendPending] = useState(false);
  const router = useRouter();
  const actions = getAvailableActions(estimate.status);
  const canConvertToInvoice = estimate.status === "approved";
  const canResendEmail = canResendEstimateEmail(estimate.status);

  if (!canManageEstimates) {
    return null;
  }

  function handleStatusChange(toStatus: EstimateStatus) {
    setError(null);

    startTransition(async () => {
      const result = await updateEstimateStatusAction(
        estimate.id,
        estimate.status,
        toStatus,
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      if (
        toStatus === "sent" &&
        result.emailDelivery &&
        result.emailDelivery.status !== "sent"
      ) {
        setError(
          result.emailDelivery.message ??
            "Estimate could not be sent by email. It remains a draft.",
        );
        return;
      }

      router.refresh();
    });
  }

  function handleConvertToInvoice() {
    startTransition(async () => {
      const result = await convertEstimateToInvoiceAction(estimate.id);

      if (!result.error && result.invoice) {
        router.push(`/invoices/${result.invoice.id}`);
      }
    });
  }

  function handleResendEmail() {
    setError(null);
    setResendPending(true);

    startTransition(async () => {
      try {
        const result = await resendEstimateEmailAction(estimate.id);

        if (result.error) {
          setError(result.error);
          return;
        }

        if (
          result.emailDelivery &&
          result.emailDelivery.status !== "sent"
        ) {
          setError(
            result.emailDelivery.message ??
              "Estimate email could not be resent. Try again.",
          );
          return;
        }

        router.refresh();
      } finally {
        setResendPending(false);
      }
    });
  }

  if (!canConvertToInvoice && actions.length === 0 && !canResendEmail) {
    return null;
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
      {canConvertToInvoice ? (
        <button
          type="button"
          disabled={isPending || resendPending}
          onClick={handleConvertToInvoice}
          className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Convert to invoice
        </button>
      ) : null}
      {canResendEmail ? (
        <button
          type="button"
          disabled={isPending || resendPending}
          onClick={handleResendEmail}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Mail className="h-4 w-4" />
          {resendPending ? "Resending…" : "Resend email"}
        </button>
      ) : null}
      {actions.map((action) => (
        <button
          key={action.toStatus}
          type="button"
          disabled={isPending || resendPending}
          onClick={() => handleStatusChange(action.toStatus)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${action.className}`}
        >
          {action.label}
        </button>
      ))}
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
