import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Receipt,
  Truck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ActiveCompanyContext } from "@/lib/database/types";
import type { DashboardData } from "@/shared/types/dashboard";
import { formatDateInTimeZone } from "@/shared/lib/datetime";
import { LiveOnboardingBanner } from "@/shared/components/support/LiveOnboardingBanner";
import type { LiveOnboardingInfo } from "@/shared/types/live-onboarding";

/**
 * Admin home on a phone (md:hidden): the greeting, a needs-attention list
 * that only shows buckets with real work in them (the same buckets as the
 * desktop dashboard), then today's board and money.
 *
 * UI audit 2026-11-12: this screen used to be a dark panel with its own menu
 * button, a second one beside the menu button in the top bar. Navigation is
 * now the tab bar at the bottom of the screen and nothing here repeats it.
 * The screen also uses the same paper cards as the desktop dashboard, so the
 * phone and the desktop read as one product.
 *
 * Every number comes straight from DashboardData. Nothing is invented.
 */

const CARD_CLASS =
  "overflow-hidden rounded-2xl border border-altair-border/40 bg-altair-paper shadow-[var(--elev-hairline),var(--elev-2)]";
const EYEBROW_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-altair-ink-on-paper-muted";

function formatWholeDollars(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

type AttentionTone = "danger" | "warning";

type AttentionRow = {
  key: string;
  href: string;
  icon: LucideIcon;
  label: string;
  detail: string;
  count: number;
  tone: AttentionTone;
};

const ATTENTION_TONE_CLASSES: Record<
  AttentionTone,
  { chip: string; count: string }
> = {
  danger: {
    chip: "bg-altair-danger-surface text-altair-danger",
    count: "text-altair-danger",
  },
  warning: {
    chip: "bg-altair-warning-surface text-altair-warning-foreground",
    count: "text-altair-warning-foreground",
  },
};

/** Desktop Needs Attention parity — same buckets, same sources. */
function buildAttentionRows(data: DashboardData): AttentionRow[] {
  const rows: AttentionRow[] = [];
  const { money, operations } = data;

  if (money.overdueCount > 0) {
    rows.push({
      key: "invoices",
      href: "/sales",
      icon: Receipt,
      label: "Invoices",
      detail: `${formatWholeDollars(money.overdueTotal)} past due`,
      count: money.overdueCount,
      tone: "danger",
    });
  }

  if (data.acceptedEstimatesNeedingScheduling.count > 0) {
    rows.push({
      key: "estimates",
      href: "/sales",
      icon: FileText,
      label: "Estimates",
      detail: "accepted — need scheduling or conversion",
      count: data.acceptedEstimatesNeedingScheduling.count,
      tone: "warning",
    });
  }

  if (operations.overloadedTechnicianCount > 0) {
    rows.push({
      key: "dispatch",
      href: "/dispatch",
      icon: Truck,
      label: "Dispatch",
      detail: "technicians with 2+ active jobs today",
      count: operations.overloadedTechnicianCount,
      tone: "warning",
    });
  }

  if (data.leadsNeedingContactQueue.count > 0) {
    rows.push({
      key: "leads",
      href: "/customers",
      icon: UserPlus,
      label: "Leads",
      detail: "need first contact or follow-up",
      count: data.leadsNeedingContactQueue.count,
      tone: "warning",
    });
  }

  if (data.staleOpenShifts.count > 0) {
    rows.push({
      key: "team",
      href: "/team",
      icon: Clock,
      label: "Team",
      detail: "open shifts clocked in 12+ hours",
      count: data.staleOpenShifts.count,
      tone: "warning",
    });
  }

  if (data.customersNeedingInfo.count > 0) {
    rows.push({
      key: "customers",
      href: "/customers",
      icon: Users,
      label: "Customers",
      detail: "missing email, phone, or address",
      count: data.customersNeedingInfo.count,
      tone: "warning",
    });
  }

  return rows;
}

type AdminMobileHomeProps = {
  data: DashboardData;
  /** Kept for callers; the screen no longer opens its own navigation. */
  companyContext?: ActiveCompanyContext;
  userDisplayName: string;
  companyTimeZone?: string;
  /** Live onboarding invitation; null outside a company's first weeks. */
  liveOnboarding?: LiveOnboardingInfo | null;
};

export function AdminMobileHome({
  data,
  userDisplayName,
  companyTimeZone,
  liveOnboarding = null,
}: AdminMobileHomeProps) {
  const attentionRows = buildAttentionRows(data);

  const now = new Date();
  const dateEyebrow = companyTimeZone
    ? formatDateInTimeZone(now, companyTimeZone, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : null;

  let greeting = "Hello";
  if (companyTimeZone) {
    const hourInZone = Number(
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hourCycle: "h23",
        timeZone: companyTimeZone,
      }).format(now),
    );
    greeting =
      hourInZone < 12
        ? "Good morning"
        : hourInZone < 17
          ? "Good afternoon"
          : "Good evening";
  }
  const greetingLine = `${greeting}, ${userDisplayName.split(" ")[0]}`;

  const { operations, money } = data;
  const boardLine =
    operations.totalJobsToday === 0
      ? "No jobs on the board"
      : `${operations.inProgress} in progress · ${operations.completedToday} done`;

  const hasOverdue = money.overdueCount > 0;

  return (
    <div data-testid="page-dashboard-mobile" className="space-y-4 px-1 pb-4 pt-1">
      {/* Greeting, and the one shortcut that is not a tab: today's schedule. */}
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {dateEyebrow ? <p className={EYEBROW_CLASS}>{dateEyebrow}</p> : null}
          <h1 className="mt-0.5 truncate text-[22px] font-bold leading-tight tracking-tight text-altair-ink-on-paper">
            {greetingLine}
          </h1>
        </div>
        <Link
          href="/schedule"
          aria-label="Today's schedule"
          className="inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-altair-border/40 bg-altair-paper text-altair-ink-on-paper-secondary shadow-[var(--elev-hairline)] transition-colors active:bg-altair-paper-subtle"
        >
          <CalendarDays className="h-5 w-5" aria-hidden />
        </Link>
      </header>

      {/* Needs attention: only buckets with real work surface here */}
      <section aria-label="Needs attention">
        <p className={EYEBROW_CLASS}>Needs attention</p>
        {attentionRows.length === 0 ? (
          <div className={`${CARD_CLASS} mt-2 flex items-center gap-3 px-3.5 py-3.5`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-altair-success-surface text-altair-success-foreground">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            </span>
            <p className="text-sm font-semibold text-altair-ink-on-paper">
              All caught up. Nothing needs attention.
            </p>
          </div>
        ) : (
          <ul className={`${CARD_CLASS} mt-2 divide-y divide-altair-border/30`}>
            {attentionRows.map((row) => {
              const Icon = row.icon;
              const tone = ATTENTION_TONE_CLASSES[row.tone];

              return (
                <li key={row.key}>
                  <Link
                    href={row.href}
                    className="flex min-h-14 touch-manipulation items-center gap-3 px-3.5 py-3 transition-colors active:bg-altair-paper-subtle"
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.chip}`}>
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold text-altair-ink-on-paper">
                        {row.label}
                      </span>
                      <span className="block text-[13px] leading-snug text-altair-ink-on-paper-secondary">
                        {row.detail}
                      </span>
                    </span>
                    <span className={`shrink-0 text-lg font-bold tabular-nums ${tone.count}`}>
                      {row.count}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-altair-ink-on-paper-muted" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Today's board and money: each opens its own screen. */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/dispatch"
          className={`${CARD_CLASS} flex min-h-[8.5rem] touch-manipulation flex-col p-4 transition-colors active:bg-altair-paper-subtle`}
        >
          <p className={EYEBROW_CLASS}>Today&apos;s board</p>
          <p className="mt-2 text-4xl font-bold tabular-nums leading-none text-altair-ink-on-paper">
            {operations.totalJobsToday}
          </p>
          <div className="mt-auto space-y-0.5 pt-3">
            <p className="text-[13px] font-semibold text-altair-ink-on-paper">
              {operations.totalJobsToday === 1 ? "job today" : "jobs today"}
            </p>
            <p className="truncate text-xs text-altair-ink-on-paper-secondary">{boardLine}</p>
          </div>
        </Link>

        <Link
          href="/sales"
          className={`${CARD_CLASS} flex min-h-[8.5rem] touch-manipulation flex-col p-4 transition-colors active:bg-altair-paper-subtle`}
        >
          <p className={EYEBROW_CLASS}>{hasOverdue ? "Past due" : "Collected today"}</p>
          <p className={`mt-2 text-3xl font-bold tabular-nums leading-none ${hasOverdue ? "text-altair-danger" : "text-altair-ink-on-paper"}`}>
            {hasOverdue
              ? formatWholeDollars(money.overdueTotal)
              : formatWholeDollars(money.paymentsTodayTotal)}
          </p>
          <div className="mt-auto space-y-0.5 pt-3">
            <p className="text-[13px] font-semibold text-altair-ink-on-paper">
              {hasOverdue
                ? `${money.overdueCount} invoice${money.overdueCount === 1 ? "" : "s"}`
                : "in payments"}
            </p>
            {hasOverdue ? (
              <p className="truncate text-xs text-altair-ink-on-paper-secondary">
                {formatWholeDollars(money.paymentsTodayTotal)} collected today
              </p>
            ) : null}
          </div>
        </Link>
      </div>

      {liveOnboarding ? <LiveOnboardingBanner info={liveOnboarding} /> : null}
    </div>
  );
}
