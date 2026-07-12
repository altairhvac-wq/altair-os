"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { Mail, UserCheck } from "lucide-react";
import { acceptInviteAction } from "@/app/actions/memberships";
import { formatInviteAcceptError } from "@/shared/lib/operational-errors";
import { SettingsAlertBanner } from "./SettingsAlertBanner";
import { COMPANY_ROLE_LABELS } from "@/lib/database/types/roles";
import type { PendingTeamInvite } from "@/lib/database/queries/memberships";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { formatDateInTimeZone } from "@/shared/lib/datetime";

type PendingInvitesCardProps = {
  invites: PendingTeamInvite[];
  variant?: "setup" | "settings";
  northStar?: boolean;
};

function formatInvitedAt(
  value: string | null,
  timeZone: string,
): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return formatDateInTimeZone(date, timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PendingInvitesCard({
  invites,
  variant = "settings",
  northStar = false,
}: PendingInvitesCardProps) {
  return (
    <Suspense fallback={null}>
      <PendingInvitesCardContent
        invites={invites}
        variant={variant}
        northStar={northStar}
      />
    </Suspense>
  );
}

function PendingInvitesCardContent({
  invites,
  variant = "settings",
  northStar = false,
}: PendingInvitesCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const [items, setItems] = useState(invites);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const timeZone = useCompanyTimezone();

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

  const isSettingsCompact = variant === "settings";

  return (
    <section
      className={
        northStar
          ? "min-w-0 max-w-full rounded-[1rem] border border-[rgba(138,99,36,0.14)] bg-[#FFF9EA] shadow-[0_2px_8px_rgba(138,99,36,0.08)]"
          : "min-w-0 max-w-full rounded-xl border border-cyan-200 bg-cyan-50/60 shadow-sm"
      }
    >
      <div
        className={`border-b ${
          northStar ? "border-[rgba(138,99,36,0.12)]" : "border-cyan-100"
        } ${
          isSettingsCompact ? "px-3 py-3 sm:px-4" : "px-4 py-4 sm:px-6"
        }`}
      >
        <div className="flex items-start gap-2.5">
          <div
            className={`flex shrink-0 items-center justify-center rounded-lg ${
              northStar
                ? "bg-[#EFE4CB] text-[#8A6324] ring-1 ring-[rgba(138,99,36,0.12)]"
                : "bg-cyan-100 text-cyan-700"
            } ${
              isSettingsCompact ? "h-9 w-9" : "h-10 w-10 rounded-xl"
            }`}
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2
              className={`font-bold ${
                northStar ? "text-[#17130E]" : "text-slate-900"
              } ${
                isSettingsCompact ? "text-base" : "text-lg"
              }`}
            >
              {title}
            </h2>
            <p
              className={`${
                northStar ? "text-[#64748B]" : "text-slate-600"
              } ${
                isSettingsCompact
                  ? "mt-0.5 text-xs leading-snug"
                  : "mt-1 text-sm"
              }`}
            >
              {description}
            </p>
          </div>
        </div>
      </div>

      <div
        className={`space-y-2.5 ${
          isSettingsCompact ? "px-3 py-3 sm:px-4" : "space-y-3 px-4 py-4 sm:px-6"
        }`}
        aria-busy={isPending}
      >
        {items.map((invite) => {
          const invitedAt = formatInvitedAt(invite.invitedAt, timeZone);
          const isAccepting = isPending && acceptingId === invite.id;

          return (
            <div
              key={invite.id}
              className={`flex min-w-0 flex-col rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${
                northStar
                  ? "gap-2.5 border-[rgba(138,99,36,0.12)] bg-[#FBF7EF]"
                  : `border-white bg-white/90 ${
                      isSettingsCompact ? "gap-2.5" : "gap-3 rounded-xl p-4"
                    }`
              }`}
            >
              <div className="min-w-0">
                <p
                  className={`truncate text-base font-semibold ${
                    northStar ? "text-[#17130E]" : "text-slate-900"
                  }`}
                >
                  {invite.companyName}
                </p>
                <p
                  className={`mt-1 text-sm ${
                    northStar ? "text-[#4F4638]" : "text-slate-600"
                  }`}
                >
                  Role: {COMPANY_ROLE_LABELS[invite.role] ?? invite.role}
                </p>
                <p
                  className={`mt-1 break-words text-xs ${
                    northStar ? "text-[#64748B]" : "text-slate-500"
                  }`}
                >
                  Invited as {invite.inviteEmail}
                  {invitedAt ? ` · ${invitedAt}` : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleAccept(invite.id, invite.companyName)}
                disabled={isPending}
                className={
                  northStar
                    ? "inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-[#E6D092] bg-gradient-to-b from-[#E6D092] from-0% via-[#C9A44D] via-[45%] to-[#B88A2E] to-100% px-4 py-2.5 text-sm font-semibold text-[#17130E] shadow-[0_2px_10px_rgba(138,99,36,0.28)] transition hover:from-[#F0E4B8] hover:via-[#D4B05A] hover:to-[#9A7028] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    : "inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                }
              >
                <UserCheck className="h-4 w-4" aria-hidden="true" />
                {isAccepting ? "Accepting..." : "Accept invite"}
              </button>
            </div>
          );
        })}

        {error ? (
          <SettingsAlertBanner tone="error" northStar={northStar}>
            {error}
          </SettingsAlertBanner>
        ) : null}

        {success ? (
          <SettingsAlertBanner tone="success" northStar={northStar}>
            {success}
          </SettingsAlertBanner>
        ) : null}
      </div>
    </section>
  );
}
