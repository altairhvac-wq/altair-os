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
import { st, type NetworkSurface } from "./north-star-m11/network-north-star-styles";
import { NetworkReferralStatusBadge } from "./NetworkReferralStatusBadge";

type NetworkReferralCardProps = {
  referral: NetworkReferral;
  direction: "sent" | "received";
  timeZone?: string;
  onUpdated?: (referral: NetworkReferral) => void;
  surface?: NetworkSurface;
};

export function NetworkReferralCard({
  referral,
  direction,
  timeZone,
  onUpdated,
  surface = "legacy",
}: NetworkReferralCardProps) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const isNorthStar = surface === "north-star";
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

  const articleClass = isNorthStar
    ? st.cardShell
    : "rounded-xl border border-slate-200 bg-white p-4";
  const partnerLabelClass = isNorthStar
    ? "text-xs font-semibold uppercase tracking-wide text-[#6B6255]"
    : "text-xs font-semibold uppercase tracking-wide text-slate-500";
  const requestClass = isNorthStar
    ? "mt-1 text-sm font-bold text-[#17130E]"
    : "mt-1 text-sm font-bold text-slate-900";
  const metaClass = isNorthStar ? st.cardMuted : "mt-1 text-xs text-slate-500";
  const fieldLabelClass = isNorthStar
    ? "font-semibold uppercase tracking-wide text-[#6B6255]"
    : "font-semibold uppercase tracking-wide text-slate-500";
  const fieldValueClass = isNorthStar
    ? "mt-0.5 text-[#4F4638]"
    : "mt-0.5 text-slate-700";
  const gridClass = isNorthStar
    ? "mt-4 grid gap-3 text-xs text-[#4F4638] sm:grid-cols-2"
    : "mt-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-2";
  const incentiveClass = isNorthStar
    ? "mt-3 rounded-lg bg-[#FFF9EA] px-3 py-2 text-xs text-[#4F4638] ring-1 ring-[rgba(138,99,36,0.12)]"
    : "mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900";
  const acceptButtonClass = isNorthStar
    ? st.panelActionAccent
    : "inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60";
  const declineButtonClass = isNorthStar
    ? "inline-flex items-center gap-2 rounded-xl border border-[rgba(185,28,28,0.28)] bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#991B1B] transition hover:bg-[#FEE2E2] disabled:opacity-60"
    : "inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60";
  const leadLinkClass = isNorthStar
    ? "mt-0.5 inline-flex text-sm font-semibold text-[#8A6324] transition hover:text-[#6B5A2E]"
    : "mt-0.5 inline-flex text-sm font-semibold text-cyan-700 hover:text-cyan-800";
  const footnoteClass = isNorthStar ? st.cardMuted : "mt-3 text-xs text-slate-500";

  return (
    <article className={articleClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={partnerLabelClass}>
            {direction === "sent" ? "To" : "From"} {partnerName}
          </p>
          <p className={requestClass}>{formatNetworkReferralRequest(referral)}</p>
          <p className={metaClass}>
            Urgency: {formatNetworkReferralUrgency(referral.urgency)}
          </p>
        </div>
        <div className="text-right">
          <p className={partnerLabelClass}>Referral outcome</p>
          <div className="mt-1">
            <NetworkReferralStatusBadge status={referral.status} surface={surface} />
          </div>
        </div>
      </div>

      <div className={gridClass}>
        <div>
          <p className={fieldLabelClass}>Created</p>
          <p className={fieldValueClass}>{formatDate(referral.createdAt, timeZone)}</p>
        </div>
        {referral.targetLeadStatus ? (
          <div>
            <p className={fieldLabelClass}>Pipeline status</p>
            <p className={fieldValueClass}>{formatLeadStatus(referral.targetLeadStatus)}</p>
          </div>
        ) : null}
        {direction === "received" && referral.targetLeadId ? (
          <div>
            <p className={fieldLabelClass}>Lead pipeline</p>
            <Link href={`/leads?selected=${referral.targetLeadId}`} className={leadLinkClass}>
              View lead
            </Link>
          </div>
        ) : null}
      </div>

      {referral.incentiveNote ? (
        <p className={incentiveClass}>Incentive note: {referral.incentiveNote}</p>
      ) : null}

      {direction === "received" && referral.status === "sent" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAccept}
            disabled={isPending}
            className={acceptButtonClass}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Accept referral
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={isPending}
            className={declineButtonClass}
          >
            <XCircle className="h-3.5 w-3.5" />
            Decline
          </button>
        </div>
      ) : null}

      {actionError ? <p className="mt-3 text-xs text-rose-700">{actionError}</p> : null}

      {referral.declineReason && referral.status === "declined" ? (
        <p className={footnoteClass}>Decline reason: {referral.declineReason}</p>
      ) : null}

      {referral.status === "cancelled" ? (
        <p className={footnoteClass}>
          {referral.declineReason
            ? `Cancelled: ${referral.declineReason}`
            : "This referral handoff was cancelled."}
        </p>
      ) : null}

      {["converted", "won", "lost"].includes(referral.status) ? (
        <p className={footnoteClass}>
          Outcome synced from lead pipeline:{" "}
          {formatNetworkReferralStatus(referral.status)}.
        </p>
      ) : null}
    </article>
  );
}
