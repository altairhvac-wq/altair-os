import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  FileText,
  LayoutDashboard,
  Radio,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";

export const LOGIN_HERO_TITLE =
  "Run your entire field service business from one operating system.";

export const LOGIN_HERO_SUBCOPY =
  "Altair connects every customer, every technician, and every dollar—from the first call to the final payment.";

const CONNECTED_SYSTEMS = [
  "Customers",
  "Leads",
  "Jobs",
  "Dispatch",
  "Technicians",
  "Estimates",
  "Invoices",
  "Payments",
  "Reports",
  "AI",
] as const;

type WorkflowStage = {
  label: string;
  detail: string;
  icon: LucideIcon;
};

const WORKFLOW_STAGES: WorkflowStage[] = [
  { label: "Lead", detail: "Capture every opportunity", icon: Users },
  { label: "Estimate", detail: "Build and send options", icon: FileText },
  { label: "Schedule", detail: "Commit the right time", icon: CalendarDays },
  { label: "Dispatch", detail: "Assign the right technician", icon: Radio },
  { label: "Field Work", detail: "Keep office and field in sync", icon: Wrench },
  { label: "Invoice", detail: "Turn completed work into revenue", icon: ReceiptText },
  { label: "Payment", detail: "Collect securely with Stripe", icon: CreditCard },
  { label: "Review", detail: "Learn, follow up, and improve", icon: ClipboardCheck },
];

const BENEFITS = [
  {
    title: "Never lose another customer",
    description: "AI follows up automatically.",
    icon: Bot,
    accent: "from-cyan-400/18 to-cyan-400/0",
  },
  {
    title: "Dispatch with confidence",
    description: "Live scheduling and technician visibility.",
    icon: Radio,
    accent: "from-blue-400/18 to-blue-400/0",
  },
  {
    title: "Get paid faster",
    description: "Invoices, Stripe payments, and reminders.",
    icon: CircleDollarSign,
    accent: "from-emerald-400/18 to-emerald-400/0",
  },
  {
    title: "Know your business",
    description: "Reports, revenue, and technician performance.",
    icon: TrendingUp,
    accent: "from-[#c9a44d]/22 to-[#c9a44d]/0",
  },
] as const;

const PRODUCT_SCREENS = [
  {
    title: "Dashboard",
    description: "See what needs attention before it becomes a problem.",
    src: "/marketing/screenshots/marketing-dashboard.png",
    alt: "Altair OS dashboard with priority signals, lead pipeline, and office review queue",
    icon: LayoutDashboard,
  },
  {
    title: "Dispatch",
    description: "Schedule, assign, and follow every field job in one view.",
    src: "/marketing/screenshots/marketing-dispatch.png",
    alt: "Altair OS dispatch workspace showing scheduled jobs and technician assignments",
    icon: Radio,
  },
  {
    title: "Invoices",
    description: "Move completed work into billing without re-entering the job.",
    src: "/marketing/screenshots/social/invoices-full-page.png",
    alt: "Altair OS invoices workspace showing billing status, balances, and customer records",
    icon: ReceiptText,
  },
  {
    title: "Customer 360",
    description: "Keep every relationship, location, job, and dollar connected.",
    src: "/marketing/screenshots/marketing-customers.png",
    alt: "Altair OS customer workspace showing profiles, service locations, and revenue",
    icon: Users,
  },
  {
    title: "Reports",
    description: "Understand revenue, cash flow, close rates, and performance.",
    src: "/marketing/screenshots/social/reports-workspace.png",
    alt: "Altair OS reports workspace showing revenue, cash flow, and estimate close rate",
    icon: BarChart3,
  },
] as const;

function FieldServiceHero() {
  return (
    <figure className="auth-panel-enter relative mt-10 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0b1626] shadow-[0_32px_100px_-36px_rgba(0,0,0,0.9),0_0_0_1px_rgba(201,164,77,0.08)_inset]">
      <div className="relative aspect-[16/9] min-h-[300px]">
        <Image
          src="/marketing/hero/altair-field-service-hero.webp"
          alt="HVAC technician arriving at a customer home with connected field-service workflow indicators"
          fill
          preload
          sizes="(max-width: 1023px) 100vw, 64vw"
          className="object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050b14] via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-white/10 ring-inset" />

        <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl border border-white/15 bg-[#07101d]/80 px-3 py-2 text-[11px] font-medium text-white shadow-xl backdrop-blur-xl sm:bottom-6 sm:left-6">
          <Radio className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
          Technician assigned
        </div>
        <div className="absolute right-4 top-4 hidden items-center gap-2 rounded-xl border border-white/15 bg-[#07101d]/80 px-3 py-2 text-[11px] font-medium text-white shadow-xl backdrop-blur-xl sm:flex sm:right-6 sm:top-6">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
          Estimate approved
        </div>
        <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-xl border border-white/15 bg-[#07101d]/80 px-3 py-2 text-[11px] font-medium text-white shadow-xl backdrop-blur-xl sm:bottom-6 sm:right-6">
          <CreditCard className="h-3.5 w-3.5 text-[#e6d092]" aria-hidden="true" />
          Invoice paid
        </div>
      </div>
      <figcaption className="absolute bottom-0 left-1/2 hidden -translate-x-1/2 translate-y-1/2 items-center gap-2 rounded-full border border-[#c9a44d]/20 bg-[#091321] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#e6d092] shadow-2xl sm:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
        One connected record
      </figcaption>
    </figure>
  );
}

function ControlLoop() {
  return (
    <section className="login-command-card relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0a1524]/90 p-5 shadow-[0_28px_80px_-40px_rgba(0,0,0,0.9),0_0_0_1px_rgba(201,164,77,0.06)_inset] sm:p-7 xl:p-8">
      <div className="login-scan-line pointer-events-none absolute inset-x-0 top-0 h-px" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c9a44d]">
            Altair Control Loop
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
            Work moves forward. Nothing falls through.
          </h3>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Always connected
        </span>
      </div>

      <ol className="mx-auto mt-8 max-w-2xl sm:mt-10">
        {WORKFLOW_STAGES.map((stage, index) => (
          <li
            key={stage.label}
            className="relative"
          >
            <div className="relative flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3.5 transition-colors hover:bg-white/[0.06] sm:min-h-20 sm:p-4">
              <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#c9a44d]/25 bg-[#07101d] text-[#e6d092] shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
                <stage.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-medium uppercase tracking-[0.13em] text-slate-500">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="mt-0.5 block text-sm font-semibold text-white">{stage.label}</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-400">{stage.detail}</span>
              </span>
              <CheckCircle2 className="hidden h-4 w-4 shrink-0 text-emerald-300/65 sm:block" aria-hidden="true" />
            </div>
            {index < WORKFLOW_STAGES.length - 1 ? (
              <span className="flex h-7 items-center pl-[1.1rem] text-[#c9a44d]/70 sm:h-8 sm:pl-[1.35rem]">
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Benefits() {
  return (
    <section>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c9a44d]">
        Built to protect momentum
      </p>
      <h3 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
        Less chasing. More control.
      </h3>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {BENEFITS.map((benefit) => (
          <article
            key={benefit.title}
            className="group relative min-h-44 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.14] hover:bg-white/[0.055]"
          >
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${benefit.accent}`} />
            <div className="relative">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#091321]/80 text-[#e6d092] shadow-lg">
                <benefit.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h4 className="mt-6 text-base font-semibold text-white">{benefit.title}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-400">{benefit.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProductGallery() {
  return (
    <section id="product" className="scroll-mt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c9a44d]">
            The product
          </p>
          <h3 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
            One system. Every operating view.
          </h3>
        </div>
        <p className="max-w-sm text-sm leading-6 text-slate-400">
          Real Altair workspaces built for the office, the field, and the financial side of your business.
        </p>
      </div>

      <div className="mt-9 grid gap-5 sm:grid-cols-2">
        {PRODUCT_SCREENS.map((screen, index) => (
          <figure
            key={screen.title}
            className={`group overflow-hidden rounded-[1.4rem] border border-white/[0.09] bg-[#0a1524] shadow-[0_24px_70px_-36px_rgba(0,0,0,0.85)] ${
              index === 0 ? "sm:col-span-2" : ""
            }`}
          >
            <div className={`relative overflow-hidden bg-slate-950 ${index === 0 ? "aspect-[2.03/1]" : "aspect-[16/10]"}`}>
              <Image
                src={screen.src}
                alt={screen.alt}
                fill
                sizes={index === 0 ? "(max-width: 1023px) 100vw, 64vw" : "(max-width: 639px) 100vw, 32vw"}
                className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.015]"
              />
              <div className="pointer-events-none absolute inset-0 ring-1 ring-white/10 ring-inset" />
            </div>
            <figcaption className="flex items-start gap-3 border-t border-white/[0.07] p-4 sm:p-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#c9a44d]/20 bg-[#c9a44d]/[0.07] text-[#e6d092]">
                <screen.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">{screen.title}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">{screen.description}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function LoginMarketingPanel() {
  return (
    <section className="relative min-h-full overflow-hidden bg-[#050b14] text-white">
      <div className="auth-grid pointer-events-none absolute inset-0 opacity-35" />
      <div className="auth-noise pointer-events-none absolute inset-0 opacity-25" />
      <div className="pointer-events-none absolute -left-56 top-24 h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(circle,rgba(14,116,144,0.13)_0%,transparent_68%)]" />
      <div className="pointer-events-none absolute -right-64 top-[34rem] h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(circle,rgba(201,164,77,0.12)_0%,transparent_68%)]" />

      <div className="relative mx-auto max-w-[1040px] px-5 py-8 sm:px-8 sm:py-10 lg:px-10 xl:px-14 xl:py-12">
        <header className="flex items-center justify-between gap-4">
          <AltairLogo
            variant="white"
            size="lg"
            showWordmark
            className="drop-shadow-[0_3px_18px_rgba(201,164,77,0.2)]"
          />
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-300 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            Built for field service
          </span>
        </header>

        <div className="pt-16 sm:pt-20 xl:pt-24">
          <div className="auth-hero-enter max-w-[52rem]">
            <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#c9a44d]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Your business, finally connected
            </p>
            <h2 className="mt-5 text-[clamp(2.7rem,6vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-[#f8fafc]">
              {LOGIN_HERO_TITLE}
            </h2>
            <p className="mt-7 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              {LOGIN_HERO_SUBCOPY}
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              {CONNECTED_SYSTEMS.map((system) => (
                <span
                  key={system}
                  className="rounded-full border border-white/[0.09] bg-white/[0.045] px-3 py-1.5 text-[11px] font-medium text-slate-300"
                >
                  {system}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#07101d] shadow-[0_12px_34px_-14px_rgba(255,255,255,0.55)] transition-all hover:-translate-y-0.5 hover:bg-[#f8fafc] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/20"
              >
                Create your workspace
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <a
                href="#product"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/12 bg-white/[0.045] px-5 text-sm font-semibold text-white transition-all hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/10"
              >
                See the product
              </a>
            </div>
          </div>

          <FieldServiceHero />
        </div>

        <div className="space-y-20 py-20 sm:space-y-28 sm:py-28 xl:space-y-32 xl:py-32">
          <ControlLoop />
          <Benefits />
          <ProductGallery />
        </div>

        <footer className="border-t border-white/[0.07] py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-lg text-sm leading-6 text-slate-400">
              From first call to final payment, Altair gives field-service teams one clear operating system.
            </p>
            <Link
              href="/signup"
              className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-[#c9a44d]/25 bg-[#c9a44d]/[0.08] px-4 text-sm font-semibold text-[#e6d092] transition-colors hover:bg-[#c9a44d]/[0.13] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c9a44d]/15"
            >
              Start with Altair
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </footer>
      </div>
    </section>
  );
}
