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
import { buttonClassName } from "@/shared/design-system/components/button-styles";

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
          ? "min-w-0 max-w-full rounded-[1rem] border border-[rgba(119,89,27,0.14)] bg-[#FFF9EA] shadow-[0_2px_8px_rgba(119,89,27,0.08)]"
          : "min-w-0 max-w-full rounded-xl border border-cyan-200 bg-cyan-50/60 shadow-sm"
      }
    >
      <div
        className={`border-b ${
          northStar ? "border-[rgba(119,89,27,0.12)]" : "border-cyan-100"
        } ${
          isSettingsCompact ? "px-3 py-3 sm:px-4" : "px-4 py-4 sm:px-6"
        }`}
      >
        <div className="flex items-start gap-2.5">
          <div
            className={`flex shrink-0 items-center justify-center rounded-lg ${
              northStar
                ? "bg-[#EFE4CB] text-[#77591B] ring-1 ring-[rgba(119,89,27,0.12)]"
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
                northStar ? "text-[#7C7259]" : "text-slate-600"
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
                  ? "gap-2.5 border-[rgba(119,89,27,0.12)] bg-[#FBF7EF]"
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
                    northStar ? "text-[#7C7259]" : "text-slate-500"
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
                className={buttonClassName(
                  "primary",
                  "md",
                  "w-full shrink-0 sm:w-auto",
                )}
              >
                <UserCheck className="h-4 w-4" aria-hidden="true" />
                {isAccepting ? "Accepting…" : "Accept invite"}
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
