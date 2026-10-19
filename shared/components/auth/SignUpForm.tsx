"use client";

import { Suspense, useActionState, useState } from "react";
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
import { TurnstileField } from "./TurnstileField";
import { isCaptchaConfigured } from "@/shared/lib/auth/captcha";
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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaPending = isCaptchaConfigured && !captchaToken;
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
          : setupInviteFlow
            ? "Join your team on Altair"
            : "Create your account"
      }
      description={
        isValidInvite
          ? "You were invited to join Altair and connect as a trusted network partner."
          : setupInviteFlow
            ? "Create your login with the email address your invitation was sent to. You'll accept the invite right after."
            : "Get your trades business on Altair OS — set up in minutes, built for the field."
      }
      footer={
        <p>
          Already have an account?{" "}
          <AuthLink href={setupInviteFlow ? "/login?next=/setup" : "/login"}>
            Sign in
          </AuthLink>
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

        {/*
          Never `required` in the browser. A founder names their workspace; a
          person joining one has nothing to name, and the server knows which
          is which (an open invite for the email makes it optional). A
          browser-level requirement would force every invitee who typed
          /signup on their own to invent a company before being told they
          already have one.
        */}
        <AuthField
          label={setupInviteFlow ? "Company name (optional)" : "Company name"}
          id="companyName"
          hint={
            setupInviteFlow
              ? "Leave this blank. Sign up with the email your invitation was sent to and you'll accept it after confirming your account."
              : "This becomes your workspace name. Invited to join an existing company? Leave this blank and use the email your invite was sent to."
          }
        >
          <AuthInput
            id="companyName"
            name="companyName"
            type="text"
            autoComplete="organization"
            placeholder="Smith HVAC & Plumbing"
            defaultValue={defaultCompanyName}
          />
        </AuthField>

        {!setupInviteFlow ? (
          <TradeSelectField disabled={pending} required={false} />
        ) : null}

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

        <TurnstileField
          action="signup"
          resetSignal={state}
          onTokenChange={setCaptchaToken}
        />

        <div className="pt-1">
          <AuthSubmitButton pending={pending} disabled={captchaPending}>
            {state.needsEmailConfirmation ? "Account created" : "Create account"}
          </AuthSubmitButton>
          <p className="mt-3 text-center text-xs leading-relaxed text-stone-500">
            By creating an account you agree to the{" "}
            <AuthLink href="/terms">Terms of Service</AuthLink> and{" "}
            <AuthLink href="/privacy">Privacy Policy</AuthLink>.
          </p>
        </div>
      </form>
    </AuthShell>
  );
}
