"use client";

import { useActionState } from "react";
import {
  setupCompanyAction,
  type AuthActionState,
} from "@/app/actions/auth";
import {
  AuthField,
  AuthInput,
  AuthMessage,
  AuthShell,
  AuthSubmitButton,
} from "./AuthShell";

const initialState: AuthActionState = {};

export function CompanySetupForm() {
  const [state, formAction, pending] = useActionState(
    setupCompanyAction,
    initialState,
  );

  return (
    <AuthShell
      title="Finish setup"
      description="Create your company workspace to start using Altair OS."
    >
      <form action={formAction} className="space-y-4">
        {state.error ? <AuthMessage tone="error">{state.error}</AuthMessage> : null}

        <AuthField label="Company name" id="companyName">
          <AuthInput
            id="companyName"
            name="companyName"
            type="text"
            autoComplete="organization"
            required
          />
        </AuthField>

        <AuthSubmitButton pending={pending}>Create company</AuthSubmitButton>
      </form>
    </AuthShell>
  );
}
