import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  ReceiptText,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { OnboardingChecklistSection } from "@/shared/components/onboarding/OnboardingChecklistSection";
import {
  altairMcListClass,
  altairMcListRowClass,
  altairMcTileClass,
} from "@/shared/design-system/components/mc-surface";
import {
  SettingsWorkspacePage,
  SettingsWorkspaceSection,
} from "@/shared/components/settings/SettingsWorkspacePage";
import type { OnboardingChecklist } from "@/shared/types/onboarding";

export type OverviewTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "brass";

export type SettingsOverviewStatusCard = {
  id: string;
  label: string;
  value: string;
  meta: string;
  href: string;
  tone: OverviewTone;
  icon: LucideIcon;
};

export type SettingsOverviewAttentionItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: Extract<OverviewTone, "warning" | "danger" | "info">;
};

export type SettingsOverviewReadinessMetric = {
  id: string;
  label: string;
  value: string;
  ok: boolean;
};

type SettingsOverviewViewProps = {
  /** @deprecated MC v2 is the settings surface; kept for call-site compatibility. */
  northStar?: boolean;
  companyName: string;
  statusCards: readonly SettingsOverviewStatusCard[];
  attentionItems: readonly SettingsOverviewAttentionItem[];
  readinessMetrics: readonly SettingsOverviewReadinessMetric[];
  onboardingChecklist: OnboardingChecklist;
  companyId: string;
  userId: string;
  showSystemCheck: boolean;
};

const TONE_DOT: Record<OverviewTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-sky-500",
  neutral: "bg-slate-400",
  brass: "bg-[#C9A44D]",
};

function HealthBanner({
  attentionCount,
  companyName,
}: {
  attentionCount: number;
  companyName: string;
}) {
  const healthy = attentionCount === 0;

  return (
    <div
      className={`flex min-w-0 items-start gap-3 rounded-none border px-3 py-3 sm:px-4 ${
        healthy
          ? "border-emerald-200 bg-emerald-50/80"
          : "border-amber-200 bg-amber-50/80"
      }`}
    >
      <span
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          healthy
            ? "bg-emerald-100 text-emerald-700"
            : "bg-amber-100 text-amber-800"
        }`}
      >
        {healthy ? (
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        ) : (
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-altair-ink">
          {healthy
            ? `${companyName} is in good shape`
            : `${attentionCount} item${attentionCount === 1 ? "" : "s"} need attention`}
        </p>
        <p className="mt-0.5 text-xs leading-5 text-altair-ink-secondary sm:text-sm">
          {healthy
            ? "Company, users, plan, and payments look ready. Review an area below when you need to change something."
            : "Resolve the items below to keep the workspace ready for day-to-day operations."}
        </p>
      </div>
    </div>
  );
}

function StatusCard({ card }: { card: SettingsOverviewStatusCard }) {
  const Icon = card.icon;

  return (
    <Link
      href={card.href}
      className={`${altairMcTileClass} group block transition-colors hover:border-altair-brass/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass focus-visible:ring-offset-2`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-section)] text-altair-ink-secondary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span
          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[card.tone]}`}
        />
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-altair-ink-muted">
        {card.label}
      </p>
      <p className="mt-1 truncate text-base font-bold text-altair-ink">
        {card.value}
      </p>
      <p className="mt-0.5 text-xs text-altair-ink-secondary">{card.meta}</p>
    </Link>
  );
}

export function SettingsOverviewView({
  companyName,
  statusCards,
  attentionItems,
  readinessMetrics,
  onboardingChecklist,
  companyId,
  userId,
  showSystemCheck,
}: SettingsOverviewViewProps) {
  return (
    <SettingsWorkspacePage
      title="Overview"
      description="Health, readiness, and the configuration that keeps your company running."
    >
      <HealthBanner
        attentionCount={attentionItems.length}
        companyName={companyName}
      />

      <SettingsWorkspaceSection
        title="Status"
        description="A live read on the areas that matter most."
        card={false}
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          {statusCards.map((card) => (
            <StatusCard key={card.id} card={card} />
          ))}
        </div>
      </SettingsWorkspaceSection>

      {attentionItems.length > 0 ? (
        <SettingsWorkspaceSection
          title="Needs attention"
          description="Start here — these items affect readiness or day-to-day operations."
          card={false}
        >
          <ul className={`${altairMcListClass} divide-y divide-altair-border`}>
            {attentionItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`${altairMcListRowClass} flex min-w-0 items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-altair-brass`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[item.tone]}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-altair-ink">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-altair-ink-secondary sm:text-sm">
                      {item.description}
                    </span>
                  </span>
                  <span className="mt-0.5 shrink-0 text-[11px] font-semibold text-altair-brass">
                    Fix
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </SettingsWorkspaceSection>
      ) : null}

      <OnboardingChecklistSection
        checklist={onboardingChecklist}
        companyId={companyId}
        userId={userId}
        variant="settings"
      />

      <SettingsWorkspaceSection
        title="Workspace pulse"
        description="Operational signals from your current setup — useful even when nothing needs fixing."
        card={false}
      >
        <dl className="grid gap-2.5 sm:grid-cols-2">
          {readinessMetrics.map((metric) => (
            <div
              key={metric.id}
              className={`${altairMcTileClass} flex min-w-0 items-center justify-between gap-3 !p-3`}
            >
              <dt className="min-w-0 text-xs font-medium text-altair-ink-secondary">
                {metric.label}
              </dt>
              <dd className="flex shrink-0 items-center gap-1.5">
                <span className="text-sm font-semibold text-altair-ink">
                  {metric.value}
                </span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    metric.ok ? TONE_DOT.success : TONE_DOT.neutral
                  }`}
                  aria-hidden="true"
                />
              </dd>
            </div>
          ))}
        </dl>
      </SettingsWorkspaceSection>

      {showSystemCheck ? (
        <Link
          href="/settings/system-check"
          className={`${altairMcTileClass} flex min-w-0 items-center justify-between gap-3 transition-colors hover:border-altair-brass/40`}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-section)] text-altair-ink-secondary">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-altair-ink">
                System Check
              </span>
              <span className="block text-xs text-altair-ink-secondary sm:text-sm">
                Run owner diagnostics when you need a production readiness pass.
              </span>
            </span>
          </span>
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-altair-ink-muted">
            Owner
          </span>
        </Link>
      ) : null}
    </SettingsWorkspacePage>
  );
}

/** Icon map kept with the overview so the page stays presentation-agnostic. */
export const SETTINGS_OVERVIEW_ICONS = {
  company: Building2,
  team: Users,
  subscription: ReceiptText,
  payments: CreditCard,
} as const;
