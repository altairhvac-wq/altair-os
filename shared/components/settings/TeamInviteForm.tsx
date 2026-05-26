"use client";

import { useMemo, useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { inviteTeamMemberAction } from "@/app/actions/memberships";
import { getInvitableTeamRoles } from "@/lib/database/services/member-role-guard";
import type { CompanyRole } from "@/lib/database/types/enums";
import {
  formatTeamMemberRole,
  type TeamMember,
} from "@/shared/types/team-member";

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
  const [isPending, startTransition] = useTransition();

  const invitableRoles = useMemo(
    () => getInvitableTeamRoles(currentUserRole),
    [currentUserRole],
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await inviteTeamMemberAction(email, role);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.member) {
        onMemberInvited(result.member);
        setEmail("");
        setSuccess(`Invitation created for ${result.member.email}.`);
      } else {
        setError("Failed to create invitation.");
      }
    });
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

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
                setSuccess(null);
              }}
              placeholder="name@company.com"
              required
              disabled={isPending}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Role
            </span>
            <select
              value={role}
              onChange={(event) => {
                setRole(event.target.value as CompanyRole);
                setError(null);
                setSuccess(null);
              }}
              disabled={isPending}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60"
            >
              {invitableRoles.map((option) => (
                <option key={option} value={option}>
                  {formatTeamMemberRole(option)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={isPending || email.trim().length === 0}
            className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Sending..." : "Send invite"}
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Invitations are saved as pending memberships. Email delivery is not
          enabled yet.
        </p>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}
      </form>
    </div>
  );
}
