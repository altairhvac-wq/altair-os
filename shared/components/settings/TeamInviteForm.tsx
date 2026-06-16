"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy, UserPlus } from "lucide-react";
import { inviteTeamMemberAction } from "@/app/actions/memberships";
import { getInvitableTeamRoles } from "@/lib/database/services/member-role-guard";
import type { CompanyRole } from "@/lib/database/types/enums";
import type { TeamMember } from "@/shared/types/team-member";
import { isValidEmail } from "@/shared/lib/email-validation";
import { buildTeamInviteShareTextFromOrigin } from "@/shared/lib/team-invite-link";
import { AdminPendingLabel } from "@/shared/design-system/components";
import { adminFormInputClass } from "@/shared/lib/admin-density";
import { RoleSelectorField } from "./RoleSelectorField";
import { SettingsAlertBanner } from "./SettingsAlertBanner";

type TeamInviteFormProps = {
  currentUserRole: CompanyRole;
  onMemberInvited: (member: TeamMember) => void;
  /** When true, form body is hidden until expanded (mobile settings). */
  collapsible?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};

type FeedbackTone = "success" | "warning" | "error";

type FeedbackState = {
  tone: FeedbackTone;
  message: string;
} | null;

export function TeamInviteForm({
  currentUserRole,
  onMemberInvited,
  collapsible = false,
  expanded = true,
  onExpandedChange,
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
        setFeedback({ tone: "error", message: "We couldn't create this invitation. Try again." });
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
            "Invite saved, but email isn't set up yet. Copy the invite link below or ask your office admin to configure email in Settings.",
        });
        return;
      }

      setFeedback({
        tone: "warning",
        message:
          "Invite saved, but the email could not be sent. Copy the invite link below and share it with your teammate.",
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

  if (collapsible && !expanded) {
    return null;
  }

  return (
    <div
      className={`min-w-0 max-w-full border-b border-slate-100 px-3 py-3 sm:px-6 sm:py-4 ${
        collapsible ? "md:px-6 md:py-4" : ""
      }`}
    >
      <form
        onSubmit={handleSubmit}
        className="min-w-0 space-y-3 sm:space-y-4"
        aria-label="Invite team member"
        aria-busy={isPending}
      >
        {!collapsible ? (
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-cyan-600" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-slate-900">
              Invite team member
            </h3>
          </div>
        ) : null}

        <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,220px)]">
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
              className={`${adminFormInputClass} shadow-sm disabled:opacity-60`}
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
            compact
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <button
            type="submit"
            disabled={isPending || email.trim().length === 0}
            className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 admin-btn-primary sm:min-h-[44px] sm:w-auto disabled:cursor-not-allowed"
          >
            <AdminPendingLabel
              pending={isPending}
              pendingLabel="Sending invite…"
              idleLabel="Send invite"
            />
          </button>

          <button
            type="button"
            onClick={handleCopyInstructions}
            disabled={isPending}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 admin-btn-secondary sm:min-h-[44px] sm:w-auto disabled:cursor-not-allowed"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            {copied ? "Copied invite link" : "Copy invite link"}
          </button>

          {collapsible && onExpandedChange ? (
            <button
              type="button"
              onClick={() => onExpandedChange(false)}
              className="inline-flex min-h-10 w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 sm:hidden"
            >
              Cancel
            </button>
          ) : null}
        </div>

        <p className="hidden text-xs leading-relaxed text-slate-500 sm:block">
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
