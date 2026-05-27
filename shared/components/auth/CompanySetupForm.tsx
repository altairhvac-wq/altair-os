"use client";

import type { ReactNode } from "react";
import { Suspense, useActionState } from "react";
import { NextRedirectField } from "./NextRedirectField";
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

type CompanySetupFormProps = {
  aboveCard?: ReactNode;
};

export function CompanySetupForm({ aboveCard }: CompanySetupFormProps) {
  const [state, formAction, pending] = useActionState(
    setupCompanyAction,
    initialState,
  );

  return (
    <AuthShell
      variant="onboarding"
      onboardingStep={{
        current: 2,
        total: 2,
        label: "Company workspace",
      }}
      title="Set up your workspace"
      description="One last step — name your company to unlock dispatch, jobs, and your field team."
      aboveCard={aboveCard}
    >
      <form action={formAction} className="space-y-5">
        <Suspense fallback={null}>
          <NextRedirectField />
        </Suspense>
        {state.error ? <AuthMessage tone="error">{state.error}</AuthMessage> : null}

        <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            What happens next
          </p>
          <ul className="mt-2.5 space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-500" />
              Your company workspace is created instantly
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-500" />
              You&apos;re routed to your command center
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-500" />
              Invite technicians and start dispatching
            </li>
          </ul>
        </div>

        <AuthField
          label="Company name"
          id="companyName"
          hint="Use your real business name — at least 2 characters. You can change this later."
        >
          <AuthInput
            id="companyName"
            name="companyName"
            type="text"
            autoComplete="organization"
            placeholder="Your company name"
            required
            minLength={2}
          />
        </AuthField>

        <div className="pt-1">
          <AuthSubmitButton pending={pending}>
            Launch workspace
          </AuthSubmitButton>
        </div>
      </form>
    </AuthShell>
  );
}
