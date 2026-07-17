"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { sanitizeNextPath } from "@/lib/auth/redirects";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";
import { AuthLink } from "./AuthShell";

type LoginPageShellProps = {
  children: ReactNode;
  heroPanel: ReactNode;
};

export function LoginPageShell({ children, heroPanel }: LoginPageShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#050b14] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(390px,35vw)] lg:items-start">
      <main className="login-access-panel relative flex min-h-dvh min-w-0 flex-col overflow-x-clip border-l border-white/[0.06] bg-[#07101d] text-white lg:fixed lg:right-0 lg:top-0 lg:z-20 lg:h-dvh lg:w-[35vw] lg:min-w-[390px] lg:overflow-x-hidden lg:overflow-y-auto">
        <div className="auth-grid pointer-events-none absolute inset-0 opacity-35" />
        <div className="auth-noise pointer-events-none absolute inset-0 opacity-20" />
        <div className="pointer-events-none absolute -right-28 top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(201,164,77,0.09)_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(14,116,144,0.07)_0%,transparent_72%)]" />

        <div className="relative flex min-h-full flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top,0px))] sm:px-8 sm:py-8 lg:justify-center lg:px-8 lg:py-8 xl:px-12">
          <header className="flex items-center justify-between border-b border-white/[0.07] pb-4 lg:hidden">
            <AltairLogo variant="white" size="md" showWordmark />
            <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c9a44d]" />
              Workspace access
            </span>
          </header>

          <div className="auth-panel-enter mx-auto mt-7 w-full min-w-0 max-w-[440px] lg:mt-0">
            <div className="mb-8 hidden flex-col items-center text-center lg:flex">
              <AltairLogo variant="white" size="lg" showWordmark />
            </div>

            <h1 className="text-[2rem] font-semibold leading-none tracking-[-0.04em] text-white sm:text-[2.25rem]">
              Welcome back.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Sign in to access your operating center.
            </p>

            <section
              id="sign-in-form"
              aria-label="Sign in to Altair OS"
              className="mt-7 scroll-mt-6 rounded-[1.35rem] border border-white/[0.1] bg-white/[0.045] p-5 shadow-[0_28px_70px_-32px_rgba(0,0,0,0.85),0_0_0_1px_rgba(201,164,77,0.04)_inset] backdrop-blur-xl sm:p-6"
            >
              {children}
            </section>

            <Suspense fallback={null}>
              <LoginPageFooter />
            </Suspense>

            <p className="mt-10 text-center text-[9px] uppercase tracking-[0.12em] text-slate-400">
              © {new Date().getFullYear()} Altair OS. All rights reserved.
            </p>
          </div>
        </div>
      </main>

      <div className="min-w-0 lg:col-start-1 lg:row-start-1">{heroPanel}</div>
    </div>
  );
}

function LoginPageFooter() {
  const searchParams = useSearchParams();
  const next = sanitizeNextPath(searchParams.get("next"));
  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";

  return (
    <div className="mt-6 flex flex-col items-center justify-center gap-2 text-center text-sm text-slate-400 sm:flex-row sm:gap-3">
      <p>
        New to Altair?{" "}
        <AuthLink href={signupHref} variant="dark">Create an account</AuthLink>
      </p>
      <span className="hidden text-slate-600 sm:inline" aria-hidden="true">
        ·
      </span>
      <AuthLink href="/pricing" variant="dark">View pricing</AuthLink>
    </div>
  );
}
