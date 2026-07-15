"use client";

import { ShieldCheck, Sparkles } from "lucide-react";
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

export function LoginPageShell({
  children,
  heroPanel,
}: LoginPageShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#050b14] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(390px,36vw)] lg:items-start">
      <div className="order-2 min-w-0 lg:order-1">{heroPanel}</div>

      <main className="login-access-panel relative order-1 flex min-h-dvh min-w-0 flex-col overflow-hidden bg-[#eef3f8] lg:sticky lg:top-0 lg:order-2 lg:h-dvh">
        <div className="login-access-grid pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -right-28 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(201,164,77,0.12)_0%,rgba(201,164,77,0.025)_45%,transparent_72%)]" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(71,85,105,0.11)_0%,rgba(71,85,105,0.02)_48%,transparent_72%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9a44d]/45 to-transparent" />

        <div className="relative flex min-h-full flex-1 flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top,0px))] sm:px-8 sm:py-8 lg:justify-center lg:px-8 lg:py-8 xl:px-12">
          <header className="flex items-center justify-between border-b border-slate-200/80 pb-4 lg:hidden">
            <AltairLogo variant="primary" size="md" showWordmark />
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Workspace access
            </span>
          </header>

          <div className="auth-panel-enter mx-auto mt-6 w-full min-w-0 max-w-[440px] lg:mt-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c9a44d]/20 bg-white/75 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7a5a07] shadow-sm backdrop-blur-sm">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Altair workspace
            </div>

            <h1 className="mt-5 text-[2rem] font-semibold leading-none tracking-[-0.035em] text-slate-950 sm:text-[2.25rem]">
              Welcome back.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
              Sign in to pick up where your team left off and keep today&apos;s work moving.
            </p>

            <section
              id="sign-in-form"
              aria-label="Sign in to Altair OS"
              className="mt-6 scroll-mt-6 overflow-hidden rounded-[1.35rem] border border-slate-200/90 bg-white/95 shadow-[0_20px_55px_-28px_rgba(15,23,42,0.38),0_8px_22px_-14px_rgba(15,23,42,0.2),0_0_0_1px_rgba(255,255,255,0.7)_inset] backdrop-blur-xl"
            >
              <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 bg-slate-50/75 px-5 py-4 sm:px-6">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a6324]">
                    Secure sign in
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    Access your operating center
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200/80 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                  Protected
                </span>
              </div>
              <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
            </section>

            <Suspense fallback={null}>
              <LoginPageFooter />
            </Suspense>

            <p className="mt-6 text-center text-[10px] uppercase tracking-[0.12em] text-slate-400">
              © {new Date().getFullYear()} Altair · Built for trades and field service
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function LoginPageFooter() {
  const searchParams = useSearchParams();
  const next = sanitizeNextPath(searchParams.get("next"));
  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";

  return (
    <div className="mt-5 flex flex-col items-center justify-center gap-2 text-center text-sm text-slate-500 sm:flex-row sm:gap-3">
      <p>
        New to Altair?{" "}
        <AuthLink href={signupHref}>Create an account</AuthLink>
      </p>
      <span className="hidden text-slate-300 sm:inline" aria-hidden="true">
        ·
      </span>
      <AuthLink href="/pricing">View pricing</AuthLink>
    </div>
  );
}
