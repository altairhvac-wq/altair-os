"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Mail, UserCheck } from "lucide-react";
import { acceptIncomingNetworkInviteAction } from "@/app/actions/network-invites";
import { formatDate } from "@/shared/types/customer";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { IncomingNetworkInvite } from "@/shared/types/network-invite";
import { st, type NetworkSurface } from "./north-star-m11/network-north-star-styles";

type IncomingNetworkInvitesCardProps = {
  invites: IncomingNetworkInvite[];
  canAccept: boolean;
  timeZone?: string;
  variant?: "banner" | "section";
  surface?: NetworkSurface;
};

export function IncomingNetworkInvitesCard({
  invites,
  canAccept,
  timeZone,
  variant = "section",
  surface = "legacy",
}: IncomingNetworkInvitesCardProps) {
  const router = useRouter();
  const [items, setItems] = useState(invites);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isNorthStar = surface === "north-star";

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

  const acceptButtonClass = isNorthStar
    ? `${st.panelActionAccent} min-h-[44px] px-4 py-2.5 sm:min-h-[44px]`
    : "inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60";

  if (variant === "banner" && items.length === 1) {
    const invite = items[0];
    const isAccepting = isPending && acceptingId === invite.id;

    const bannerClass = isNorthStar
      ? "rounded-[1rem] border border-[rgba(201,164,77,0.28)] bg-[#FFF9EA] p-4 shadow-[0_2px_12px_rgba(138,99,36,0.10)]"
      : "rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-4 shadow-sm";
    const titleClass = isNorthStar
      ? "text-sm font-semibold text-[#17130E]"
      : "text-sm font-semibold text-slate-900";
    const bodyClass = isNorthStar
      ? "mt-1 text-xs text-[#6B6255]"
      : "mt-1 text-xs text-slate-600";

    return (
      <section className={bannerClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className={titleClass}>
              You&apos;ve been invited to connect with {invite.sourceCompanyName}.
            </p>
            <p className={bodyClass}>
              Accept to add both companies as trusted network partners.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleAccept(invite)}
            disabled={isPending || !canAccept}
            className={acceptButtonClass}
          >
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            {isAccepting ? "Accepting..." : "Accept Invitation"}
          </button>
        </div>
        {!canAccept ? (
          <p className={`mt-2 text-xs ${isNorthStar ? "text-[#6B6255]" : "text-slate-500"}`}>
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

  const sectionClass = isNorthStar
    ? "min-w-0 max-w-full rounded-[1.25rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] shadow-[0_2px_12px_rgba(138,99,36,0.08)]"
    : "min-w-0 max-w-full rounded-xl border border-cyan-200 bg-cyan-50/60 shadow-sm";
  const headerClass = isNorthStar
    ? "border-b border-[rgba(138,99,36,0.12)] bg-[#F5F0E4] px-4 py-4 sm:px-6"
    : "border-b border-cyan-100 px-4 py-4 sm:px-6";
  const iconWrapClass = isNorthStar
    ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFE4CB] text-[#8A6324] ring-1 ring-[rgba(138,99,36,0.12)]"
    : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700";
  const headingClass = isNorthStar
    ? "text-lg font-bold text-[#17130E]"
    : "text-lg font-bold text-slate-900";
  const subheadingClass = isNorthStar
    ? "mt-1 text-sm text-[#6B6255]"
    : "mt-1 text-sm text-slate-600";
  const cardClass = isNorthStar
    ? "rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] p-4"
    : "rounded-xl border border-white bg-white/90 p-4";

  return (
    <section className={sectionClass}>
      <div className={headerClass}>
        <div className="flex items-start gap-2.5">
          <div className={iconWrapClass}>
            <Mail className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className={headingClass}>Incoming Invitations</h2>
            <p className={subheadingClass}>
              Network invitations sent to your email address for this workspace.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4 sm:px-6" aria-busy={isPending}>
        {items.map((invite) => {
          const isAccepting = isPending && acceptingId === invite.id;

          return (
            <article key={invite.id} className={cardClass}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className={isNorthStar ? st.cardPrimary : "text-sm font-bold text-slate-900"}>
                    {invite.sourceCompanyName}
                  </p>
                  <p className={isNorthStar ? `mt-1 ${st.cardSecondary}` : "mt-1 text-xs text-slate-600"}>
                    Invited {invite.invitedCompanyName} · {invite.invitedEmail}
                  </p>
                  <dl
                    className={
                      isNorthStar
                        ? "mt-3 grid gap-2 text-xs text-[#4F4638] sm:grid-cols-2"
                        : "mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2"
                    }
                  >
                    <div>
                      <dt className={isNorthStar ? "font-semibold text-[#4F4638]" : "font-semibold text-slate-700"}>
                        Trade
                      </dt>
                      <dd>{invite.tradeCategory}</dd>
                    </div>
                    <div>
                      <dt className={isNorthStar ? "font-semibold text-[#4F4638]" : "font-semibold text-slate-700"}>
                        Sent
                      </dt>
                      <dd>{formatDate(invite.createdAt, timeZone)}</dd>
                    </div>
                  </dl>
                  {invite.personalMessage ? (
                    <p
                      className={
                        isNorthStar
                          ? "mt-3 rounded-lg bg-[#FBF7EF] px-3 py-2 text-xs text-[#4F4638] ring-1 ring-[rgba(138,99,36,0.10)]"
                          : "mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"
                      }
                    >
                      {invite.personalMessage}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => handleAccept(invite)}
                  disabled={isPending || !canAccept}
                  className={`${acceptButtonClass} w-full sm:w-auto`}
                >
                  <UserCheck className="h-4 w-4" aria-hidden="true" />
                  {isAccepting ? "Accepting..." : "Accept"}
                </button>
              </div>
            </article>
          );
        })}

        {!canAccept ? (
          <p className={`text-xs ${isNorthStar ? "text-[#6B6255]" : "text-slate-500"}`}>
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
