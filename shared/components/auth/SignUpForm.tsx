"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { NextRedirectField } from "./NextRedirectField";
import {
  signupAction,
  type AuthActionState,
} from "@/app/actions/auth";
import { sanitizeNextPath } from "@/lib/auth/redirects";
import {
  AuthField,
  AuthInput,
  AuthMessage,
  AuthShell,
  AuthSubmitButton,
  AuthLink,
} from "./AuthShell";
import { TradeSelectField } from "./TradeSelectField";
import type { PublicNetworkInvitePreview } from "@/shared/types/network-invite";

const initialState: AuthActionState = {};

type SignUpFormProps = {
  inviteToken?: string | null;
  invitePreview?: PublicNetworkInvitePreview | null;
};

export function SignUpForm({
  inviteToken,
  invitePreview,
}: SignUpFormProps) {
  const searchParams = useSearchParams();
  const setupInviteFlow = sanitizeNextPath(searchParams.get("next")) === "/setup";
  const [state, formAction, pending] = useActionState(signupAction, initialState);
  const isValidInvite = invitePreview?.state === "valid";
  const defaultCompanyName =
    isValidInvite && invitePreview?.invitedCompanyName
      ? invitePreview.invitedCompanyName
      : undefined;
  const defaultEmail =
    isValidInvite && invitePreview?.invitedEmail
      ? invitePreview.invitedEmail
      : undefined;
  const defaultFullName =
    isValidInvite && invitePreview?.invitedContactName
      ? invitePreview.invitedContactName
      : undefined;

  return (
    <AuthShell
      title={
        isValidInvite && invitePreview?.sourceCompanyName
          ? `Join Altair with ${invitePreview.sourceCompanyName}`
          : "Create your account"
      }
      description={
        isValidInvite
          ? "You were invited to join Altair and connect as a trusted network partner."
          : "Get your trades business on Altair OS — set up in minutes, built for the field."
      }
      footer={
        <p>
          Already have an account?{" "}
          <AuthLink href="/login">Sign in</AuthLink>
        </p>
      }
    >
      <form action={formAction} className="space-y-5">
        <Suspense fallback={null}>
          <NextRedirectField />
        </Suspense>
        {inviteToken ? (
          <input type="hidden" name="inviteToken" value={inviteToken} />
        ) : null}
        {state.error ? <AuthMessage tone="error">{state.error}</AuthMessage> : null}
        {state.success ? (
          <AuthMessage tone="success">{state.success}</AuthMessage>
        ) : null}

        {invitePreview && invitePreview.state !== "valid" ? (
          <AuthMessage tone="error">
            {invitePreview.state === "expired"
              ? "This invitation has expired. Ask your partner to send a new invite."
              : invitePreview.state === "accepted"
                ? "This invitation has already been used."
                : "This invitation link is invalid."}
          </AuthMessage>
        ) : null}

        {isValidInvite && invitePreview?.personalMessage ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Message from {invitePreview.sourceCompanyName}
            </p>
            <p className="mt-2 whitespace-pre-wrap">{invitePreview.personalMessage}</p>
          </div>
        ) : null}

        <AuthField label="Full name" id="fullName">
          <AuthInput
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="Jordan Smith"
            defaultValue={defaultFullName}
            required
          />
        </AuthField>

        <AuthField
          label={setupInviteFlow ? "Company name (optional)" : "Company name"}
          id="companyName"
          hint={
            setupInviteFlow
              ? "Skip this if you were invited by a company — use the same email from your invite and accept it after confirming your account."
              : "This becomes your workspace name."
          }
        >
          <AuthInput
            id="companyName"
            name="companyName"
            type="text"
            autoComplete="organization"
            placeholder="Smith HVAC & Plumbing"
            defaultValue={defaultCompanyName}
            required={!setupInviteFlow}
          />
        </AuthField>

        {!setupInviteFlow ? <TradeSelectField disabled={pending} /> : null}

        <AuthField
          label="Work email"
          id="email"
          hint={
            defaultEmail
              ? "This email is locked to your invitation and cannot be changed."
              : undefined
          }
        >
          <AuthInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            defaultValue={defaultEmail}
            readOnly={Boolean(defaultEmail)}
            required
          />
        </AuthField>

        <AuthField
          label="Password"
          id="password"
          hint="At least 6 characters."
        >
          <AuthInput
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a secure password"
            minLength={6}
            required
          />
        </AuthField>

        <div className="pt-1">
          <AuthSubmitButton pending={pending}>
            {state.needsEmailConfirmation ? "Account created" : "Create account"}
          </AuthSubmitButton>
        </div>
      </form>
    </AuthShell>
  );
}
