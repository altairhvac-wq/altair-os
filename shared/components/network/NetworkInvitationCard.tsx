"use client";

import { useState, useTransition } from "react";
import { Copy, Mail, RefreshCw } from "lucide-react";
import {
  copyNetworkInviteLinkAction,
  regenerateNetworkInviteLinkAction,
  resendNetworkInviteEmailAction,
} from "@/app/actions/network-invites";
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
          result.rotated
            ? "Fresh invite link copied. Any previously shared link no longer works."
            : "Invite link copied. It's the same link as before — safe to re-share.",
        );
      } catch {
        setError("Link generated but clipboard access was blocked.");
      }
    });
  }

  function handleResendEmail() {
    setError(null);
    setCopyMessage(null);

    startTransition(async () => {
      const result = await resendNetworkInviteEmailAction(invite.id);
      if (result.error) {
        setError(
          formatActionError(result.error, "Unable to resend the invitation email."),
        );
        return;
      }

      if (result.inviteUrl) {
        setInviteUrl(result.inviteUrl);
      }

      setCopyMessage(
        result.rotated
          ? `Invitation email sent to ${invite.invitedEmail} with a fresh link. Any previously shared link no longer works.`
          : `Invitation email sent to ${invite.invitedEmail}.`,
      );
    });
  }

  function handleGenerateNewLink() {
    setError(null);
    setCopyMessage(null);

    startTransition(async () => {
      const result = await regenerateNetworkInviteLinkAction(invite.id);
      if (result.error || !result.inviteUrl) {
        setError(
          formatActionError(result.error, "Unable to generate a new invite link."),
        );
        return;
      }

      setInviteUrl(result.inviteUrl);

      try {
        await copyToClipboard(result.inviteUrl);
        setCopyMessage(
          "New invite link copied. Any previously shared link no longer works.",
        );
      } catch {
        setError("New link generated but clipboard access was blocked.");
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
    ? "rounded-full bg-[rgba(194,160,90,0.12)] px-2.5 py-1 text-xs font-semibold text-[#77591B] ring-1 ring-[rgba(194,160,90,0.22)]"
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
              onClick={handleGenerateNewLink}
              disabled={isPending}
              title="Issues a fresh link and invalidates any link shared before"
              className={copyButtonClass}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              New link
            </button>
            <button
              type="button"
              onClick={handleResendEmail}
              disabled={isPending}
              title="Sends the invitation email again with the same link"
              className={copyButtonClass}
            >
              <Mail className="h-3.5 w-3.5" />
              Resend invitation
            </button>
          </div>
          <p className={helperClass}>
            Copy reuses the same secure link. Use New link only to revoke a link
            you&apos;ve already shared — older links stop working.
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
