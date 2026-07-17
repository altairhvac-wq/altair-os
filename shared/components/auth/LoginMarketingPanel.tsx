import Image from "next/image";
import {
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  FileText,
  LockKeyhole,
  MonitorSmartphone,
  Radio,
  ReceiptText,
  ShieldCheck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";
import { LoginProductPreviews } from "./LoginProductPreviews";

export const LOGIN_HERO_TITLE =
  "Run your entire field service business from one operating system.";

export const LOGIN_HERO_SUBCOPY =
  "Altair connects your office, technicians, customers, dispatch, estimates, invoices, payments, reports, and AI into one intelligent workflow—so your company runs faster with less chaos.";

type WorkflowStage = {
  label: string;
  icon: LucideIcon;
};

const WORKFLOW_STAGES: WorkflowStage[] = [
  { label: "Lead", icon: Users },
  { label: "Estimate", icon: FileText },
  { label: "Schedule", icon: CalendarDays },
  { label: "Dispatch", icon: Radio },
  { label: "Field Work", icon: Wrench },
  { label: "Invoice", icon: ReceiptText },
  { label: "Payment", icon: CreditCard },
  { label: "Review", icon: ClipboardCheck },
];

const BENEFITS = [
  {
    title: "Never lose another customer",
    description: "AI helps draft follow-ups and keeps every customer conversation organized.",
    outcome: "Smarter CRM",
    icon: Bot,
  },
  {
    title: "Dispatch with confidence",
    description: "Live scheduling, technician visibility, and intelligent job management.",
    outcome: "Efficient operations",
    icon: Radio,
  },
  {
    title: "Get paid faster",
    description: "Professional invoices, Stripe payments, and workflow reminders keep collections moving.",
    outcome: "Faster cash flow",
    icon: CircleDollarSign,
  },
  {
    title: "Know your business",
    description: "Real-time revenue, technician performance, profitability, and reporting.",
    outcome: "Clear decisions",
    icon: BarChart3,
  },
] as const;

const TRUST_ITEMS = [
  {
    title: "Built for HVAC & field service",
    detail: "Designed around real service workflows",
    icon: Wrench,
  },
  {
    title: "Secure workspace access",
    detail: "Authenticated tenant data",
    icon: ShieldCheck,
  },
  {
    title: "Works anywhere",
    detail: "Desktop, tablet, and mobile",
    icon: MonitorSmartphone,
  },
  {
    title: "3 months free",
    detail: "No credit card required",
    icon: LockKeyhole,
  },
] as const;

function HeroStatusCard({
  className,
  eyebrow,
  primary,
  secondary,
  icon: Icon,
  tone = "gold",
}: {
  className: string;
  eyebrow: string;
  primary: string;
  secondary: string;
  icon: LucideIcon;
  tone?: "gold" | "green" | "cyan";
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-300"
      : tone === "cyan"
        ? "text-cyan-300"
        : "text-[#e6d092]";

  return (
    <div className={`absolute rounded-xl border border-[#c9a44d]/30 bg-[#1d1812]/88 px-3 py-2.5 shadow-[0_16px_36px_rgba(0,0,0,0.45)] backdrop-blur-xl ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-slate-400">{eyebrow}</p>
        <Icon className={`h-3 w-3 ${toneClass}`} aria-hidden="true" />
      </div>
      <p className="mt-1 text-xs font-semibold text-white">{primary}</p>
      <p className={`mt-0.5 text-[10px] ${toneClass}`}>{secondary}</p>
    </div>
  );
}

function FieldServiceHero() {
  return (
    <figure className="auth-panel-enter relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#261f17] shadow-[0_28px_80px_-34px_rgba(0,0,0,0.9),0_0_0_1px_rgba(201,164,77,0.08)_inset]">
      <div className="relative aspect-[16/11] min-h-[220px] sm:min-h-[290px]">
        <Image
          src="/marketing/hero/altair-field-service-hero.webp"
          alt="HVAC technician arriving at a customer home with Altair coordinating the visit"
          fill
          fetchPriority="high"
          sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1023px) calc(100vw - 64px), (max-width: 1279px) 60vw, 38vw"
          className="object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#14110c]/75 via-transparent to-[#14110c]/10" />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-white/10 ring-inset" />

        <HeroStatusCard
          className="left-3 top-3 hidden sm:block"
          eyebrow="Today’s schedule"
          primary="3 visits ready"
          secondary="Next · system maintenance"
          icon={CalendarDays}
          tone="cyan"
        />
        <HeroStatusCard
          className="right-3 top-3"
          eyebrow="Estimate"
          primary="Estimate approved"
          secondary="Customer confirmed"
          icon={CheckCircle2}
          tone="green"
        />
        <HeroStatusCard
          className="bottom-3 left-3"
          eyebrow="Dispatch"
          primary="Technician assigned"
          secondary="Route updated"
          icon={Radio}
          tone="cyan"
        />
        <HeroStatusCard
          className="bottom-3 right-3 hidden sm:block"
          eyebrow="Invoice"
          primary="Payment received"
          secondary="Balance updated"
          icon={CreditCard}
          tone="green"
        />
      </div>
    </figure>
  );
}

function ControlLoop() {
  return (
    <section aria-labelledby="altair-control-loop-title" className="login-command-card relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#241e16]/92 px-4 py-4 shadow-[0_24px_60px_-34px_rgba(0,0,0,0.9),0_0_0_1px_rgba(201,164,77,0.06)_inset] sm:px-5">
      <div className="login-scan-line pointer-events-none absolute inset-x-0 top-0 h-px" />
      <h2 id="altair-control-loop-title" className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c9a44d]">
        Altair Control Loop
      </h2>
      <p className="mt-1 text-[10px] text-slate-400 sm:hidden">Swipe to follow the full workflow →</p>
      <div
        className="mt-3 overflow-x-auto pb-1 outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-[#c9a44d]/40 [&::-webkit-scrollbar]:hidden"
        tabIndex={0}
        role="region"
        aria-label="Horizontal workflow. Swipe or use arrow keys to view all stages."
      >
        <div className="relative min-w-[560px]">
          <span className="login-control-loop-signal" aria-hidden="true" />
          <ol className="login-control-loop-track relative grid grid-cols-8 gap-1 pt-1">
            {WORKFLOW_STAGES.map((stage) => (
              <li key={stage.label} className="relative z-10 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-[#c9a44d]/28 bg-[#1f1a13] text-[#e6d092] shadow-[0_6px_18px_rgba(0,0,0,0.35),0_0_0_3px_rgba(201,164,77,0.035)]">
                  <stage.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="mt-2 block whitespace-nowrap text-[10px] font-semibold text-slate-200">{stage.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  return (
    <section aria-label="Altair benefits" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {BENEFITS.map((benefit) => (
        <article key={benefit.title} className="group flex min-h-44 flex-col rounded-2xl border border-white/[0.09] bg-gradient-to-br from-white/[0.055] to-white/[0.025] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#c9a44d]/25 hover:bg-white/[0.06]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#c9a44d]/20 bg-[#1f1a13] text-[#e0b84f]">
              <benefit.icon className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <h2 className="pt-1 text-sm font-semibold leading-5 text-white">{benefit.title}</h2>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">{benefit.description}</p>
          <p className="mt-auto pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#c9a44d]">{benefit.outcome}</p>
        </article>
      ))}
    </section>
  );
}

function TrustBar() {
  return (
    <section aria-label="Why teams choose Altair" className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.09] sm:grid-cols-2 xl:grid-cols-4">
      {TRUST_ITEMS.map((item) => (
        <div key={item.title} className="flex items-center gap-3 bg-[#1f1a13] px-4 py-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#c9a44d]/22 text-[#e0b84f]">
            <item.icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-slate-100">{item.title}</span>
            <span className="mt-0.5 block text-[10px] leading-4 text-slate-400">{item.detail}</span>
          </span>
        </div>
      ))}
    </section>
  );
}

export function LoginMarketingPanel() {
  return (
    <section className="relative min-h-full overflow-hidden bg-[#14110c] text-white">
      <div className="auth-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="auth-noise pointer-events-none absolute inset-0 opacity-20" />
      <div className="pointer-events-none absolute -left-56 top-24 h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(circle,rgba(14,116,144,0.1)_0%,transparent_68%)]" />

      <div className="relative mx-auto max-w-[1160px] px-5 py-7 sm:px-8 sm:py-9 lg:px-8 xl:px-10">
        <header className="flex items-center justify-between gap-4">
          <AltairLogo variant="white" size="lg" showWordmark className="drop-shadow-[0_3px_18px_rgba(201,164,77,0.2)]" />
          <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-300 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#c9a44d] shadow-[0_0_10px_rgba(201,164,77,0.7)]" />
            Operations connected
          </span>
        </header>

        <div className="mt-8 grid items-center gap-7 xl:grid-cols-[0.88fr_1.12fr]">
          <div className="auth-hero-enter">
            <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-[#c9a44d]">Operating system for field service</p>
            <h2 className="mt-4 text-[clamp(2.4rem,4.5vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.05em] text-[#fcf8f1]">{LOGIN_HERO_TITLE}</h2>
            <p className="mt-5 max-w-xl text-sm leading-6 text-slate-300 sm:text-[15px] sm:leading-7">{LOGIN_HERO_SUBCOPY}</p>
          </div>
          <FieldServiceHero />
        </div>

        <div className="mt-5 space-y-3">
          <ControlLoop />
          <Benefits />
        </div>

        <div className="mt-7 space-y-3">
          <LoginProductPreviews />
          <TrustBar />
        </div>
      </div>
    </section>
  );
}
