"use client";

import { useActionState } from "react";
import {
  loginAction,
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

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <AuthShell
      title="Sign in"
      description="Access your Altair OS command center."
      footer={
        <p className="text-slate-600">
          Need an account? <AuthLink href="/signup">Create one</AuthLink>
        </p>
      }
    >
      <form action={formAction} className="space-y-4">
        {state.error ? <AuthMessage tone="error">{state.error}</AuthMessage> : null}
        {state.success ? (
          <AuthMessage tone="success">{state.success}</AuthMessage>
        ) : null}

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
            autoComplete="current-password"
            required
          />
        </AuthField>

        <AuthSubmitButton pending={pending}>Sign in</AuthSubmitButton>
      </form>
    </AuthShell>
  );
}
