"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Mail, UserCheck } from "lucide-react";
import { acceptIncomingNetworkInviteAction } from "@/app/actions/network-invites";
import { formatDate } from "@/shared/types/customer";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { IncomingNetworkInvite } from "@/shared/types/network-invite";

type IncomingNetworkInvitesCardProps = {
  invites: IncomingNetworkInvite[];
  canAccept: boolean;
  timeZone?: string;
  variant?: "banner" | "section";
};

export function IncomingNetworkInvitesCard({
  invites,
  canAccept,
  timeZone,
  variant = "section",
}: IncomingNetworkInvitesCardProps) {
  const router = useRouter();
  const [items, setItems] = useState(invites);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) {
    return null;
  }

  function handleAccept(invite: IncomingNetworkInvite) {
    if (isPending || !canAccept) {
      return;
    }

    setError(null);
    setSuccess(null);
    setAcceptingId(invite.id);

    startTransition(async () => {
      const result = await acceptIncomingNetworkInviteAction(invite.id);

      if (result.error) {
        setError(formatActionError(result.error, "Unable to accept invitation."));
        setAcceptingId(null);
        return;
      }

      setItems((previous) => previous.filter((item) => item.id !== invite.id));
      setSuccess(
        result.alreadyAccepted
          ? `Already connected with ${invite.sourceCompanyName}.`
          : "Connected. Both companies are now trusted partners.",
      );
      setAcceptingId(null);
      router.refresh();
    });
  }

  if (variant === "banner" && items.length === 1) {
    const invite = items[0];
    const isAccepting = isPending && acceptingId === invite.id;

    return (
      <section className="mt-4 rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              You&apos;ve been invited to connect with {invite.sourceCompanyName}.
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Accept to add both companies as trusted network partners.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleAccept(invite)}
            disabled={isPending || !canAccept}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            {isAccepting ? "Accepting..." : "Accept Invitation"}
          </button>
        </div>
        {!canAccept ? (
          <p className="mt-2 text-xs text-slate-500">
            Only company owners and admins can accept network invitations.
          </p>
        ) : null}
        {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
        {success ? (
          <p className="mt-2 text-xs font-medium text-emerald-700">{success}</p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="min-w-0 max-w-full rounded-xl border border-cyan-200 bg-cyan-50/60 shadow-sm">
      <div className="border-b border-cyan-100 px-4 py-4 sm:px-6">
        <div className="flex items-start gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
            <Mail className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">
              Incoming Invitations
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Network invitations sent to your email address for this workspace.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4 sm:px-6" aria-busy={isPending}>
        {items.map((invite) => {
          const isAccepting = isPending && acceptingId === invite.id;

          return (
            <article
              key={invite.id}
              className="rounded-xl border border-white bg-white/90 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    {invite.sourceCompanyName}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Invited {invite.invitedCompanyName} · {invite.invitedEmail}
                  </p>
                  <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-slate-700">Trade</dt>
                      <dd>{invite.tradeCategory}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">Sent</dt>
                      <dd>{formatDate(invite.createdAt, timeZone)}</dd>
                    </div>
                  </dl>
                  {invite.personalMessage ? (
                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {invite.personalMessage}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => handleAccept(invite)}
                  disabled={isPending || !canAccept}
                  className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <UserCheck className="h-4 w-4" aria-hidden="true" />
                  {isAccepting ? "Accepting..." : "Accept"}
                </button>
              </div>
            </article>
          );
        })}

        {!canAccept ? (
          <p className="text-xs text-slate-500">
            Only company owners and admins can accept network invitations.
          </p>
        ) : null}

        {error ? <p className="text-xs text-rose-700">{error}</p> : null}
        {success ? (
          <p className="text-xs font-medium text-emerald-700">{success}</p>
        ) : null}
      </div>
    </section>
  );
}
