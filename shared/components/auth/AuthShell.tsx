"use client";

import Link from "next/link";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MapPin,
  Network,
  Radio,
  Smartphone,
  TrendingUp,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

const OPERATIONAL_SNAPSHOT = [
  { label: "Active jobs", value: "24", status: "live" },
  { label: "Crews deployed", value: "8", status: "live" },
  { label: "On-time rate", value: "94%", status: "steady" },
] as const;

const PLATFORM_TIERS = [
  {
    tier: "Core Operations",
    tagline: "Dispatch & field execution",
    accent: "border-cyan-500/20 bg-cyan-500/[0.04]",
    labelColor: "text-cyan-400",
    features: [
      {
        icon: MapPin,
        title: "Dispatch",
        description: "Assign, route, and track crews in real time.",
      },
      {
        icon: Smartphone,
        title: "Technician Mobile",
        description: "Field-ready workflows built for crews on the move.",
      },
    ],
  },
  {
    tier: "Pro Analytics",
    tagline: "Operational intelligence",
    accent: "border-slate-500/20 bg-white/[0.02]",
    labelColor: "text-slate-300",
    features: [
      {
        icon: BarChart3,
        title: "Live Dashboards",
        description: "Revenue, utilization, and job flow at a glance.",
      },
      {
        icon: TrendingUp,
        title: "Performance Insights",
        description: "Spot bottlenecks from first call to final invoice.",
      },
    ],
  },
  {
    tier: "Network Platform",
    tagline: "Connected field ecosystem",
    accent: "border-slate-500/20 bg-white/[0.02]",
    labelColor: "text-slate-300",
    features: [
      {
        icon: Network,
        title: "Partner Network",
        description: "Connect offices, subs, and customers in one system.",
      },
      {
        icon: Users,
        title: "Multi-Office Sync",
        description: "Coordinate teams and capacity across locations.",
      },
    ],
  },
] as const;

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  aboveCard?: ReactNode;
  footer?: ReactNode;
  variant?: "default" | "onboarding";
  onboardingStep?: {
    current: number;
    total: number;
    label: string;
  };
};

function AuthHeroPanel() {
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-slate-950">
      <div className="auth-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="auth-grid-fine pointer-events-none absolute inset-0 opacity-50" />
      <div className="auth-noise pointer-events-none absolute inset-0 opacity-40" />
      <div className="auth-glow-primary pointer-events-none absolute -left-32 -top-24 h-[420px] w-[420px]" />
      <div className="auth-glow-secondary pointer-events-none absolute -bottom-32 right-0 h-80 w-80" />

      <div className="relative z-10 flex h-full min-h-0 flex-col px-8 py-8 lg:px-10 lg:py-10 xl:px-12">
        <div className="auth-hero-enter shrink-0">
          <div className="flex flex-col items-start">
            <AltairLogo variant="gold" size="md" showWordmark />
            <p className="mt-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
              Field operations platform
            </p>
          </div>

          <div className="mt-8 max-w-lg xl:mt-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-500/90">
              Operational command center
            </p>
            <h2 className="mt-3 text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-white xl:text-[2rem]">
              Run field operations with precision.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-400">
              Dispatch crews, manage jobs, and keep every technician connected —
              from the office to the job site.
            </p>
          </div>
        </div>

        <div className="auth-hero-enter mt-6 shrink-0 rounded-xl border border-white/[0.08] bg-slate-900/50 p-4 backdrop-blur-sm xl:mt-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Radio className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Live operations
              </span>
            </div>
            <span className="auth-metric-pulse flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-emerald-400/90">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Systems nominal
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {OPERATIONAL_SNAPSHOT.map((metric) => (
              <div
                key={metric.label}
                className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  {metric.label}
                </p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums tracking-tight text-white">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pb-1 xl:mt-7">
          {PLATFORM_TIERS.map((platform) => (
            <div
              key={platform.tier}
              className={`auth-tier auth-feature group rounded-xl border p-3.5 backdrop-blur-sm transition-colors duration-200 hover:border-white/[0.14] ${platform.accent}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${platform.labelColor}`}
                  >
                    {platform.tier}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{platform.tagline}</p>
                </div>
                <ClipboardList
                  className="h-3.5 w-3.5 shrink-0 text-slate-600 transition-colors group-hover:text-slate-400"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {platform.features.map((feature) => (
                  <div key={feature.title} className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <feature.icon
                        className="h-3.5 w-3.5 shrink-0 text-cyan-400/90"
                        aria-hidden="true"
                      />
                      <p className="truncate text-xs font-semibold text-white">
                        {feature.title}
                      </p>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-slate-500">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthMobileBrand() {
  return (
    <div className="mb-1 flex flex-col items-center text-center lg:hidden">
      <AltairLogo variant="gold" size="md" showWordmark />
      <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
        Field operations platform
      </p>
    </div>
  );
}

function OnboardingProgress({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label: string;
}) {
  const progress = Math.round((current / total) * 100);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-slate-500">
          Step {current} of {total}
        </span>
        <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-cyan-700">
          {label}
        </span>
      </div>
      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-cyan-600 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function AuthPageSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col bg-white lg:h-dvh lg:flex-row lg:overflow-hidden">
      <div className="relative hidden min-h-0 flex-1 bg-slate-950 lg:block lg:max-w-[58%]">
        <div className="auth-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative flex h-full flex-col justify-between px-10 py-10">
          <div className="animate-pulse space-y-6">
            <div className="flex flex-col items-start gap-2.5 opacity-60">
              <AltairLogo variant="gold" size="md" showWordmark />
              <div className="h-2 w-36 rounded bg-slate-800/70" />
            </div>
            <div className="space-y-3 pt-2">
              <div className="h-2 w-32 rounded bg-slate-800/60" />
              <div className="h-7 w-64 rounded bg-slate-800" />
              <div className="h-4 w-full max-w-sm rounded bg-slate-800/50" />
            </div>
          </div>
          <div className="animate-pulse space-y-3">
            <div className="h-24 rounded-xl bg-slate-900/80" />
            <div className="h-28 rounded-xl bg-slate-900/60" />
            <div className="h-28 rounded-xl bg-slate-900/60" />
          </div>
        </div>
      </div>

      <div className="auth-panel-bg flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="w-full max-w-[400px] animate-pulse space-y-5">
            <div className="flex flex-col items-center opacity-50 lg:hidden">
              <AltairLogo variant="gold" size="md" showWordmark />
              <div className="mt-2 h-2 w-32 rounded bg-slate-100" />
            </div>
            <div className="space-y-2">
              <div className="h-7 w-44 rounded-lg bg-slate-100" />
              <div className="h-4 w-full rounded bg-slate-50" />
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="space-y-4">
                <div className="h-10 rounded-lg bg-slate-50" />
                <div className="h-10 rounded-lg bg-slate-50" />
                <div className="h-11 rounded-lg bg-slate-100" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthShell({
  title,
  description,
  children,
  aboveCard,
  footer,
  variant = "default",
  onboardingStep,
}: AuthShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-white lg:h-dvh lg:flex-row lg:overflow-hidden">
      <div className="hidden min-h-0 flex-1 lg:flex lg:max-w-[58%]">
        <AuthHeroPanel />
      </div>

      <div className="auth-panel-enter auth-panel-bg flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-y-auto">
        <div className="flex min-h-full flex-1 flex-col justify-center px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top,0px))] sm:px-8 sm:pt-8 lg:px-10 lg:py-10 xl:px-14">
          <div className="mx-auto w-full min-w-0 max-w-[400px]">
            <AuthMobileBrand />

            {variant === "onboarding" && onboardingStep ? (
              <div className="mt-6 lg:mt-0">
                <OnboardingProgress {...onboardingStep} />
              </div>
            ) : null}

            <div
              className={
                variant === "onboarding" && onboardingStep ? "" : "mt-6 lg:mt-0"
              }
            >
              <h1 className="text-[1.625rem] font-semibold tracking-tight text-slate-900">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {description}
              </p>
            </div>

            {aboveCard ? (
              <div className="mt-6 min-w-0 space-y-4">{aboveCard}</div>
            ) : null}

            <div className="mt-6 rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.02] sm:p-6">
              {children}
            </div>

            {footer ? (
              <div className="mt-5 text-center text-sm text-slate-500">{footer}</div>
            ) : null}

            <p className="mt-8 hidden text-center text-[11px] text-slate-400 lg:block">
              © {new Date().getFullYear()} Altair OS · Built for trades and field service
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthField({
  label,
  id,
  hint,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {hint ? (
        <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
      ) : null}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function AuthInput(props: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-900/[0.02] outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 focus-visible:border-cyan-500 focus-visible:ring-4 focus-visible:ring-cyan-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 ${props.className ?? ""}`}
    />
  );
}

export function AuthSubmitButton({
  pending,
  children,
}: {
  pending?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-cyan-900/20 transition-all duration-200 hover:bg-cyan-700 hover:shadow-md hover:shadow-cyan-900/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none disabled:active:scale-100"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Please wait…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function AuthMessage({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: ReactNode;
}) {
  const isError = tone === "error";
  const styles = isError
    ? "border-red-200/80 bg-red-50 text-red-700"
    : "border-emerald-200/80 bg-emerald-50 text-emerald-800";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${styles}`}
      role="alert"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

export function AuthLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-semibold text-cyan-700 underline-offset-4 transition-colors hover:text-cyan-800 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30"
    >
      {children}
    </Link>
  );
}
