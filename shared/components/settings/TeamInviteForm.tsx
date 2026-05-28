"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy, UserPlus } from "lucide-react";
import { inviteTeamMemberAction } from "@/app/actions/memberships";
import { getInvitableTeamRoles } from "@/lib/database/services/member-role-guard";
import type { CompanyRole } from "@/lib/database/types/enums";
import type { TeamMember } from "@/shared/types/team-member";
import { isValidEmail } from "@/shared/lib/email-validation";
import { buildTeamInviteShareTextFromOrigin } from "@/shared/lib/team-invite-link";
import { RoleSelectorField } from "./RoleSelectorField";
import { SettingsAlertBanner } from "./SettingsAlertBanner";

type TeamInviteFormProps = {
  currentUserRole: CompanyRole;
  onMemberInvited: (member: TeamMember) => void;
};

type FeedbackTone = "success" | "warning" | "error";

type FeedbackState = {
  tone: FeedbackTone;
  message: string;
} | null;

export function TeamInviteForm({
  currentUserRole,
  onMemberInvited,
}: TeamInviteFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CompanyRole>(() => {
    const roles = getInvitableTeamRoles(currentUserRole);
    return roles.includes("technician") ? "technician" : roles[0] ?? "technician";
  });
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const invitableRoles = useMemo(
    () => getInvitableTeamRoles(currentUserRole),
    [currentUserRole],
  );

  function clearFeedback() {
    setFeedback(null);
    setCopied(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) {
      return;
    }

    clearFeedback();

    const trimmedEmail = email.trim();

    if (!isValidEmail(trimmedEmail)) {
      setFeedback({ tone: "error", message: "Enter a valid email address." });
      return;
    }

    startTransition(async () => {
      const result = await inviteTeamMemberAction(trimmedEmail, role);

      if (result.error) {
        setFeedback({ tone: "error", message: result.error });
        return;
      }

      if (!result.member) {
        setFeedback({ tone: "error", message: "Failed to create invitation." });
        return;
      }

      onMemberInvited(result.member);
      setEmail("");

      if (result.emailDelivery?.status === "sent") {
        setFeedback({ tone: "success", message: "Invite sent." });
        return;
      }

      if (result.emailDelivery?.status === "not_configured") {
        setFeedback({
          tone: "warning",
          message:
            result.emailDelivery.message ??
            "Invite created, but email could not be sent. Copy the invite link or check email setup.",
        });
        return;
      }

      setFeedback({
        tone: "warning",
        message:
          result.emailDelivery?.message ??
          "Invite created, but email could not be sent. Copy the invite link or check email setup.",
      });
    });
  }

  async function handleCopyInstructions() {
    if (isPending) {
      return;
    }

    const trimmedEmail = email.trim();

    if (!isValidEmail(trimmedEmail)) {
      setFeedback({
        tone: "error",
        message: "Enter an email address before copying invite instructions.",
      });
      return;
    }

    const inviteText = buildTeamInviteShareTextFromOrigin(
      window.location.origin,
      trimmedEmail,
    );

    try {
      await navigator.clipboard.writeText(inviteText);
      setCopied(true);
    } catch {
      setCopied(false);
      setFeedback({
        tone: "error",
        message: "Could not copy invite instructions. Copy the link manually.",
      });
    }
  }

  if (invitableRoles.length === 0) {
    return null;
  }

  return (
    <div className="min-w-0 max-w-full border-b border-slate-100 px-4 py-4 sm:px-6">
      <form
        onSubmit={handleSubmit}
        className="min-w-0 space-y-4"
        aria-label="Invite team member"
        aria-busy={isPending}
      >
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-cyan-600" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-slate-900">
            Invite team member
          </h3>
        </div>

        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,220px)]">
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

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <button
            type="submit"
            disabled={isPending || email.trim().length === 0}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isPending ? "Sending invite..." : "Send invite"}
          </button>

          <button
            type="button"
            onClick={handleCopyInstructions}
            disabled={isPending}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            {copied ? "Copied invite link" : "Copy invite link"}
          </button>
        </div>

        <p className="text-xs leading-relaxed text-slate-500">
          Invites are saved immediately. Email is sent only when Resend is
          configured; otherwise copy the invite link for the teammate. Pending
          invites also appear on their setup screen after they sign up with the
          invited email.
        </p>

        {feedback ? (
          <SettingsAlertBanner tone={feedback.tone}>
            {feedback.message}
          </SettingsAlertBanner>
        ) : null}
      </form>
    </div>
  );
}
