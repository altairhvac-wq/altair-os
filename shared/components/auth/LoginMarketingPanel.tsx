import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  Radio,
  ReceiptText,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";

export const LOGIN_HERO_TITLE = "Every handoff. One operating system.";

export const LOGIN_HERO_SUBCOPY =
  "Altair keeps the office, field, and financial side of the business moving through one connected workflow.";

type WorkflowStage = {
  label: string;
  icon: LucideIcon;
};

const WORKFLOW_STAGES: WorkflowStage[] = [
  { label: "Lead", icon: Users },
  { label: "Estimate", icon: FileText },
  { label: "Schedule", icon: CalendarDays },
  { label: "Field", icon: Wrench },
  { label: "Review", icon: ClipboardCheck },
  { label: "Invoice", icon: ReceiptText },
  { label: "Paid", icon: CircleDollarSign },
];

const OPERATING_LAYERS = [
  {
    label: "Office",
    detail: "Customers, jobs, and dispatch",
    icon: BriefcaseBusiness,
  },
  {
    label: "Field",
    detail: "Technicians and work execution",
    icon: Radio,
  },
  {
    label: "Finance",
    detail: "Invoices, payments, and reporting",
    icon: CircleDollarSign,
  },
] as const;

function WorkflowTrack({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex snap-x gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-7 sm:overflow-visible sm:pb-0">
        {WORKFLOW_STAGES.map((stage) => (
          <div
            key={stage.label}
            className="flex min-h-11 min-w-[5.75rem] snap-start items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] font-semibold text-slate-600 shadow-sm sm:min-w-0"
          >
            <stage.icon className="h-3 w-3 shrink-0 text-[#9A7209]" aria-hidden="true" />
            <span className="whitespace-nowrap">{stage.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="login-flow-track relative grid grid-cols-7 gap-1.5">
      {WORKFLOW_STAGES.map((stage) => (
        <div key={stage.label} className="relative z-10 min-w-0 text-center">
          <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-[#0c1728] text-[#e6d092] shadow-[0_6px_18px_rgba(0,0,0,0.3),0_0_0_3px_rgba(201,164,77,0.05)]">
            <stage.icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="mt-2 truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-300">
            {stage.label}
          </p>
        </div>
      ))}
    </div>
  );
}

export function LoginMarketingPanel() {
  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#07101d] text-white">
      <div className="auth-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="auth-noise pointer-events-none absolute inset-0 opacity-30" />
      <div className="login-aurora login-aurora-one pointer-events-none absolute" />
      <div className="login-aurora login-aurora-two pointer-events-none absolute" />
      <div className="login-orbit pointer-events-none absolute left-[9%] top-[24%] h-[28rem] w-[28rem] rounded-full border border-[#c9a44d]/10" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_48%_45%,transparent_25%,rgba(2,6,13,0.58)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e6d092]/45 to-transparent" />

      <div className="relative z-10 flex h-full min-h-0 flex-col px-8 py-7 lg:px-10 lg:py-8 xl:px-12 xl:py-10">
        <header className="flex shrink-0 items-center justify-between gap-4">
          <AltairLogo
            variant="white"
            size="lg"
            showWordmark
            className="drop-shadow-[0_3px_18px_rgba(201,164,77,0.18)]"
          />
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-300 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            Operations connected
          </span>
        </header>

        <div className="flex min-h-0 flex-1 flex-col justify-center py-6 xl:py-8">
          <div className="auth-hero-enter max-w-[40rem]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c9a44d]">
              The operating layer for field service
            </p>
            <h2 className="mt-3 max-w-[36rem] text-[2rem] font-semibold leading-[1.04] tracking-[-0.035em] text-[#f8fafc] xl:text-[2.55rem]">
              {LOGIN_HERO_TITLE}
            </h2>
            <p className="mt-4 max-w-[35rem] text-sm leading-6 text-slate-400 xl:text-[15px]">
              {LOGIN_HERO_SUBCOPY}
            </p>
          </div>

          <div className="login-command-card auth-panel-enter relative mt-6 overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#0b1626]/85 p-4 shadow-[0_28px_80px_-32px_rgba(0,0,0,0.8),0_0_0_1px_rgba(201,164,77,0.05)_inset] backdrop-blur-xl xl:mt-8 xl:p-5">
            <div className="login-scan-line pointer-events-none absolute inset-x-0 top-0 h-px" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c9a44d]">
                  Altair control loop
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  From first call to final payment
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400/15 bg-emerald-400/[0.07] px-2 py-1 text-[10px] font-medium text-emerald-300">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                One connected record
              </span>
            </div>

            <div className="mt-5 rounded-xl border border-white/[0.07] bg-black/15 px-3 py-4">
              <WorkflowTrack />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {OPERATING_LAYERS.map((layer) => (
                <div
                  key={layer.label}
                  className="group rounded-xl border border-white/[0.08] bg-white/[0.045] px-3 py-2.5 transition-colors hover:bg-white/[0.07]"
                >
                  <div className="flex items-center gap-2">
                    <layer.icon className="h-3.5 w-3.5 text-[#c9a44d]" aria-hidden="true" />
                    <p className="text-xs font-semibold text-slate-100">{layer.label}</p>
                  </div>
                  <p className="mt-1 text-[10px] leading-snug text-slate-500">
                    {layer.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-white/[0.07] pt-4 text-[10px] uppercase tracking-[0.13em] text-slate-500">
          <span>Built for trades and field service</span>
          <span className="hidden items-center gap-2 sm:inline-flex">
            Observe
            <span className="text-[#8a6324]">/</span>
            Prioritize
            <span className="text-[#8a6324]">/</span>
            Act
          </span>
        </footer>
      </div>
    </section>
  );
}

export function LoginMobileMarketing() {
  return (
    <section
      aria-labelledby="mobile-operating-loop-title"
      className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 shadow-sm lg:hidden"
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8a6324]">
            One connected workflow
          </p>
          <h2
            id="mobile-operating-loop-title"
            className="mt-0.5 text-sm font-semibold text-slate-900"
          >
            First call to final payment
          </h2>
        </div>
        <span className="text-[10px] font-medium text-slate-400">Altair OS</span>
      </div>
      <WorkflowTrack compact />
    </section>
  );
}
