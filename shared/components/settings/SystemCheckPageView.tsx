import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Info,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type {
  SystemCheckReport,
  SystemCheckResult,
  SystemCheckStatus,
} from "@/lib/system-check/types";

type SystemCheckPageViewProps = {
  report: SystemCheckReport;
};

const STATUS_META: Record<
  SystemCheckStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  pass: {
    label: "Pass",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  fail: {
    label: "Fail",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    icon: XCircle,
  },
  warn: {
    label: "Warn",
    className: "border-amber-200 bg-amber-50 text-amber-800",
    icon: AlertTriangle,
  },
  info: {
    label: "Info",
    className: "border-sky-200 bg-sky-50 text-sky-700",
    icon: Info,
  },
};

function SystemCheckRow({ check }: { check: SystemCheckResult }) {
  const meta = STATUS_META[check.status];
  const Icon = meta.icon;

  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:px-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-slate-900">{check.label}</h3>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.className}`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {meta.label}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600">{check.message}</p>
        {check.hint ? (
          <p className="mt-2 text-sm text-slate-500">{check.hint}</p>
        ) : null}
      </div>
    </div>
  );
}

export function SystemCheckPageView({ report }: SystemCheckPageViewProps) {
  const checkedAt = new Date(report.checkedAt).toLocaleString();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">System Check</h1>
            <p className="text-sm text-slate-600">
              Read-only production readiness checks for the internal alpha.
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Last checked {checkedAt}. No secrets are displayed on this page.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Passing
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {report.summary.pass}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Failing
          </p>
          <p className="mt-2 text-2xl font-bold text-rose-700">
            {report.summary.fail}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Warnings
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-700">
            {report.summary.warn}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Info
          </p>
          <p className="mt-2 text-2xl font-bold text-sky-700">
            {report.summary.info}
          </p>
        </div>
      </section>

      <section className="admin-card">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-lg font-bold text-slate-900">Checks</h2>
          <p className="text-sm text-slate-600">
            These probes are read-only and safe to run in production.
          </p>
        </div>
        {report.checks.map((check) => (
          <SystemCheckRow key={check.id} check={check} />
        ))}
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <CircleHelp className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Deploy documentation</h3>
            <p className="mt-1 text-sm text-slate-600">
              Use the repo checklists for Vercel env vars, Supabase Auth URLs,
              and the full internal alpha smoke test.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-cyan-700">
              <li>
                <Link href="/settings" className="hover:underline">
                  Back to Settings
                </Link>
              </li>
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              See docs/internal-alpha-deployment-checklist.md and
              docs/internal-alpha-smoke-test.md in the repository.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
