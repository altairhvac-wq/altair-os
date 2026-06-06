import Link from "next/link";
import {
  BarChart3,
  Bot,
  CalendarClock,
  Check,
  CreditCard,
  FileCheck,
  Receipt,
  Smartphone,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";
import { SeeAltairInActionSection } from "@/shared/components/marketing/SeeAltairInActionSection";
import {
  FOUNDING_BETA_OFFER,
  FOUNDING_PLANS,
} from "@/shared/data/founding-pricing";

export const LOGIN_HERO_TITLE =
  "Run Your Entire Service Business From One Platform";

export const LOGIN_HERO_SUBCOPY =
  "Altair OS brings dispatch, customers, jobs, estimates, invoices, payments, equipment, technician workflows, reporting, and AI-powered operations tools into one modern platform.";

const FEATURE_HIGHLIGHTS: { label: string; icon: LucideIcon }[] = [
  { label: "Dispatch & Scheduling", icon: CalendarClock },
  { label: "Customer 360", icon: Users },
  { label: "Estimates & Approvals", icon: FileCheck },
  { label: "Invoices & Payments", icon: Receipt },
  { label: "Technician Mobile App", icon: Smartphone },
  { label: "Equipment Tracking", icon: Wrench },
  { label: "Reporting & Business Review", icon: BarChart3 },
  { label: "AI Assistants", icon: Bot },
];

const ctaFocusClass =
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/20";

function MarketingBackdrop() {
  return (
    <>
      <div className="auth-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="auth-grid-fine pointer-events-none absolute inset-0 opacity-50" />
      <div className="auth-noise pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -left-24 -top-20 h-[480px] w-[480px] bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.18)_0%,rgba(212,175,55,0.06)_38%,transparent_72%)]" />
      <div className="pointer-events-none absolute left-[28%] top-[38%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.1)_0%,rgba(154,114,9,0.04)_45%,transparent_70%)]" />
      <div className="pointer-events-none absolute -bottom-28 right-8 h-96 w-96 bg-[radial-gradient(circle_at_center,rgba(154,114,9,0.12)_0%,rgba(212,175,55,0.04)_40%,transparent_68%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_75%_at_50%_42%,transparent_0%,rgba(10,10,10,0.35)_58%,rgba(10,10,10,0.82)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
    </>
  );
}

function BetaOfferCard({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={[
        "rounded-2xl border border-[#D4AF37]/34 bg-gradient-to-b from-[#242019] via-[#1C1A17] to-[#12100D] shadow-[0_16px_52px_rgba(0,0,0,0.58),0_6px_18px_rgba(0,0,0,0.38),0_0_0_1px_rgba(212,175,55,0.06),inset_0_1px_0_rgba(245,230,163,0.2)]",
        compact ? "p-4" : "p-5",
      ].join(" ")}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D4AF37]/90">
        {FOUNDING_BETA_OFFER[0]}
      </p>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-2xl font-semibold tracking-tight text-white">
          {FOUNDING_BETA_OFFER[1]}
        </span>
        <span className="flex items-center gap-1.5 text-sm text-neutral-400">
          <CreditCard className="h-3.5 w-3.5 text-[#D4AF37]/80" aria-hidden="true" />
          {FOUNDING_BETA_OFFER[2]}
        </span>
      </div>
      <p className="mt-2 text-sm text-neutral-400">{FOUNDING_BETA_OFFER[3]}</p>
    </div>
  );
}

function PricingTeaser({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={[
        "grid gap-2.5",
        compact ? "grid-cols-3" : "grid-cols-3 gap-3",
      ].join(" ")}
    >
      {FOUNDING_PLANS.map((plan) => (
        <div
          key={plan.id}
          className="rounded-xl border border-[#D4AF37]/20 bg-gradient-to-b from-[#FFFCF6] via-[#FAF7F0] to-[#F3EDE2] px-3 py-2.5 shadow-[inset_0_2px_5px_rgba(0,0,0,0.08),0_6px_16px_rgba(0,0,0,0.32),0_2px_6px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.94)]"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-600">
            {plan.name}
          </p>
          <p className="mt-1 font-mono text-sm font-semibold tabular-nums tracking-tight text-[#0A0A0A]">
            ${plan.postBetaPrice}
            <span className="text-[10px] font-medium text-stone-500">/mo</span>
          </p>
          <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-stone-500">
            after beta
          </p>
        </div>
      ))}
    </div>
  );
}

function FeatureGrid({ compact = false }: { compact?: boolean }) {
  return (
    <ul
      className={[
        "grid gap-2",
        compact ? "grid-cols-2" : "grid-cols-2 gap-2.5",
      ].join(" ")}
    >
      {FEATURE_HIGHLIGHTS.map((feature) => (
        <li
          key={feature.label}
          className="flex items-start gap-2 rounded-lg border border-[#D4AF37]/14 bg-[#FFFCF8]/95 px-2.5 py-2"
        >
          <feature.icon
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D4AF37]"
            aria-hidden="true"
          />
          <span
            className={[
              "font-medium leading-snug text-[#0A0A0A]",
              compact ? "text-[11px]" : "text-xs",
            ].join(" ")}
          >
            {feature.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

function MarketingCtas({ layout }: { layout: "desktop" | "mobile" }) {
  const signInClass =
    layout === "desktop"
      ? "border border-[#D4AF37]/35 bg-transparent text-white hover:border-[#D4AF37]/55 hover:bg-white/5"
      : "border border-stone-300/80 bg-white text-[#0A0A0A] shadow-sm hover:border-[#D4AF37]/40 hover:bg-[#FFFCF8]";

  const primaryClass =
    "bg-[#0A0A0A] text-white shadow-[0_1px_2px_rgba(10,10,10,0.22),0_4px_18px_rgba(212,175,55,0.2),0_0_22px_rgba(212,175,55,0.1)] ring-1 ring-[#D4AF37]/30 hover:bg-[#141414] hover:ring-[#D4AF37]/42";

  const secondaryClass =
    layout === "desktop"
      ? "border border-[#D4AF37]/30 bg-[#FFFCF8]/10 text-[#F5E6A3] hover:border-[#D4AF37]/50 hover:bg-[#FFFCF8]/15"
      : "border border-[#D4AF37]/35 bg-white text-[#9A7209] shadow-sm hover:border-[#D4AF37]/55 hover:bg-[#FFFCF8]";

  const base = [
    "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
    ctaFocusClass,
  ].join(" ");

  return (
    <div
      className={[
        "flex gap-2.5",
        layout === "mobile" ? "flex-col sm:flex-row" : "flex-wrap",
      ].join(" ")}
    >
      <a href="#sign-in-form" className={`${base} ${signInClass}`}>
        Sign in
      </a>
      <Link href="/signup" className={`${base} ${primaryClass}`}>
        Create free account
      </Link>
      <Link href="/pricing" className={`${base} ${secondaryClass}`}>
        View pricing
      </Link>
    </div>
  );
}

export function LoginMarketingPanel() {
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#0A0A0A]">
      <MarketingBackdrop />

      <div className="relative z-10 flex h-full min-h-0 flex-col overflow-y-auto px-8 py-8 lg:px-10 lg:py-10 xl:px-12">
        <div className="auth-hero-enter shrink-0">
          <AltairLogo
            variant="white"
            size="lg"
            showWordmark
            className="drop-shadow-[0_2px_16px_rgba(212,175,55,0.18)]"
          />

          <div className="mt-8 max-w-xl xl:mt-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D4AF37]/90">
              Service business platform
            </p>
            <h2 className="mt-3 text-[1.65rem] font-semibold leading-[1.12] tracking-tight text-white xl:text-[2rem]">
              {LOGIN_HERO_TITLE}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-400">
              {LOGIN_HERO_SUBCOPY}
            </p>
          </div>
        </div>

        <div className="auth-hero-enter mt-6 shrink-0 xl:mt-8">
          <BetaOfferCard />
        </div>

        <div className="auth-hero-enter mt-5 shrink-0">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Pricing after beta
          </p>
          <PricingTeaser />
        </div>

        <div className="auth-hero-enter mt-5 shrink-0">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Platform highlights
          </p>
          <FeatureGrid />
        </div>

        <div className="auth-hero-enter mt-8 min-h-0 flex-1 pb-2 xl:mt-10">
          <SeeAltairInActionSection variant="dark" />
        </div>

        <div className="auth-panel-enter mt-6 shrink-0 border-t border-[#D4AF37]/15 pt-6">
          <MarketingCtas layout="desktop" />
        </div>
      </div>
    </div>
  );
}

export function LoginMobileMarketing() {
  return (
    <section
      aria-label="About Altair OS"
      className="auth-panel-enter mt-8 overflow-hidden rounded-2xl border border-stone-200/80 bg-gradient-to-b from-[#0A0A0A] via-[#12100D] to-[#0A0A0A] shadow-[0_8px_24px_rgba(10,10,10,0.12)] ring-1 ring-[#D4AF37]/18 lg:hidden"
    >
      <div className="relative px-5 py-6 sm:px-6">
        <MarketingBackdrop />

        <div className="relative z-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D4AF37]/90">
            Service business platform
          </p>
          <h2 className="mt-2 text-xl font-semibold leading-snug tracking-tight text-white">
            {LOGIN_HERO_TITLE}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            {LOGIN_HERO_SUBCOPY}
          </p>

          <div className="mt-5">
            <BetaOfferCard compact />
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Pricing after beta
            </p>
            <PricingTeaser compact />
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Platform highlights
            </p>
            <FeatureGrid compact />
          </div>

          <div className="mt-6">
            <SeeAltairInActionSection variant="dark" compact />
          </div>

          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
            {FOUNDING_BETA_OFFER.map((item) => (
              <li
                key={item}
                className="flex items-center gap-1.5 text-xs text-neutral-400"
              >
                <Check className="h-3 w-3 shrink-0 text-[#D4AF37]" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5">
            <MarketingCtas layout="mobile" />
          </div>
        </div>
      </div>
    </section>
  );
}
