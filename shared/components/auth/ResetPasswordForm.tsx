"use client";

import { Suspense, useActionState } from "react";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/constants";
import { NextRedirectField } from "./NextRedirectField";
import {
  updatePasswordAction,
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

function ResetPasswordFormFields() {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    initialState,
  );

  return (
    <AuthShell
      title="Choose a new password"
      description="Set a new password for your Altair OS account."
      footer={
        <p>
          <AuthLink href="/login">Back to sign in</AuthLink>
        </p>
      }
    >
      <form action={formAction} className="space-y-5">
        <Suspense fallback={null}>
          <NextRedirectField />
        </Suspense>
        {state.error ? <AuthMessage tone="error">{state.error}</AuthMessage> : null}

        <AuthField
          label="New password"
          id="password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        >
          <AuthInput
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Enter a new password"
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </AuthField>

        <AuthField label="Confirm password" id="confirmPassword">
          <AuthInput
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </AuthField>

        <div className="pt-1">
          <AuthSubmitButton pending={pending}>Update password</AuthSubmitButton>
        </div>
      </form>
    </AuthShell>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordFormFields />
    </Suspense>
  );
}
