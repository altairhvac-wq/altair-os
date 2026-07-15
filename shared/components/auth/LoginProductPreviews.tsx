import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  MapPin,
  Radio,
  ReceiptText,
  Smartphone,
  Users,
  type LucideIcon,
} from "lucide-react";

type PreviewShellProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
};

function PreviewShell({
  title,
  description,
  icon: Icon,
  children,
}: PreviewShellProps) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0a1421] shadow-[0_18px_45px_-28px_rgba(0,0,0,0.9)]">
      <div className="flex items-start gap-3 border-b border-white/[0.07] px-4 py-3.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#c9a44d]/20 bg-[#08121f] text-[#e0b84f]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
            {description}
          </p>
        </div>
      </div>
      <div
        className="min-h-[236px] flex-1 overflow-hidden bg-[#e8edf3] p-3.5"
        aria-hidden="true"
      >
        {children}
      </div>
    </article>
  );
}

function DashboardPreview() {
  const metrics = [
    { label: "Jobs today", value: "12" },
    { label: "Completed", value: "9" },
    { label: "Unassigned", value: "0" },
  ] as const;

  return (
    <PreviewShell
      title="Dashboard"
      description="A live operating center for today’s work and cash flow."
      icon={LayoutDashboard}
    >
      <div className="h-full overflow-hidden rounded-xl border border-[#223044]/15 bg-white shadow-sm">
        <div className="flex items-center justify-between bg-[#101a28] px-3.5 py-3 text-white">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#e6d092]">
              Operating center
            </p>
            <p className="mt-1 text-xs text-slate-300">Today’s command brief</p>
          </div>
          <span className="rounded-full bg-emerald-400/12 px-2 py-1 text-[10px] font-semibold text-emerald-300">
            Healthy
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 bg-[#dce3ec] p-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-slate-200 bg-white p-2.5">
              <p className="text-[10px] leading-4 text-slate-500">{metric.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-950">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-3.5 py-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Cash flow
            </p>
            <p className="mt-0.5 text-xs font-semibold text-slate-900">$0 overdue</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            No critical actions
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}

const DISPATCH_JOBS = [
  {
    id: "JOB-DEMO-1030",
    title: "Smart thermostat install",
    time: "7:00 AM",
    status: "Completed",
    tone: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  },
  {
    id: "JOB-DEMO-1002",
    title: "Seasonal tune-up",
    time: "8:00 AM",
    status: "In progress",
    tone: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  },
  {
    id: "JOB-DEMO-1001",
    title: "HVAC maintenance",
    time: "9:00 AM",
    status: "Scheduled",
    tone: "border-slate-500/30 bg-white/[0.04] text-slate-300",
  },
] as const;

function DispatchPreview() {
  return (
    <PreviewShell
      title="Dispatch Board"
      description="Every job assigned, visible, and moving through the day."
      icon={Radio}
    >
      <div className="h-full rounded-xl border border-[#223044] bg-[#0e141d] p-3.5 shadow-sm">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e6d092]/20 bg-[#8a6324] text-[10px] font-semibold text-white">
              FT
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#e6d092]">
                Assigned technician
              </p>
              <p className="mt-1 text-xs text-slate-300">Today’s field lane</p>
            </div>
          </div>
          <CalendarDays className="h-4 w-4 text-[#c9a44d]" />
        </div>
        <div className="mt-3 space-y-2">
          {DISPATCH_JOBS.map((job) => (
            <div key={job.id} className="grid grid-cols-[3.4rem_1fr_auto] items-center gap-2 rounded-lg border border-white/[0.07] bg-[#101a28] p-2.5">
              <span className="text-[10px] font-medium tabular-nums text-slate-400">{job.time}</span>
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-semibold text-white">{job.title}</span>
                <span className="mt-0.5 block text-[10px] text-slate-400">{job.id}</span>
              </span>
              <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${job.tone}`}>
                {job.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PreviewShell>
  );
}

function InvoicesPreview() {
  return (
    <PreviewShell
      title="Invoices"
      description="Professional billing with payment history and clear balances."
      icon={ReceiptText}
    >
      <div className="h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between bg-[#dce3ec] px-3.5 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#6f4b13]">
              INV-DEMO-3002
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-950">Greenfield Dental Studio</p>
          </div>
          <span className="rounded-full bg-[#fff3d6] px-2 py-1 text-[10px] font-semibold text-[#8a6324]">
            Partially paid
          </span>
        </div>
        <div className="grid grid-cols-3 gap-px bg-slate-200">
          {[
            ["Invoice total", "$2,045.93"],
            ["Paid", "$1,000.00"],
            ["Balance", "$1,045.93"],
          ].map(([label, value]) => (
            <div key={label} className="bg-white px-3 py-3">
              <p className="text-[10px] text-slate-500">{label}</p>
              <p className="mt-1 text-xs font-semibold tabular-nums text-slate-950">{value}</p>
            </div>
          ))}
        </div>
        <div className="px-3.5 py-3">
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>HVAC seasonal tune-up</span>
            <span>Net-30 terms</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-[49%] rounded-full bg-[#b88a2e]" />
          </div>
          <p className="mt-2 text-[10px] text-emerald-700">Deposit received · future due date</p>
        </div>
      </div>
    </PreviewShell>
  );
}

function CustomerPreview() {
  return (
    <PreviewShell
      title="Customer 360"
      description="One complete record for service history, value, and equipment."
      icon={Users}
    >
      <div className="h-full overflow-hidden rounded-xl border border-[#d8ccb4] bg-[#fffaf0] shadow-sm">
        <div className="flex items-center gap-3 bg-[#101a28] px-3.5 py-3 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e6d092]/30 bg-[#8a6324] text-xs font-semibold">
            LA
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">Lakewood Apartments</p>
            <p className="mt-0.5 text-[10px] text-slate-400">Lakewood Property Management</p>
          </div>
          <span className="ml-auto rounded-full bg-emerald-400/12 px-2 py-1 text-[10px] font-semibold text-emerald-300">
            Active
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3">
          <div className="rounded-lg border border-[#e5dac5] bg-white p-3">
            <p className="text-[10px] text-slate-500">Total jobs</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">26</p>
          </div>
          <div className="rounded-lg border border-[#e5dac5] bg-white p-3">
            <p className="text-[10px] text-slate-500">Lifetime revenue</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">$21,480</p>
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-lg border border-[#e5dac5] bg-white px-3 py-2.5">
            <span className="flex items-center gap-2 text-[10px] font-medium text-slate-700">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Active equipment
            </span>
            <span className="text-[10px] text-emerald-700">Healthy paid history</span>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}

function ReportsPreview() {
  return (
    <PreviewShell
      title="Reports"
      description="Revenue, close rate, cash position, and performance at a glance."
      icon={BarChart3}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[#d8ccb4] bg-[#fffaf0] shadow-sm">
        <div className="flex items-center justify-between border-b border-[#e6dcc8] px-3.5 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#8a6324]">
              Operating brief
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-950">Last 30 days</p>
          </div>
          <BarChart3 className="h-4 w-4 text-[#8a6324]" />
        </div>
        <div className="grid grid-cols-4 gap-px bg-[#e6dcc8]">
          {[
            ["Revenue", "$4,294"],
            ["Avg ticket", "$477"],
            ["Close rate", "74%"],
            ["Outstanding", "$5,514"],
          ].map(([label, value]) => (
            <div key={label} className="bg-white px-2.5 py-3">
              <p className="text-[10px] leading-4 text-slate-500">{label}</p>
              <p className="mt-1 text-xs font-semibold tabular-nums text-slate-950">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-auto px-4 pb-4 pt-3">
          <div className="flex items-center justify-between text-[10px] font-medium text-slate-600">
            <span>Cash position</span>
            <span className="text-emerald-700">$0 overdue</span>
          </div>
          <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-slate-100">
            <span className="w-[44%] bg-[#5c7a5f]" />
            <span className="w-[56%] bg-[#b88a2e]" />
          </div>
          <div className="mt-2 flex items-center gap-4 text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#5c7a5f]" />
              Collected $4,294
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#b88a2e]" />
              Outstanding $5,514
            </span>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}

function TechnicianPreview() {
  return (
    <PreviewShell
      title="Technician App"
      description="The active job, customer details, and field actions in one view."
      icon={Smartphone}
    >
      <div className="mx-auto flex h-full max-w-[18rem] flex-col rounded-[1.2rem] bg-slate-100 p-3 shadow-[0_14px_30px_rgba(15,23,42,0.16)]">
        <div className="flex flex-1 flex-col rounded-xl border-l-4 border-l-cyan-600 bg-gradient-to-br from-cyan-50 via-white to-white p-3.5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-cyan-700">
                Active job
              </p>
              <p className="mt-1 truncate text-sm font-bold text-slate-950">Greenfield Dental Studio</p>
              <p className="mt-1 text-[11px] font-medium text-slate-600">HVAC seasonal tune-up</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
              Live
            </span>
          </div>
          <div className="mt-3 rounded-lg bg-slate-50 p-2.5">
            <div className="flex items-center gap-2 text-[10px] font-medium text-slate-700">
              <MapPin className="h-3.5 w-3.5 text-cyan-600" />
              5500 Business Park Blvd
            </div>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
              <Clock3 className="h-3.5 w-3.5" />
              JOB-DEMO-1002 · 8:00 AM
            </div>
          </div>
          <div className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-3 py-3 text-xs font-bold text-white shadow-[0_6px_18px_-8px_rgb(8_145_178_/_0.65)]">
            <CheckCircle2 className="h-4 w-4" />
            Complete work
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}

export function LoginProductPreviews() {
  return (
    <section aria-labelledby="login-product-previews-title">
      <h2
        id="login-product-previews-title"
        className="text-lg font-semibold tracking-tight text-white sm:text-xl"
      >
        See the operating system at work.
      </h2>
      <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-400 sm:text-sm">
        See how Altair presents dispatch, billing, customer history, reports, and field work.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <DashboardPreview />
        <DispatchPreview />
        <InvoicesPreview />
        <CustomerPreview />
        <ReportsPreview />
        <TechnicianPreview />
      </div>
    </section>
  );
}
