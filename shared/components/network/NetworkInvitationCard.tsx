"use client";

import { useState, useTransition } from "react";
import { Copy, Mail } from "lucide-react";
import { copyNetworkInviteLinkAction } from "@/app/actions/network-invites";
import { formatDate } from "@/shared/types/customer";
import { formatActionError } from "@/shared/lib/operational-errors";
import {
  formatNetworkInviteDisplayStatus,
  type NetworkInvite,
} from "@/shared/types/network-invite";
import { st, type NetworkSurface } from "./north-star-m11/network-north-star-styles";

type NetworkInvitationCardProps = {
  invite: NetworkInvite;
  connectedViaPartners?: boolean;
  timeZone?: string;
  initialInviteUrl?: string;
  surface?: NetworkSurface;
};

export function NetworkInvitationCard({
  invite,
  connectedViaPartners = false,
  timeZone,
  initialInviteUrl,
  surface = "legacy",
}: NetworkInvitationCardProps) {
  const [inviteUrl, setInviteUrl] = useState(initialInviteUrl ?? invite.inviteUrl);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isNorthStar = surface === "north-star";

  async function copyToClipboard(url: string) {
    await navigator.clipboard.writeText(url);
    setCopyMessage("Invite link copied.");
    window.setTimeout(() => setCopyMessage(null), 2500);
  }

  function handleCopyLink() {
    setError(null);
    setCopyMessage(null);

    if (inviteUrl) {
      startTransition(async () => {
        try {
          await copyToClipboard(inviteUrl);
          setCopyMessage("Invite link copied.");
        } catch {
          setError("Unable to copy the invite link.");
        }
      });
      return;
    }

    startTransition(async () => {
      const result = await copyNetworkInviteLinkAction(invite.id);
      if (result.error || !result.inviteUrl) {
        setError(formatActionError(result.error, "Unable to copy invite link."));
        return;
      }

      setInviteUrl(result.inviteUrl);

      try {
        await copyToClipboard(result.inviteUrl);
        setCopyMessage(
          "Fresh invite link copied. Any previously shared link no longer works.",
        );
      } catch {
        setError("Link generated but clipboard access was blocked.");
      }
    });
  }

  const articleClass = isNorthStar
    ? st.cardShell
    : "rounded-xl border border-slate-200 bg-white p-4";
  const nameClass = isNorthStar
    ? "truncate text-sm font-bold text-[#17130E]"
    : "truncate text-sm font-bold text-slate-900";
  const contactClass = isNorthStar ? st.cardSecondary : "mt-1 text-xs text-slate-600";
  const emailClass = isNorthStar ? st.cardMuted : "mt-1 text-xs text-slate-500";
  const showPendingActions = invite.status === "pending" && !connectedViaPartners;
  const statusBadgeClass = isNorthStar
    ? "rounded-full bg-[rgba(201,164,77,0.12)] px-2.5 py-1 text-xs font-semibold text-[#8A6324] ring-1 ring-[rgba(201,164,77,0.22)]"
    : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700";
  const dlClass = isNorthStar
    ? "mt-4 grid gap-2 text-xs text-[#4F4638] sm:grid-cols-2"
    : "mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2";
  const dtClass = isNorthStar
    ? "font-semibold text-[#4F4638]"
    : "font-semibold text-slate-700";
  const copyButtonClass = isNorthStar
    ? st.panelAction
    : "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50";
  const disabledButtonClass = isNorthStar
    ? "inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[rgba(138,99,36,0.18)] bg-[#F5F0E4] px-3 py-2 text-xs font-semibold text-[#6B6255]"
    : "inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400";
  const helperClass = isNorthStar ? st.cardMuted : "text-xs text-slate-500";

  return (
    <article className={articleClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={nameClass}>{invite.invitedCompanyName}</p>
          <p className={contactClass}>{invite.invitedContactName}</p>
          <p className={emailClass}>{invite.invitedEmail}</p>
        </div>
        <span className={statusBadgeClass}>
          {formatNetworkInviteDisplayStatus(invite, connectedViaPartners)}
        </span>
      </div>

      <dl className={dlClass}>
        <div>
          <dt className={dtClass}>Sent</dt>
          <dd>{formatDate(invite.createdAt, timeZone)}</dd>
        </div>
        <div>
          <dt className={dtClass}>Accepted</dt>
          <dd>{invite.acceptedAt ? formatDate(invite.acceptedAt, timeZone) : "—"}</dd>
        </div>
      </dl>

      {showPendingActions ? (
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={isPending}
              className={copyButtonClass}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy invite link
            </button>
            <button
              type="button"
              disabled
              title="Email resend will be available in a later release"
              className={disabledButtonClass}
            >
              <Mail className="h-3.5 w-3.5" />
              Resend invitation
            </button>
          </div>
          <p className={helperClass}>
            {inviteUrl
              ? "Copy again from this card without refreshing to reuse the same link."
              : "After a page refresh, copying generates a fresh link and invalidates older ones."}
          </p>
        </div>
      ) : null}

      {copyMessage ? (
        <p className="mt-2 text-xs font-medium text-emerald-700">{copyMessage}</p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
    </article>
  );
}
