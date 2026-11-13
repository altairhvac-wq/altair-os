import Link from "next/link";
import {
  ChevronRight,
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

// Semantic tokens only (altair-tokens.ts) — status dots must carry meaning,
// never ad-hoc palette hexes. Brass rides the shared brand token.
const TONE_DOT: Record<OverviewTone, string> = {
  success: "bg-altair-success",
  warning: "bg-altair-warning",
  danger: "bg-altair-danger",
  info: "bg-altair-information",
  neutral: "bg-altair-ink-muted",
  brass: "bg-altair-brass",
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
          ? "border-altair-success/30 bg-altair-success-surface"
          : "border-altair-warning/30 bg-altair-warning-surface"
      }`}
    >
      <span
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          healthy
            ? "bg-altair-success/15 text-altair-success-foreground"
            : "bg-altair-warning/15 text-altair-warning-foreground"
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
            : `${attentionCount} ${
                attentionCount === 1 ? "item needs" : "items need"
              } attention`}
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
      className={`${altairMcTileClass} group flex min-w-0 items-center gap-3 transition-colors hover:border-altair-brass/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-section)] text-altair-ink-secondary">
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-altair-ink-secondary">
          {card.label}
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT[card.tone]}`}
            aria-hidden="true"
          />
          <span className="truncate text-[15px] font-bold text-altair-ink">
            {card.value}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-altair-ink-secondary">
          {card.meta}
        </span>
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-altair-ink-muted transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}

export function SettingsOverviewView({
  companyName,
  statusCards,
  attentionItems,
  onboardingChecklist,
  companyId,
  userId,
  showSystemCheck,
}: SettingsOverviewViewProps) {
  return (
    <SettingsWorkspacePage
      title="Overview"
      description="What is set up, and what still needs you."
    >
      {/*
       * Each problem is stated once, with the button that fixes it (UI audit
       * 2026-11-12: the same two problems used to appear in a banner, a
       * status card, this list and a fourth row, with two tiny "Fix" links
       * between them). When nothing needs attention, the banner says so.
       */}
      {attentionItems.length > 0 ? (
        <SettingsWorkspaceSection
          title={`${attentionItems.length} ${attentionItems.length === 1 ? "thing needs" : "things need"} you`}
          description="Each one affects how the workspace runs day to day."
          card={false}
        >
          <ul className={`${altairMcListClass} divide-y divide-altair-border`}>
            {attentionItems.map((item) => (
              <li key={item.id} className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 px-3 py-3 sm:px-4">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT[item.tone]}`}
                  aria-hidden="true"
                />
                <span className="min-w-[12rem] flex-1">
                  <span className="block text-sm font-semibold text-altair-ink">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-altair-ink-secondary">
                    {item.description}
                  </span>
                </span>
                <Link
                  href={item.href}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-altair-border/60 bg-altair-paper px-3.5 text-[13px] font-semibold text-altair-ink-on-paper shadow-[var(--elev-hairline)] transition-colors hover:bg-altair-paper-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  Fix this
                  <span className="sr-only">: {item.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </SettingsWorkspaceSection>
      ) : (
        <HealthBanner attentionCount={0} companyName={companyName} />
      )}

      <SettingsWorkspaceSection
        title="Where things stand"
        description="Open an area to change it."
        card={false}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {statusCards.map((card) => (
            <StatusCard key={card.id} card={card} />
          ))}
        </div>
      </SettingsWorkspaceSection>

      <OnboardingChecklistSection
        checklist={onboardingChecklist}
        companyId={companyId}
        userId={userId}
        variant="settings"
      />

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
                System check
              </span>
              <span className="block text-[13px] text-altair-ink-secondary">
                Technical diagnostics. Written for whoever set up the system, not for daily use.
              </span>
            </span>
          </span>
          <span className="shrink-0 text-xs font-semibold text-altair-ink-muted">
            Owner only
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
