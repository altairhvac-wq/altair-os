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
import { TradeSelectField } from "./TradeSelectField";

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
        current: 1,
        total: 1,
        label: "Company workspace",
      }}
      title="Launch your workspace"
      description="One step — then Altair guides you from first customer to first invoice."
      aboveCard={aboveCard}
    >
      <form action={formAction} className="space-y-5" aria-busy={pending}>
        <Suspense fallback={null}>
          <NextRedirectField />
        </Suspense>
        {state.error ? <AuthMessage tone="error">{state.error}</AuthMessage> : null}

        <div className="rounded-lg border border-slate-100 bg-white px-4 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            What happens next
          </p>
          <ul className="mt-2.5 space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-500" />
              Your workspace is created instantly
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-500" />
              Mission Control shows a short guided checklist
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-500" />
              Add a customer, schedule a job, then invoice when ready
            </li>
          </ul>
        </div>

        {aboveCard ? (
          <div className="relative py-1">
            <div className="absolute inset-x-0 top-1/2 border-t border-slate-200" />
            <p className="relative mx-auto w-fit bg-white px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Or create your own workspace
            </p>
          </div>
        ) : null}

        <AuthField
          label="Company name"
          id="companyName"
          hint="Use your real business name — at least 2 characters."
        >
          <AuthInput
            id="companyName"
            name="companyName"
            type="text"
            autoComplete="organization"
            placeholder="Your company name"
            required
            minLength={2}
            disabled={pending}
          />
        </AuthField>

        <TradeSelectField disabled={pending} />

        <div className="pt-1">
          <AuthSubmitButton pending={pending}>
            Launch workspace
          </AuthSubmitButton>
        </div>
      </form>
    </AuthShell>
  );
}
