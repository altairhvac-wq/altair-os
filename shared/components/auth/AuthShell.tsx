"use client";

import Link from "next/link";
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
import { AltairLogo } from "@/shared/components/brand/AltairLogo";

const OPERATIONAL_SNAPSHOT = [
  { label: "Active jobs", value: "24", status: "live" },
  { label: "Crews deployed", value: "8", status: "live" },
  { label: "On-time rate", value: "94%", status: "steady" },
] as const;

const PLATFORM_TIERS = [
  {
    tier: "Core Operations",
    tagline: "Dispatch & field execution",
    accent: "border-[#D4AF37]/20",
    labelColor: "text-[#D4AF37]",
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
    accent: "border-[#D4AF37]/14",
    labelColor: "text-[#9A7209]",
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
    accent: "border-[#D4AF37]/14",
    labelColor: "text-[#9A7209]",
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
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#0A0A0A]">
      <div className="auth-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="auth-grid-fine pointer-events-none absolute inset-0 opacity-50" />
      <div className="auth-noise pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -left-24 -top-20 h-[480px] w-[480px] bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.18)_0%,rgba(212,175,55,0.06)_38%,transparent_72%)]" />
      <div className="pointer-events-none absolute left-[28%] top-[38%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.1)_0%,rgba(154,114,9,0.04)_45%,transparent_70%)]" />
      <div className="pointer-events-none absolute -bottom-28 right-8 h-96 w-96 bg-[radial-gradient(circle_at_center,rgba(154,114,9,0.12)_0%,rgba(212,175,55,0.04)_40%,transparent_68%)]" />
      <div className="pointer-events-none absolute bottom-[22%] left-[12%] h-56 w-56 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0%,transparent_65%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_75%_at_50%_42%,transparent_0%,rgba(10,10,10,0.35)_58%,rgba(10,10,10,0.82)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

      <div className="relative z-10 flex h-full min-h-0 flex-col px-8 py-8 lg:px-10 lg:py-10 xl:px-12">
        <div className="auth-hero-enter shrink-0">
          <AltairLogo
            variant="white"
            size="lg"
            showWordmark
            className="drop-shadow-[0_2px_16px_rgba(212,175,55,0.18)]"
          />

          <div className="mt-8 max-w-lg xl:mt-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D4AF37]/90">
              Operational command center
            </p>
            <h2 className="mt-3 text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-white xl:text-[2rem]">
              Run field operations with precision.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-400">
              Dispatch crews, manage jobs, and keep every technician connected —
              from the office to the job site.
            </p>
          </div>
        </div>

        <div className="auth-hero-enter mt-6 shrink-0 rounded-2xl border border-[#D4AF37]/34 bg-gradient-to-b from-[#242019] via-[#1C1A17] to-[#12100D] p-4 shadow-[0_16px_52px_rgba(0,0,0,0.58),0_6px_18px_rgba(0,0,0,0.38),0_0_0_1px_rgba(212,175,55,0.06),inset_0_1px_0_rgba(245,230,163,0.2)] xl:mt-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Radio className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden="true" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
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
                className="rounded-lg border border-[#D4AF37]/20 bg-gradient-to-b from-[#FFFCF6] via-[#FAF7F0] to-[#F3EDE2] px-3 py-2.5 shadow-[inset_0_2px_5px_rgba(0,0,0,0.08),0_6px_16px_rgba(0,0,0,0.32),0_2px_6px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.94)]"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-stone-600">
                  {metric.label}
                </p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums tracking-tight text-[#0A0A0A]">
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
              className={`auth-tier auth-feature group rounded-2xl border border-[#D4AF37]/22 bg-gradient-to-b from-[#FDF9F0] via-[#FAF7F0] to-[#F4EFE4] p-3.5 shadow-[0_14px_44px_rgba(0,0,0,0.42),0_5px_14px_rgba(0,0,0,0.24),0_0_0_1px_rgba(212,175,55,0.07),inset_0_1px_0_rgba(255,255,255,0.96)] transition-[border-color,box-shadow] duration-200 hover:border-[#D4AF37]/32 hover:shadow-[0_18px_50px_rgba(0,0,0,0.46),0_6px_16px_rgba(0,0,0,0.26),0_0_0_1px_rgba(212,175,55,0.1),inset_0_1px_0_rgba(255,255,255,0.98)] ${platform.accent}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${platform.labelColor}`}
                  >
                    {platform.tier}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">{platform.tagline}</p>
                </div>
                <ClipboardList
                  className="h-3.5 w-3.5 shrink-0 text-stone-400 transition-colors group-hover:text-[#9A7209]"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {platform.features.map((feature) => (
                  <div key={feature.title} className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <feature.icon
                        className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]/90"
                        aria-hidden="true"
                      />
                      <p className="truncate text-xs font-semibold text-[#0A0A0A]">
                        {feature.title}
                      </p>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-stone-600">
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
    <div className="flex items-center justify-between gap-3 border-b border-stone-200/80 pb-5 lg:hidden">
      <AltairLogo variant="primary" size="sm" showWordmark />
      <p className="text-right text-[10px] font-medium uppercase tracking-[0.12em] text-stone-400">
        Command center
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
        <span className="rounded-full bg-[#D4AF37]/10 px-2 py-0.5 text-[#9A7209]">
          {label}
        </span>
      </div>
      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#9A7209] to-[#D4AF37] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function AuthPageSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 lg:h-dvh lg:flex-row lg:overflow-hidden">
      <div className="relative hidden min-h-0 flex-1 bg-[#0A0A0A] lg:block lg:max-w-[58%]">
        <div className="auth-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative flex h-full flex-col justify-between px-10 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-24 rounded-md bg-neutral-800/80" />
            <div className="space-y-3 pt-2">
              <div className="h-2 w-32 rounded bg-neutral-800/60" />
              <div className="h-7 w-64 rounded bg-neutral-800" />
              <div className="h-4 w-full max-w-sm rounded bg-neutral-800/50" />
            </div>
          </div>
          <div className="animate-pulse space-y-3">
            <div className="h-24 rounded-xl bg-neutral-900/80" />
            <div className="h-28 rounded-xl bg-neutral-900/60" />
            <div className="h-28 rounded-xl bg-neutral-900/60" />
          </div>
        </div>
      </div>

      <div className="auth-panel-bg flex min-h-0 flex-1 flex-col bg-gradient-to-b from-stone-50/90 via-white to-stone-100/50">
        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="w-full max-w-[400px] animate-pulse space-y-5">
            <div className="space-y-2">
              <div className="h-7 w-44 rounded-lg bg-stone-100" />
              <div className="h-4 w-full rounded bg-stone-50" />
            </div>
            <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
              <div className="space-y-4">
                <div className="h-10 rounded-lg bg-stone-50" />
                <div className="h-10 rounded-lg bg-stone-50" />
                <div className="h-11 rounded-lg bg-stone-100" />
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
    <div className="flex min-h-dvh flex-col bg-stone-50 lg:h-dvh lg:flex-row lg:overflow-hidden">
      <div className="hidden min-h-0 flex-1 lg:flex lg:max-w-[58%]">
        <AuthHeroPanel />
      </div>

      <div className="auth-panel-enter auth-panel-bg relative flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-y-auto bg-gradient-to-br from-[#FAF7F2] via-[#FFFBF7] to-[#EDE8DF]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_85%_15%,rgba(212,175,55,0.07)_0%,transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_10%_90%,rgba(154,114,9,0.05)_0%,transparent_50%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/25 to-transparent lg:hidden" />

        <div className="relative flex min-h-full flex-1 flex-col justify-center px-4 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top,0px))] sm:px-8 sm:pb-8 sm:pt-8 lg:justify-start lg:px-10 lg:pb-10 lg:pt-[clamp(2.5rem,11vh,5.5rem)] xl:px-14">
          <div className="mx-auto w-full min-w-0 max-w-[420px]">
            <AuthMobileBrand />

            {variant === "onboarding" && onboardingStep ? (
              <div className="mt-5 lg:mt-0">
                <OnboardingProgress {...onboardingStep} />
              </div>
            ) : null}

            <div
              className={
                variant === "onboarding" && onboardingStep ? "" : "mt-5 lg:mt-0"
              }
            >
              <h1 className="text-[1.75rem] font-semibold tracking-tight text-[#0A0A0A] sm:text-[1.875rem]">
                {title}
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
                {description}
              </p>
            </div>

            {aboveCard ? (
              <div className="mt-4 min-w-0 space-y-4">{aboveCard}</div>
            ) : null}

            <div className="mt-4 rounded-2xl border border-stone-200/80 border-t-[3px] border-t-[#D4AF37]/65 bg-gradient-to-b from-white via-[#FFFCF8] to-[#FAF7F2] p-5 shadow-[0_4px_8px_rgba(10,10,10,0.06),0_12px_32px_rgba(10,10,10,0.1),0_32px_64px_rgba(154,114,9,0.1),0_0_28px_rgba(212,175,55,0.06)] ring-1 ring-[#D4AF37]/20 sm:p-6">
              {children}
            </div>

            {footer ? (
              <div className="mt-5 text-center text-sm text-stone-500">{footer}</div>
            ) : null}

            <p className="mt-6 hidden text-center text-[11px] tracking-wide text-stone-400 lg:block">
              © {new Date().getFullYear()} Altair · Built for trades and field service
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
      <label htmlFor={id} className="block text-sm font-medium text-stone-700">
        {label}
      </label>
      {hint ? (
        <p className="mt-0.5 text-xs text-stone-400">{hint}</p>
      ) : null}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function AuthInput(props: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-[#0A0A0A] shadow-sm shadow-black/[0.02] outline-none transition-all duration-200 placeholder:text-stone-400 hover:border-stone-300 focus:border-[#B8860B] focus:ring-4 focus:ring-[#D4AF37]/10 focus-visible:border-[#B8860B] focus-visible:ring-4 focus-visible:ring-[#D4AF37]/10 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-60 ${props.className ?? ""}`}
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
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0A0A0A] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(10,10,10,0.22),0_4px_18px_rgba(212,175,55,0.2),0_0_22px_rgba(212,175,55,0.1),inset_0_1px_0_rgba(245,230,163,0.14)] ring-1 ring-[#D4AF37]/30 transition-all duration-200 hover:bg-[#141414] hover:shadow-[0_1px_2px_rgba(10,10,10,0.22),0_6px_22px_rgba(212,175,55,0.26),0_0_26px_rgba(212,175,55,0.14),inset_0_1px_0_rgba(245,230,163,0.16)] hover:ring-[#D4AF37]/42 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none disabled:active:scale-100"
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
      className="font-semibold text-[#9A7209] underline-offset-4 transition-colors hover:text-[#7A5A07] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/30"
    >
      {children}
    </Link>
  );
}
