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
import { st } from "@/shared/components/settings/north-star-m10/settings-north-star-styles";
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
  northStar,
}: {
  attentionCount: number;
  companyName: string;
  northStar: boolean;
}) {
  const healthy = attentionCount === 0;

  return (
    <div
      className={
        northStar
          ? `flex min-w-0 items-start gap-3 rounded-[1rem] border px-3 py-3 sm:px-4 sm:py-3.5 ${
              healthy
                ? "border-[rgba(5,150,105,0.22)] bg-[rgba(236,253,245,0.72)]"
                : "border-[rgba(180,83,9,0.22)] bg-[rgba(255,247,237,0.85)]"
            }`
          : `flex min-w-0 items-start gap-3 rounded-xl border px-3 py-3 sm:px-4 ${
              healthy
                ? "border-emerald-200 bg-emerald-50/80"
                : "border-amber-200 bg-amber-50/80"
            }`
      }
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
        <p
          className={`text-sm font-semibold ${
            northStar ? "text-[#17130E]" : "text-altair-ink"
          }`}
        >
          {healthy
            ? `${companyName} is in good shape`
            : `${attentionCount} item${attentionCount === 1 ? "" : "s"} need attention`}
        </p>
        <p
          className={`mt-0.5 text-xs leading-5 sm:text-sm ${
            northStar ? "text-[#4F4638]" : "text-altair-ink-secondary"
          }`}
        >
          {healthy
            ? "Company, team, plan, and payments look ready. Review an area below when you need to change something."
            : "Resolve the items below to keep the workspace ready for day-to-day operations."}
        </p>
      </div>
    </div>
  );
}

function StatusCard({
  card,
  northStar,
}: {
  card: SettingsOverviewStatusCard;
  northStar: boolean;
}) {
  const Icon = card.icon;

  return (
    <Link
      href={card.href}
      className={
        northStar
          ? `${st.summaryCard} group block transition-colors hover:border-[rgba(201,164,77,0.35)] hover:bg-[#F3EBDD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass focus-visible:ring-offset-2`
          : "group block min-w-0 rounded-xl border border-altair-border bg-altair-paper-elevated p-3 shadow-sm transition-colors hover:border-altair-brass/40 hover:bg-altair-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass focus-visible:ring-offset-2 sm:p-3.5"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={
            northStar
              ? st.summaryIconWrap
              : "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-altair-paper-subtle text-altair-ink-secondary"
          }
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[card.tone]}`} />
      </div>
      <p
        className={
          northStar
            ? `${st.summaryLabel} mt-3`
            : "mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-altair-ink-muted"
        }
      >
        {card.label}
      </p>
      <p
        className={
          northStar
            ? "mt-1 truncate text-base font-bold text-[#17130E]"
            : "mt-1 truncate text-base font-bold text-altair-ink"
        }
      >
        {card.value}
      </p>
      <p className={northStar ? st.summaryMeta : "mt-0.5 text-xs text-altair-ink-secondary"}>
        {card.meta}
      </p>
    </Link>
  );
}

export function SettingsOverviewView({
  northStar = false,
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
      title="Workspace"
      description="Health, readiness, and the configuration that keeps your company running."
      northStar={northStar}
    >
      <HealthBanner
        attentionCount={attentionItems.length}
        companyName={companyName}
        northStar={northStar}
      />

      <SettingsWorkspaceSection
        title="Status"
        description="A live read on the areas that matter most."
        northStar={northStar}
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          {statusCards.map((card) => (
            <StatusCard key={card.id} card={card} northStar={northStar} />
          ))}
        </div>
      </SettingsWorkspaceSection>

      {attentionItems.length > 0 ? (
        <SettingsWorkspaceSection
          title="Needs attention"
          description="Start here — these items affect readiness or day-to-day operations."
          northStar={northStar}
        >
          <ul
            className={
              northStar
                ? "divide-y divide-[rgba(138,99,36,0.12)] overflow-hidden rounded-[1rem] border border-[rgba(138,99,36,0.14)] bg-[#FFF9EA]"
                : "divide-y divide-altair-border overflow-hidden rounded-xl border border-altair-border bg-altair-paper-elevated"
            }
          >
            {attentionItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`flex min-w-0 items-start gap-3 px-3 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-altair-brass sm:px-4 ${
                    northStar ? "hover:bg-[#F3EBDD]" : "hover:bg-altair-paper"
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[item.tone]}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm font-semibold ${
                        northStar ? "text-[#17130E]" : "text-altair-ink"
                      }`}
                    >
                      {item.title}
                    </span>
                    <span
                      className={`mt-0.5 block text-xs leading-5 sm:text-sm ${
                        northStar ? "text-[#4F4638]" : "text-altair-ink-secondary"
                      }`}
                    >
                      {item.description}
                    </span>
                  </span>
                  <span
                    className={`mt-0.5 shrink-0 text-[11px] font-semibold ${
                      northStar ? "text-[#8A6324]" : "text-altair-brass"
                    }`}
                  >
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
        northStar={northStar}
      />

      <SettingsWorkspaceSection
        title="Workspace pulse"
        description="Operational signals from your current setup — useful even when nothing needs fixing."
        northStar={northStar}
      >
        <dl
          className={
            northStar
              ? "grid gap-2.5 sm:grid-cols-2"
              : "grid gap-2.5 sm:grid-cols-2"
          }
        >
          {readinessMetrics.map((metric) => (
            <div
              key={metric.id}
              className={
                northStar
                  ? "flex min-w-0 items-center justify-between gap-3 rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] px-3 py-2.5"
                  : "flex min-w-0 items-center justify-between gap-3 rounded-xl border border-altair-border bg-altair-paper-elevated px-3 py-2.5"
              }
            >
              <dt
                className={`min-w-0 text-xs font-medium ${
                  northStar ? "text-[#4F4638]" : "text-altair-ink-secondary"
                }`}
              >
                {metric.label}
              </dt>
              <dd className="flex shrink-0 items-center gap-1.5">
                <span
                  className={`text-sm font-semibold ${
                    northStar ? "text-[#17130E]" : "text-altair-ink"
                  }`}
                >
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
          className={
            northStar
              ? st.systemCheckLink
              : "flex min-w-0 items-center justify-between gap-3 rounded-xl border border-altair-border bg-altair-paper-elevated px-3 py-3 transition-colors hover:border-altair-brass/40 hover:bg-altair-paper sm:px-4"
          }
        >
          <span className="flex min-w-0 items-center gap-3">
            <span
              className={
                northStar
                  ? st.systemCheckIconWrap
                  : "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-altair-paper-subtle text-altair-ink-secondary"
              }
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span
                className={
                  northStar
                    ? st.systemCheckTitle
                    : "block text-sm font-semibold text-altair-ink"
                }
              >
                System Check
              </span>
              <span
                className={
                  northStar
                    ? st.systemCheckDescription
                    : "block text-xs text-altair-ink-secondary sm:text-sm"
                }
              >
                Run owner diagnostics when you need a production readiness pass.
              </span>
            </span>
          </span>
          <span
            className={
              northStar
                ? st.systemCheckBadge
                : "shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-altair-ink-muted"
            }
          >
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
