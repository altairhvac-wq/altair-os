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
  altairMcCardClass,
  altairMcCardPadClass,
  altairMcListClass,
  altairMcTileClass,
} from "@/shared/design-system/components/mc-surface";
import {
  SettingsWorkspacePage,
  SettingsWorkspaceSection,
} from "./SettingsWorkspacePage";

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
    <div className="flex flex-col gap-3 border-b border-altair-border px-3.5 py-3.5 last:border-b-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-altair-ink">{check.label}</h3>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.className}`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {meta.label}
          </span>
        </div>
        <p className="mt-2 text-sm text-altair-ink-secondary">{check.message}</p>
        {check.hint ? (
          <p className="mt-2 text-sm text-altair-ink-muted">{check.hint}</p>
        ) : null}
      </div>
    </div>
  );
}

export function SystemCheckPageView({ report }: SystemCheckPageViewProps) {
  const checkedAt = new Date(report.checkedAt).toLocaleString();
  const lastCheckedNote = `Last checked ${checkedAt}. No secrets are displayed on this page.`;

  return (
    <SettingsWorkspacePage
      title="System Check"
      description="Read-only production readiness checks for your workspace."
    >
      <p className="text-xs text-altair-ink-muted">{lastCheckedNote}</p>

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {SUMMARY_CARDS.map((card) => (
          <div key={card.key} className={altairMcTileClass}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-altair-ink-muted">
              {card.label}
            </p>
            <p
              className={`mt-1 truncate text-base font-bold sm:text-lg ${card.valueClass}`}
            >
              {report.summary[card.key]}
            </p>
          </div>
        ))}
      </div>

      <SettingsWorkspaceSection
        title="Checks"
        description="These probes are read-only and safe to run in production."
        card={false}
      >
        <div className={`${altairMcListClass} max-w-full overflow-x-clip`}>
          {report.checks.map((check) => (
            <SystemCheckRow key={check.id} check={check} />
          ))}
        </div>
      </SettingsWorkspaceSection>

      <SettingsWorkspaceSection
        title="Deploy documentation"
        description="Use the deployment checklists for Vercel env vars, Supabase Auth URLs, and the full smoke test."
        card={false}
      >
        <div
          className={`${altairMcCardClass} ${altairMcCardPadClass} border-dashed`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-tile)] text-altair-ink-muted">
              <CircleHelp className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <ul className="space-y-1 text-sm font-medium text-altair-ink">
                <li>
                  <Link
                    href="/settings"
                    className="underline-offset-2 hover:underline"
                  >
                    Back to Settings Overview
                  </Link>
                </li>
              </ul>
              <p className="mt-3 text-xs text-altair-ink-muted">
                See docs/reference/internal-alpha-deployment-checklist.md and
                docs/reference/internal-alpha-smoke-test.md in the repository.
              </p>
            </div>
          </div>
        </div>
      </SettingsWorkspaceSection>
    </SettingsWorkspacePage>
  );
}
