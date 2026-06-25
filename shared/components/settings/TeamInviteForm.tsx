"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy, UserPlus } from "lucide-react";
import { inviteTeamMemberAction } from "@/app/actions/memberships";
import { getInvitableTeamRoles } from "@/lib/database/services/member-role-guard";
import type { CompanyRole } from "@/lib/database/types/enums";
import type { TeamMember } from "@/shared/types/team-member";
import { isValidEmail } from "@/shared/lib/email-validation";
import { buildTeamInviteShareTextFromOrigin } from "@/shared/lib/team-invite-link";
import { getTeamRoleDescription } from "@/shared/lib/team-role-descriptions";
import { AdminPendingLabel } from "@/shared/design-system/components";
import { adminFormInputClass } from "@/shared/lib/admin-density";
import { st } from "@/shared/components/settings/north-star-m10/settings-north-star-styles";
import { RoleSelectorField } from "./RoleSelectorField";
import { SettingsAlertBanner } from "./SettingsAlertBanner";

type TeamInviteFormProps = {
  currentUserRole: CompanyRole;
  onMemberInvited: (member: TeamMember) => void;
  /** When true, form body is hidden until expanded (mobile settings). */
  collapsible?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  northStar?: boolean;
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
  northStar = false,
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

  const roleDescription = getTeamRoleDescription(role);
  const inviteActions = (
    <>
      <button
        type="submit"
        disabled={isPending || email.trim().length === 0}
        className={
          northStar
            ? `${st.saveButton} gap-1.5 disabled:cursor-not-allowed`
            : "inline-flex min-h-10 w-full items-center justify-center gap-1.5 admin-btn-primary sm:min-h-[44px] sm:w-auto disabled:cursor-not-allowed"
        }
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
        className={
          northStar
            ? `${st.secondaryAction} min-h-10 w-full sm:min-h-[44px] sm:w-auto disabled:cursor-not-allowed disabled:opacity-60`
            : "inline-flex min-h-10 w-full items-center justify-center gap-2 admin-btn-secondary sm:min-h-[44px] sm:w-auto disabled:cursor-not-allowed"
        }
      >
        <Copy className="h-4 w-4" aria-hidden="true" />
        {copied ? "Copied invite link" : "Copy invite link"}
      </button>

      {collapsible && onExpandedChange ? (
        <button
          type="button"
          onClick={() => onExpandedChange(false)}
          className={`inline-flex min-h-10 w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition sm:hidden ${
            northStar
              ? "text-[#4F4638] hover:bg-[#F3EBDD]"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          Cancel
        </button>
      ) : null}
    </>
  );

  const emailField = (
    <label className="block min-w-0">
      <span
        className={`mb-1 block text-xs font-semibold uppercase tracking-wide ${
          northStar ? "text-[#4F4638]" : "text-slate-500"
        }`}
      >
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
        className={`${
          northStar ? st.formInput : adminFormInputClass
        } shadow-sm disabled:opacity-60`}
      />
    </label>
  );

  return (
    <div
      className={`min-w-0 max-w-full border-b ${
        northStar
          ? "border-[rgba(138,99,36,0.12)] px-3 py-2.5 sm:px-4 sm:py-3"
          : "border-slate-100 px-3 py-3 sm:px-6 sm:py-4"
      } ${collapsible ? (northStar ? "md:px-4 md:py-3" : "md:px-6 md:py-4") : ""}`}
    >
      <form
        onSubmit={handleSubmit}
        className={`min-w-0 ${northStar ? "space-y-2" : "space-y-3 sm:space-y-4"}`}
        aria-label="Invite team member"
        aria-busy={isPending}
      >
        {!collapsible ? (
          <div className="flex items-center gap-2">
            <UserPlus
              className={`h-4 w-4 ${northStar ? "text-[#8A6324]" : "text-cyan-600"}`}
              aria-hidden="true"
            />
            <h3
              className={`text-sm font-semibold ${
                northStar ? "text-[#17130E]" : "text-slate-900"
              }`}
            >
              Invite team member
            </h3>
          </div>
        ) : null}

        {northStar ? (
          <>
            <div className="hidden min-w-0 md:flex md:flex-wrap md:items-end md:gap-x-2.5 md:gap-y-2">
              <div className="min-w-0 flex-1 basis-[min(100%,12rem)]">
                {emailField}
              </div>

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
                showDescription={false}
                northStar={northStar}
                className="w-full shrink-0 md:w-[11rem]"
              />

              <div className="flex w-full shrink-0 flex-wrap items-center gap-2 md:w-auto">
                {inviteActions}
              </div>
            </div>

            {roleDescription ? (
              <div
                className="hidden min-w-0 md:block"
                aria-live="polite"
                aria-atomic="true"
              >
                <p className="text-xs leading-snug text-[#4F4638]">
                  {roleDescription.summary}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-[#64748B]">
                  {roleDescription.access}
                </p>
              </div>
            ) : null}

            <div className="grid min-w-0 gap-2.5 md:hidden">
              {emailField}

              <RoleSelectorField
                id="invite-role-mobile"
                value={role}
                roles={invitableRoles}
                onChange={(nextRole) => {
                  setRole(nextRole);
                  clearFeedback();
                }}
                disabled={isPending}
                compact
                descriptionLayout="inline"
                northStar={northStar}
              />

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                {inviteActions}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,220px)]">
              {emailField}

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
                northStar={northStar}
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              {inviteActions}
            </div>
          </>
        )}

        <p
          className={`text-xs ${
            northStar
              ? "hidden leading-snug text-[#64748B] lg:block"
              : "hidden leading-relaxed text-slate-500 sm:block"
          }`}
        >
          Invites are saved immediately. Email is sent only when Resend is
          configured; otherwise copy the invite link for the teammate. Pending
          invites also appear on their setup screen after they sign up with the
          invited email.
        </p>

        {feedback ? (
          <SettingsAlertBanner tone={feedback.tone} northStar={northStar}>
            {feedback.message}
          </SettingsAlertBanner>
        ) : null}
      </form>
    </div>
  );
}
