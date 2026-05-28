"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { Mail, UserCheck } from "lucide-react";
import { acceptInviteAction } from "@/app/actions/memberships";
import { formatInviteAcceptError } from "@/shared/lib/operational-errors";
import { SettingsAlertBanner } from "./SettingsAlertBanner";
import { COMPANY_ROLE_LABELS } from "@/lib/database/types/roles";
import type { PendingTeamInvite } from "@/lib/database/queries/memberships";

type PendingInvitesCardProps = {
  invites: PendingTeamInvite[];
  variant?: "setup" | "settings";
};

function formatInvitedAt(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PendingInvitesCard({
  invites,
  variant = "settings",
}: PendingInvitesCardProps) {
  return (
    <Suspense fallback={null}>
      <PendingInvitesCardContent invites={invites} variant={variant} />
    </Suspense>
  );
}

function PendingInvitesCardContent({
  invites,
  variant = "settings",
}: PendingInvitesCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const [items, setItems] = useState(invites);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) {
    return null;
  }

  function handleAccept(membershipId: string, companyName: string) {
    if (isPending) {
      return;
    }

    setError(null);
    setSuccess(null);
    setAcceptingId(membershipId);

    startTransition(async () => {
      const result = await acceptInviteAction(membershipId, nextPath);

      if (result.error) {
        setError(formatInviteAcceptError(result.error));
        setAcceptingId(null);
        return;
      }

      setItems((previous) =>
        previous.filter((invite) => invite.id !== membershipId),
      );
      setSuccess(`Invite accepted · You joined ${companyName}.`);
      setAcceptingId(null);
      router.refresh();

      if (variant === "setup") {
        router.push(result.redirectPath ?? "/");
      }
    });
  }

  const title =
    variant === "setup" ? "You have a team invitation" : "Pending invitations";
  const description =
    variant === "setup"
      ? "Accept to join an existing company, or create your own workspace below."
      : "Accept an invitation to join another company workspace.";

  return (
    <section className="min-w-0 max-w-full rounded-2xl border border-cyan-200 bg-cyan-50/60 shadow-sm">
      <div className="border-b border-cyan-100 px-4 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
            <Mail className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4 sm:px-6" aria-busy={isPending}>
        {items.map((invite) => {
          const invitedAt = formatInvitedAt(invite.invitedAt);
          const isAccepting = isPending && acceptingId === invite.id;

          return (
            <div
              key={invite.id}
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-white bg-white/90 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-900">
                  {invite.companyName}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Role: {COMPANY_ROLE_LABELS[invite.role] ?? invite.role}
                </p>
                <p className="mt-1 break-words text-xs text-slate-500">
                  Invited as {invite.inviteEmail}
                  {invitedAt ? ` · ${invitedAt}` : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleAccept(invite.id, invite.companyName)}
                disabled={isPending}
                className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <UserCheck className="h-4 w-4" aria-hidden="true" />
                {isAccepting ? "Accepting..." : "Accept invite"}
              </button>
            </div>
          );
        })}

        {error ? (
          <SettingsAlertBanner tone="error">{error}</SettingsAlertBanner>
        ) : null}

        {success ? (
          <SettingsAlertBanner tone="success">{success}</SettingsAlertBanner>
        ) : null}
      </div>
    </section>
  );
}
