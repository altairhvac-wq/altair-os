"use client";

import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Suspense, useActionState, useState } from "react";
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
  AuthSubmitButton,
  AuthLink,
} from "./AuthShell";

const initialState: AuthActionState = {};

export function LoginFormFields() {
  const searchParams = useSearchParams();
  const callbackError =
    searchParams.get("error") === "auth_callback"
      ? AUTH_CALLBACK_ERROR_MESSAGE
      : null;
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const displayError = state.error ?? callbackError;

  return (
    <form action={formAction} className="space-y-4">
      <Suspense fallback={null}>
        <NextRedirectField />
      </Suspense>
      {displayError ? <AuthMessage tone="error">{displayError}</AuthMessage> : null}
      {state.success ? (
        <AuthMessage tone="success">{state.success}</AuthMessage>
      ) : null}

      <AuthField label="Work email" id="email">
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <AuthInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@company.com"
            className="border-white/10 bg-white/[0.035] pl-10 text-slate-100 placeholder:text-slate-500 hover:border-white/20"
            required
          />
        </div>
      </AuthField>

      <div>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="password" className="block text-sm font-medium text-stone-700">
            Password
          </label>
          <AuthLink href="/forgot-password" variant="dark">Forgot password?</AuthLink>
        </div>
        <div className="relative mt-1.5">
          <LockKeyhole
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <AuthInput
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            className="border-white/10 bg-white/[0.035] pl-10 pr-12 text-slate-100 placeholder:text-slate-500 hover:border-white/20"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute inset-y-0 right-0 flex min-h-11 w-12 items-center justify-center rounded-r-lg text-slate-400 transition-colors hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c9a44d]/40"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div className="pt-2">
        <AuthSubmitButton pending={pending} variant="gold">
          <span>Sign in</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </AuthSubmitButton>
      </div>
    </form>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginFormFields />
    </Suspense>
  );
}
