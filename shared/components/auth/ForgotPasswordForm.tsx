"use client";

import { useActionState } from "react";
import {
  requestPasswordResetAction,
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

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  return (
    <AuthShell
      title="Reset your password"
      description="Enter the email address for your account. We will send reset instructions if an account exists."
      footer={
        <p>
          Remember your password?{" "}
          <AuthLink href="/login">Back to sign in</AuthLink>
        </p>
      }
    >
      <form action={formAction} className="space-y-5">
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

        <div className="pt-1">
          <AuthSubmitButton pending={pending}>Send reset link</AuthSubmitButton>
        </div>
      </form>
    </AuthShell>
  );
}
