"use client";

import { useActionState } from "react";
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
      description="Set up Altair OS for your trades business."
      footer={
        <p className="text-slate-600">
          Already have an account? <AuthLink href="/login">Sign in</AuthLink>
        </p>
      }
    >
      <form action={formAction} className="space-y-4">
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
            required
          />
        </AuthField>

        <AuthField label="Company name" id="companyName">
          <AuthInput
            id="companyName"
            name="companyName"
            type="text"
            autoComplete="organization"
            required
          />
        </AuthField>

        <AuthField label="Email" id="email">
          <AuthInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </AuthField>

        <AuthField label="Password" id="password">
          <AuthInput
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </AuthField>

        <AuthSubmitButton pending={pending}>
          {state.needsEmailConfirmation ? "Account created" : "Create account"}
        </AuthSubmitButton>
      </form>
    </AuthShell>
  );
}
