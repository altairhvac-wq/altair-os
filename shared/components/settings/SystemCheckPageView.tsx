import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Info,
  XCircle,
} from "lucide-react";
import type {
  SystemCheckReport,
  SystemCheckResult,
  SystemCheckStatus,
} from "@/lib/system-check/types";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageHeader,
  MasterPageSection,
  MasterPageSurface,
  MasterShellPage,
} from "@/shared/design-system/shell";

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

const SUMMARY_CARDS = [
  { key: "pass", label: "Passing", valueClass: "text-emerald-700" },
  { key: "fail", label: "Failing", valueClass: "text-rose-700" },
  { key: "warn", label: "Warnings", valueClass: "text-amber-700" },
  { key: "info", label: "Info", valueClass: "text-sky-700" },
] as const;

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
  const lastCheckedNote = `Last checked ${checkedAt}. No secrets are displayed on this page.`;

  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="standard">
        <MasterContentStack density="compact">
          <MasterPageHeader
            title="System Check"
            subtitle="Read-only production readiness checks for your workspace."
            density="compact"
            secondaryAction={
              <p className="min-w-0 hidden break-words text-xs text-slate-500 sm:block sm:max-w-xs sm:text-right">
                {lastCheckedNote}
              </p>
            }
          />

          <p className="text-xs text-slate-500 sm:hidden">{lastCheckedNote}</p>

          <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
            {SUMMARY_CARDS.map((card) => (
              <MasterPageSurface
                key={card.key}
                variant="card"
                className="min-w-0 p-3 sm:p-3.5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {card.label}
                </p>
                <p
                  className={`mt-1 truncate text-base font-bold sm:text-lg ${card.valueClass}`}
                >
                  {report.summary[card.key]}
                </p>
              </MasterPageSurface>
            ))}
          </div>

          <MasterPageSection
            title="Checks"
            description="These probes are read-only and safe to run in production."
            density="compact"
          >
            <MasterPageSurface
              variant="card"
              className="min-w-0 max-w-full overflow-x-clip"
            >
              {report.checks.map((check) => (
                <SystemCheckRow key={check.id} check={check} />
              ))}
            </MasterPageSurface>
          </MasterPageSection>

          <MasterPageSection
            title="Deploy documentation"
            description="Use the deployment checklists for Vercel env vars, Supabase Auth URLs, and the full smoke test."
            density="compact"
          >
            <MasterPageSurface
              variant="section"
              className="border-dashed border-slate-300 p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <CircleHelp className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <ul className="space-y-1 text-sm text-cyan-700">
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
            </MasterPageSurface>
          </MasterPageSection>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
