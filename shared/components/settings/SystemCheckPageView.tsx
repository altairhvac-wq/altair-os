import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  MinusCircle,
  XCircle,
} from "lucide-react";
import type {
  SystemCheckReport,
  SystemCheckResult,
  SystemCheckStatus,
} from "@/lib/system-check/types";
import { altairMcListClass } from "@/shared/design-system/components/mc-surface";
import {
  SettingsWorkspacePage,
  SettingsWorkspaceSection,
} from "./SettingsWorkspacePage";

/**
 * System check, written for a company owner (UI audit 2026-11-12, item A10).
 *
 * The checks themselves are about Altair's hosting: server settings, database
 * functions, storage. This page used to print them raw, so an owner read
 * names of server settings, a command-line instruction and repository paths,
 * none of which an owner can act on.
 *
 * An owner has three questions: is my workspace working, can I email my
 * customers, can I take a card. The page answers those in plain words. The
 * checks that are Altair's own business are rolled into one line. The raw list
 * is still here for the people who run the platform (`showTechnicalDetail`),
 * and for nobody else.
 */

type SystemCheckPageViewProps = {
  report: SystemCheckReport;
  /** Platform admins only: the raw checks, with setting names and hints. */
  showTechnicalDetail?: boolean;
};

type OwnerState = "working" | "off" | "problem";

type OwnerItem = {
  id: string;
  title: string;
  /** Sentence shown for each state this item can be in. */
  working: string;
  off?: string;
  problem: string;
};

/** Things the workspace cannot run without. Anything short of a pass is a problem. */
const WORKSPACE_ITEMS: OwnerItem[] = [
  {
    id: "supabase-connection",
    title: "Your sign-in",
    working: "You are signed in and Altair can reach your data.",
    problem:
      "Altair could not confirm your sign-in. Sign out and sign back in.",
  },
  {
    id: "company-context",
    title: "Your company",
    working: "Your company workspace is loaded.",
    problem: "Altair could not load your company workspace.",
  },
  {
    id: "user-profile",
    title: "Your profile",
    working: "Your name and role are loaded.",
    problem: "Altair could not load your profile.",
  },
  {
    id: "storage-bucket",
    title: "Photos and files",
    working: "Photos, receipts and documents can be saved.",
    problem: "Photos, receipts and documents cannot be saved right now.",
  },
];

/** Things that can be switched off without the workspace being broken. */
const FEATURE_ITEMS: OwnerItem[] = [
  {
    id: "env-outbound-email",
    title: "Emailing estimates and invoices",
    working: "On. Estimates and invoices can be emailed to your customers.",
    off: "Not switched on yet. Estimates and invoices stay as drafts until it is.",
    problem:
      "Email is not working. Estimates and invoices cannot be sent right now.",
  },
  {
    id: "env-stripe-checkout",
    title: "Online card payments",
    working:
      "On. Connect your own Stripe account under Billing and customers can pay invoices by card.",
    off: "Not switched on yet. You can still record cash, checks and other payments by hand.",
    problem: "Online card payments are not working right now.",
  },
  {
    id: "ai-config",
    title: "Writing help",
    working: "On. Altair can draft messages and summaries for you.",
    off: "Off. Everything else works without it.",
    problem: "Writing help is not working right now.",
  },
];

const OWNER_ITEM_IDS = new Set(
  [...WORKSPACE_ITEMS, ...FEATURE_ITEMS].map((item) => item.id),
);

function workspaceState(status: SystemCheckStatus | undefined): OwnerState {
  return status === "pass" ? "working" : "problem";
}

function featureState(status: SystemCheckStatus | undefined): OwnerState {
  if (status === "pass") return "working";
  if (status === "fail") return "problem";
  return "off";
}

const STATE_META: Record<
  OwnerState,
  { label: string; icon: typeof CheckCircle2; iconClass: string; labelClass: string }
> = {
  working: {
    label: "Working",
    icon: CheckCircle2,
    iconClass: "text-altair-success",
    labelClass: "text-altair-success",
  },
  off: {
    label: "Not on",
    icon: MinusCircle,
    iconClass: "text-altair-ink-muted",
    labelClass: "text-altair-ink-secondary",
  },
  problem: {
    label: "Needs attention",
    icon: AlertTriangle,
    iconClass: "text-altair-danger",
    labelClass: "text-altair-danger",
  },
};

function OwnerRow({
  title,
  sentence,
  state,
  testId,
}: {
  title: string;
  sentence: string;
  state: OwnerState;
  testId: string;
}) {
  const meta = STATE_META[state];
  const Icon = meta.icon;

  return (
    <li
      className="flex items-start gap-3 border-b border-altair-border px-3.5 py-3.5 last:border-b-0"
      data-testid={testId}
      data-state={state}
    >
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${meta.iconClass}`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <h4 className="text-sm font-semibold text-altair-ink">{title}</h4>
          <span className={`text-[13px] font-semibold ${meta.labelClass}`}>
            {meta.label}
          </span>
        </div>
        <p className="mt-0.5 text-[13px] leading-relaxed text-altair-ink-secondary">
          {sentence}
        </p>
      </div>
    </li>
  );
}

const TECHNICAL_STATUS_META: Record<
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

function TechnicalRow({ check }: { check: SystemCheckResult }) {
  const meta = TECHNICAL_STATUS_META[check.status];
  const Icon = meta.icon;

  return (
    <div className="border-b border-altair-border px-3.5 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-altair-ink">{check.label}</h4>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.className}`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {meta.label}
        </span>
      </div>
      <p className="mt-1.5 break-words text-[13px] text-altair-ink-secondary">
        {check.message}
      </p>
      {check.hint ? (
        <p className="mt-1 break-words text-[13px] text-altair-ink-muted">
          {check.hint}
        </p>
      ) : null}
    </div>
  );
}

export function SystemCheckPageView({
  report,
  showTechnicalDetail = false,
}: SystemCheckPageViewProps) {
  const byId = new Map(report.checks.map((check) => [check.id, check]));

  const workspaceRows = WORKSPACE_ITEMS.map((item) => ({
    item,
    state: workspaceState(byId.get(item.id)?.status),
  }));
  const featureRows = FEATURE_ITEMS.map((item) => ({
    item,
    state: featureState(byId.get(item.id)?.status),
  }));

  // Everything else is about Altair's own hosting, not this company.
  const platformChecks = report.checks.filter(
    (check) => !OWNER_ITEM_IDS.has(check.id),
  );
  const platformFailing = platformChecks.filter(
    (check) => check.status === "fail",
  ).length;

  const problemCount =
    workspaceRows.filter((row) => row.state === "problem").length +
    featureRows.filter((row) => row.state === "problem").length;
  const allClear = problemCount === 0 && platformFailing === 0;

  const checkedAt = new Date(report.checkedAt).toLocaleString();

  return (
    <SettingsWorkspacePage
      title="System check"
      description="Whether your workspace is working, and what it can do for you today."
    >
      <div
        className={`flex items-start gap-3 rounded-[var(--radius-panel)] border px-4 py-3.5 ${
          allClear
            ? "border-altair-success/30 bg-altair-success-surface"
            : "border-altair-danger/30 bg-altair-danger-surface"
        }`}
        data-testid="system-check-verdict"
        data-all-clear={allClear}
      >
        {allClear ? (
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-altair-success"
            aria-hidden="true"
          />
        ) : (
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-altair-danger"
            aria-hidden="true"
          />
        )}
        <div className="min-w-0">
          <p className="text-sm font-bold text-altair-ink">
            {allClear
              ? "Your workspace is working."
              : problemCount > 0
                ? problemCount === 1
                  ? "One thing needs attention."
                  : `${problemCount} things need attention.`
                : "Altair has a problem on its side."}
          </p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-altair-ink-secondary">
            {allClear
              ? "Nothing here needs you. Anything marked Not on is a feature that is switched off, not a fault."
              : "If it is still like this in a few minutes, tell us from the Help page and we will fix it."}
          </p>
          <p className="mt-1.5 text-xs text-altair-ink-muted">
            Checked {checkedAt}. Open this page again to check again.
          </p>
        </div>
      </div>

      <SettingsWorkspaceSection
        title="Your workspace"
        description="What Altair needs in order to run for your company."
        card={false}
      >
        <ul className={`${altairMcListClass} max-w-full overflow-x-clip`}>
          {workspaceRows.map(({ item, state }) => (
            <OwnerRow
              key={item.id}
              testId={`system-check-${item.id}`}
              title={item.title}
              state={state}
              sentence={state === "working" ? item.working : item.problem}
            />
          ))}
        </ul>
      </SettingsWorkspaceSection>

      <SettingsWorkspaceSection
        title="What your workspace can do today"
        description="Features Altair switches on for you. One that is not on is not a fault."
        card={false}
      >
        <ul className={`${altairMcListClass} max-w-full overflow-x-clip`}>
          {featureRows.map(({ item, state }) => (
            <OwnerRow
              key={item.id}
              testId={`system-check-${item.id}`}
              title={item.title}
              state={state}
              sentence={
                state === "working"
                  ? item.working
                  : state === "off"
                    ? (item.off ?? item.problem)
                    : item.problem
              }
            />
          ))}
          <OwnerRow
            testId="system-check-platform"
            title="Altair's own setup"
            state={platformFailing > 0 ? "problem" : "working"}
            sentence={
              platformFailing > 0
                ? "Something on Altair's side is not right. It is ours to fix, not yours."
                : "The servers and database behind your workspace are in order."
            }
          />
        </ul>
        <p className="mt-3 text-[13px] text-altair-ink-secondary">
          Want something switched on, or is something not working?{" "}
          <Link
            href="/help"
            className="font-semibold text-altair-ink underline underline-offset-2 hover:text-[var(--brand-metal-text)]"
          >
            Go to Help
          </Link>
          .
        </p>
      </SettingsWorkspaceSection>

      {showTechnicalDetail ? (
        <SettingsWorkspaceSection
          title="Technical detail"
          description="Shown to Altair platform admins only. Read-only checks; no secrets are displayed."
          card={false}
        >
          <details data-testid="system-check-technical">
            <summary className="cursor-pointer text-[13px] font-semibold text-altair-ink">
              All {report.checks.length} checks: {report.summary.pass} pass,{" "}
              {report.summary.fail} fail, {report.summary.warn} warn,{" "}
              {report.summary.info} info
            </summary>
            <div
              className={`${altairMcListClass} mt-3 max-w-full overflow-x-clip`}
            >
              {report.checks.map((check) => (
                <TechnicalRow key={check.id} check={check} />
              ))}
            </div>
            <p className="mt-3 text-xs text-altair-ink-muted">
              Deployment checklists: docs/reference/internal-alpha-deployment-checklist.md
              and docs/reference/internal-alpha-smoke-test.md in the repository.
            </p>
          </details>
        </SettingsWorkspaceSection>
      ) : null}
    </SettingsWorkspacePage>
  );
}
