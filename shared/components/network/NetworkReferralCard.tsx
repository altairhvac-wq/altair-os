"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  acceptNetworkReferralAction,
  declineNetworkReferralAction,
} from "@/app/actions/network-referrals";
import { formatLeadStatus } from "@/shared/types/lead";
import { formatDate } from "@/shared/types/customer";
import { formatActionError } from "@/shared/lib/operational-errors";
import {
  formatNetworkReferralRequest,
  formatNetworkReferralStatus,
  formatNetworkReferralUrgency,
  type NetworkReferral,
} from "@/shared/types/network-referral";
import { NetworkReferralStatusBadge } from "./NetworkReferralStatusBadge";

type NetworkReferralCardProps = {
  referral: NetworkReferral;
  direction: "sent" | "received";
  timeZone?: string;
  onUpdated?: (referral: NetworkReferral) => void;
};

export function NetworkReferralCard({
  referral,
  direction,
  timeZone,
  onUpdated,
}: NetworkReferralCardProps) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const partnerName =
    direction === "sent"
      ? referral.targetCompanyName ?? "Partner company"
      : referral.sourceCompanyName ?? "Partner company";

  function handleAccept() {
    setActionError(null);
    startTransition(async () => {
      const result = await acceptNetworkReferralAction(referral.id);
      if (result.error) {
        setActionError(formatActionError(result.error, "We couldn't accept this referral."));
        return;
      }
      if (result.referral) {
        onUpdated?.(result.referral);
      }
    });
  }

  function handleDecline() {
    setActionError(null);
    startTransition(async () => {
      const result = await declineNetworkReferralAction({
        referralId: referral.id,
      });
      if (result.error) {
        setActionError(formatActionError(result.error, "We couldn't decline this referral."));
        return;
      }
      if (result.referral) {
        onUpdated?.(result.referral);
      }
    });
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {direction === "sent" ? "To" : "From"} {partnerName}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">
            {formatNetworkReferralRequest(referral)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Urgency: {formatNetworkReferralUrgency(referral.urgency)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Referral outcome
          </p>
          <div className="mt-1">
            <NetworkReferralStatusBadge status={referral.status} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
        <div>
          <p className="font-semibold uppercase tracking-wide text-slate-500">
            Created
          </p>
          <p className="mt-0.5 text-slate-700">
            {formatDate(referral.createdAt, timeZone)}
          </p>
        </div>
        {referral.targetLeadStatus ? (
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-500">
              Pipeline status
            </p>
            <p className="mt-0.5 text-slate-700">
              {formatLeadStatus(referral.targetLeadStatus)}
            </p>
          </div>
        ) : null}
        {direction === "received" && referral.targetLeadId ? (
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-500">
              Lead pipeline
            </p>
            <Link
              href={`/leads?selected=${referral.targetLeadId}`}
              className="mt-0.5 inline-flex text-sm font-semibold text-cyan-700 hover:text-cyan-800"
            >
              View lead
            </Link>
          </div>
        ) : null}
      </div>

      {referral.incentiveNote ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Incentive note: {referral.incentiveNote}
        </p>
      ) : null}

      {direction === "received" && referral.status === "sent" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAccept}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Accept referral
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
          >
            <XCircle className="h-3.5 w-3.5" />
            Decline
          </button>
        </div>
      ) : null}

      {actionError ? (
        <p className="mt-3 text-xs text-rose-700">{actionError}</p>
      ) : null}

      {referral.declineReason && referral.status === "declined" ? (
        <p className="mt-3 text-xs text-slate-500">
          Decline reason: {referral.declineReason}
        </p>
      ) : null}

      {referral.status === "cancelled" ? (
        <p className="mt-3 text-xs text-slate-500">
          {referral.declineReason
            ? `Cancelled: ${referral.declineReason}`
            : "This referral handoff was cancelled."}
        </p>
      ) : null}

      {["converted", "won", "lost"].includes(referral.status) ? (
        <p className="mt-3 text-xs text-slate-500">
          Outcome synced from lead pipeline:{" "}
          {formatNetworkReferralStatus(referral.status)}.
        </p>
      ) : null}
    </article>
  );
}
