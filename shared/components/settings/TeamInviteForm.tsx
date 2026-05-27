"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy, UserPlus } from "lucide-react";
import { inviteTeamMemberAction } from "@/app/actions/memberships";
import { getInvitableTeamRoles } from "@/lib/database/services/member-role-guard";
import type { CompanyRole } from "@/lib/database/types/enums";
import type { TeamMember } from "@/shared/types/team-member";
import { RoleSelectorField } from "./RoleSelectorField";
import { SettingsAlertBanner } from "./SettingsAlertBanner";

type TeamInviteFormProps = {
  currentUserRole: CompanyRole;
  onMemberInvited: (member: TeamMember) => void;
};

export function TeamInviteForm({
  currentUserRole,
  onMemberInvited,
}: TeamInviteFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CompanyRole>(() => {
    const roles = getInvitableTeamRoles(currentUserRole);
    return roles.includes("technician") ? "technician" : roles[0] ?? "technician";
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const invitableRoles = useMemo(
    () => getInvitableTeamRoles(currentUserRole),
    [currentUserRole],
  );

  function clearFeedback() {
    setError(null);
    setSuccess(null);
    setCopied(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();

    const trimmedEmail = email.trim();

    if (!trimmedEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    startTransition(async () => {
      const result = await inviteTeamMemberAction(trimmedEmail, role);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.member) {
        onMemberInvited(result.member);
        setEmail("");
        setSuccess(
          `Invitation created for ${result.member.email}. They can sign up or log in with that email to accept.`,
        );
      } else {
        setError("Failed to create invitation.");
      }
    });
  }

  async function handleCopyInstructions() {
    const trimmedEmail = email.trim();
    const inviteText = trimmedEmail
      ? `You've been invited to Altair OS. Sign up or log in at the app URL using ${trimmedEmail} to accept your team invitation.`
      : "You've been invited to Altair OS. Sign up or log in at the app URL using the invited email to accept your team invitation.";

    try {
      await navigator.clipboard.writeText(inviteText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (invitableRoles.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        aria-label="Invite team member"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-cyan-600" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-slate-900">
            Invite team member
          </h3>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,220px)]">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                clearFeedback();
              }}
              placeholder="name@company.com"
              required
              disabled={isPending}
              className="w-full min-h-[44px] rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60"
            />
          </label>

          <RoleSelectorField
            id="invite-role"
            value={role}
            roles={invitableRoles}
            onChange={(nextRole) => {
              setRole(nextRole);
              clearFeedback();
            }}
            disabled={isPending}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={isPending || email.trim().length === 0}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Creating invite..." : "Create invite"}
          </button>

          <button
            type="button"
            onClick={handleCopyInstructions}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            {copied ? "Copied invite message" : "Copy invite instructions"}
          </button>
        </div>

        <p className="text-xs leading-relaxed text-slate-500">
          Email delivery is not enabled yet. Share the invite message manually,
          or ask teammates to sign up with the invited email — pending invites
          appear on their setup screen.
        </p>

        {error ? (
          <SettingsAlertBanner tone="error">{error}</SettingsAlertBanner>
        ) : null}

        {success ? (
          <SettingsAlertBanner tone="success">{success}</SettingsAlertBanner>
        ) : null}
      </form>
    </div>
  );
}
