"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { sanitizeNextPath } from "@/lib/auth/redirects";
import { listPublicSaasCatalogPlans } from "@/lib/saas-billing/catalog";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";
import { AuthLink } from "./AuthShell";
import { GearMotif } from "./GearMotif";

type LoginPageShellProps = {
  children: ReactNode;
  heroPanel: ReactNode;
  /**
   * `login` is /login as it has always been. `landing` is the same screen
   * serving as the logged-out homepage: it sits under the fixed site nav
   * (so the panels start 4.25rem down and the panel's own logo header is
   * not needed), greets a stranger rather than a returning user, and puts
   * the free-trial button right under the form.
   */
  variant?: "login" | "landing";
};

// 4.25rem below is HomepageNav's height; Tailwind needs the literal classes.
export function LoginPageShell({ children, heroPanel, variant = "login" }: LoginPageShellProps) {
  const landing = variant === "landing";
  // On the homepage the product statement in the hero panel is the h1.
  const WelcomeHeading = landing ? "h2" : "h1";
  return (
    <div
      className={[
        "flex min-h-dvh flex-col bg-[#0a0b09] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(390px,35vw)] lg:items-start",
        landing ? "pt-[4.25rem]" : "",
      ].join(" ")}
    >
      <main
        className={[
          "login-access-panel relative flex min-w-0 flex-col overflow-x-clip border-l border-white/[0.06] bg-[#0e100d] text-white lg:fixed lg:right-0 lg:z-20 lg:w-[35vw] lg:min-w-[390px] lg:overflow-x-hidden lg:overflow-y-auto",
          landing
            ? "min-h-[calc(100dvh-4.25rem)] lg:top-[4.25rem] lg:h-[calc(100dvh-4.25rem)]"
            : "min-h-dvh lg:top-0 lg:h-dvh",
        ].join(" ")}
      >
        <div className="auth-grid pointer-events-none absolute inset-0 opacity-35" />
        <div className="auth-noise pointer-events-none absolute inset-0 opacity-20" />
        <GearMotif className="absolute -bottom-40 -right-40 h-[26rem] w-[26rem] opacity-[0.06]" />
        <div className="pointer-events-none absolute -right-28 top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(194,160,90,0.09)_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(116,106,81,0.07)_0%,transparent_72%)]" />

        <div className="relative flex min-h-full flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top,0px))] sm:px-8 sm:py-8 lg:justify-center lg:px-8 lg:py-8 xl:px-12">
          {landing ? null : (
            <header className="flex items-center justify-between border-b border-white/[0.07] pb-4 lg:hidden">
              <AltairLogo variant="white" size="md" showWordmark />
              <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-[#c2a05a]" />
                Workspace access
              </span>
            </header>
          )}

          <div className="auth-panel-enter mx-auto mt-7 w-full min-w-0 max-w-[440px] lg:mt-0">
            {landing ? null : (
              <div className="mb-8 hidden flex-col items-center text-center lg:flex">
                <AltairLogo variant="white" size="lg" showWordmark />
              </div>
            )}

            {landing ? <PhoneIntro /> : null}

            <WelcomeHeading className="text-[2rem] font-semibold leading-none tracking-[-0.04em] text-white sm:text-[2.25rem]">
              {landing ? "Welcome." : "Welcome back."}
            </WelcomeHeading>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {landing
                ? "Sign in, or start a free 14-day trial. No credit card."
                : "Sign in to access your operating center."}
            </p>

            <section
              id="sign-in-form"
              aria-label="Sign in to Altair Operating System"
              className="mt-7 scroll-mt-6 rounded-[1.35rem] border border-white/[0.1] bg-white/[0.045] p-5 shadow-[0_28px_70px_-32px_rgba(0,0,0,0.85),0_0_0_1px_rgba(194,160,90,0.04)_inset] backdrop-blur-xl sm:p-6"
            >
              {children}
            </section>

            {landing ? (
              <Link
                href="/signup"
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#a4823a] px-5 py-3 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e100d]"
              >
                Start Your 14-Day Free Trial
              </Link>
            ) : null}

            <Suspense fallback={null}>
              <LoginPageFooter />
            </Suspense>

            <p className="mt-10 text-center text-[9px] uppercase tracking-[0.12em] text-slate-400">
              © {new Date().getFullYear()} Altair Operating System. All rights reserved.
            </p>
          </div>
        </div>
      </main>

      <div className="min-w-0 lg:col-start-1 lg:row-start-1">{heroPanel}</div>
    </div>
  );
}

/**
 * Phones only. On a phone the homepage's first screen is the sign-in form
 * and the product explanation sits below it, so a first-time visitor from a
 * video link saw a login box and nothing about what Altair is (2026-11-10
 * audit: 81% of homepage visits left without a second click). This says
 * what it is, the trial terms and where to read more, above the form.
 * Desktop already shows the hero panel beside the form.
 */
function PhoneIntro() {
  const prices = listPublicSaasCatalogPlans()
    .map((plan) => plan.monthlyPriceUsd)
    .filter((price): price is number => typeof price === "number");
  const fromPrice = prices.length ? Math.min(...prices) : null;
  return (
    <div className="mb-8 border-b border-white/[0.08] pb-7 lg:hidden">
      <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-[#c2a05a]">
        HVAC and field service software
      </p>
      <p className="mt-3 text-[1.65rem] font-semibold leading-[1.1] tracking-[-0.035em] text-white">
        Run jobs, dispatch, estimates and invoices from one place.
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        Built for HVAC and service companies. The office and the technicians see the same job, and
        the finished job becomes the invoice.
      </p>
      <Link
        href="/signup"
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#a4823a] px-5 py-3 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e100d]"
      >
        Start Your 14-Day Free Trial
      </Link>
      <p className="mt-2 text-center text-xs text-slate-400">
        No credit card.{fromPrice !== null ? ` Plans from $${fromPrice}/month after the trial.` : ""}
      </p>
      <Link
        href="/hvac-software"
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-[#c2a05a]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55"
      >
        See what it does
      </Link>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Already a customer? Sign in below.</p>
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
