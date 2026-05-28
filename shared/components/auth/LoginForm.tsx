"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { NextRedirectField } from "./NextRedirectField";
import {
  loginAction,
  type AuthActionState,
} from "@/app/actions/auth";
import { AUTH_CALLBACK_ERROR_MESSAGE } from "@/shared/lib/operational-errors";
import {
  AuthField,
  AuthInput,
  AuthMessage,
  AuthShell,
  AuthSubmitButton,
  AuthLink,
} from "./AuthShell";

const initialState: AuthActionState = {};

function LoginFormFields() {
  const searchParams = useSearchParams();
  const callbackError =
    searchParams.get("error") === "auth_callback"
      ? AUTH_CALLBACK_ERROR_MESSAGE
      : null;
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const displayError = state.error ?? callbackError;

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
        {displayError ? <AuthMessage tone="error">{displayError}</AuthMessage> : null}
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

export function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginFormFields />
    </Suspense>
  );
}
