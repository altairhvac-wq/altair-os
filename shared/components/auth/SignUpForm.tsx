"use client";

import { Suspense, useActionState } from "react";
import { NextRedirectField } from "./NextRedirectField";
import {
  signupAction,
  type AuthActionState,
} from "@/app/actions/auth";
import {
  AuthField,
  AuthInput,
  AuthMessage,
  AuthShell,
  AuthSubmitButton,
  AuthLink,
} from "./AuthShell";

const initialState: AuthActionState = {};

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signupAction, initialState);

  return (
    <AuthShell
      title="Create your account"
      description="Get your trades business on Altair OS — set up in minutes, built for the field."
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
        {state.error ? <AuthMessage tone="error">{state.error}</AuthMessage> : null}
        {state.success ? (
          <AuthMessage tone="success">{state.success}</AuthMessage>
        ) : null}

        <AuthField label="Full name" id="fullName">
          <AuthInput
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="Jordan Smith"
            required
          />
        </AuthField>

        <AuthField
          label="Company name"
          id="companyName"
          hint="This becomes your workspace name."
        >
          <AuthInput
            id="companyName"
            name="companyName"
            type="text"
            autoComplete="organization"
            placeholder="Smith HVAC & Plumbing"
            required
          />
        </AuthField>

        <AuthField label="Work email" id="email">
          <AuthInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
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
