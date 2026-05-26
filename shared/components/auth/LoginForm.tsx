"use client";

import { Suspense, useActionState } from "react";
import { NextRedirectField } from "./NextRedirectField";
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
      title="Welcome back"
      description="Sign in to your command center — dispatch, jobs, and field teams in one place."
      footer={
        <p>
          New to Altair OS?{" "}
          <AuthLink href="/signup">Create an account</AuthLink>
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

        <AuthField label="Password" id="password">
          <AuthInput
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
          />
        </AuthField>

        <div className="pt-1">
          <AuthSubmitButton pending={pending}>Sign in</AuthSubmitButton>
        </div>
      </form>
    </AuthShell>
  );
}
