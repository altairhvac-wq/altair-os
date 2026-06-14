"use client";

import { useState, useTransition } from "react";
import { Copy, Mail } from "lucide-react";
import { copyNetworkInviteLinkAction } from "@/app/actions/network-invites";
import { formatDate } from "@/shared/types/customer";
import { formatActionError } from "@/shared/lib/operational-errors";
import {
  formatNetworkInviteStatus,
  type NetworkInvite,
} from "@/shared/types/network-invite";

type NetworkInvitationCardProps = {
  invite: NetworkInvite;
  timeZone?: string;
  initialInviteUrl?: string;
};

export function NetworkInvitationCard({
  invite,
  timeZone,
  initialInviteUrl,
}: NetworkInvitationCardProps) {
  const [inviteUrl, setInviteUrl] = useState(initialInviteUrl ?? invite.inviteUrl);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      } catch {
        setError("Link generated but clipboard access was blocked.");
      }
    });
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">
            {invite.invitedCompanyName}
          </p>
          <p className="mt-1 text-xs text-slate-600">{invite.invitedContactName}</p>
          <p className="mt-1 text-xs text-slate-500">{invite.invitedEmail}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {formatNetworkInviteStatus(invite.status)}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-slate-700">Sent</dt>
          <dd>{formatDate(invite.createdAt, timeZone)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Accepted</dt>
          <dd>
            {invite.acceptedAt
              ? formatDate(invite.acceptedAt, timeZone)
              : "—"}
          </dd>
        </div>
      </dl>

      {invite.status === "pending" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy invite link
          </button>
          <button
            type="button"
            disabled
            title="Coming soon"
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400"
          >
            <Mail className="h-3.5 w-3.5" />
            Resend invitation
          </button>
        </div>
      ) : null}

      {copyMessage ? (
        <p className="mt-2 text-xs font-medium text-emerald-700">{copyMessage}</p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
    </article>
  );
}
