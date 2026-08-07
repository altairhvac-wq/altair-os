import Link from "next/link";
import {
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
import { AdminMobileHomeTopBar } from "@/shared/components/dashboard/AdminMobileHomeTopBar";
import { formatDateInTimeZone } from "@/shared/lib/datetime";

/**
 * Admin home — mobile-only launcher (md:hidden). Sidebar + calendar
 * buttons sandwich the date/greeting up top; below, a needs-attention
 * stack that only surfaces buckets with real work in them (desktop
 * dashboard parity) and the Today's board / Money glass widgets.
 * Navigation lives in the sidebar drawer. Every number comes straight
 * from DashboardData — nothing invented.
 */

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
    chip: "bg-rose-500/20 text-rose-300",
    count: "text-rose-300",
  },
  warning: {
    chip: "bg-amber-400/15 text-amber-300",
    count: "text-amber-300",
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
  companyContext: ActiveCompanyContext;
  userDisplayName: string;
  companyTimeZone?: string;
};

export function AdminMobileHome({
  data,
  companyContext,
  userDisplayName,
  companyTimeZone,
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
    <div className="min-h-[calc(100dvh-7rem)] bg-[radial-gradient(130%_90%_at_50%_-15%,#34353a_0%,#1c1d1f_48%,#0a0a0b_100%)] px-5 pb-12 pt-4">
      <AdminMobileHomeTopBar
        companyContext={companyContext}
        dateEyebrow={dateEyebrow}
        greeting={greetingLine}
      />

      {/* Needs attention — only buckets with real work surface here */}
      <section aria-label="Needs attention" className="mt-6">
        <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d4af37]">
          Needs attention
        </p>
        {attentionRows.length === 0 ? (
          <div className="mt-2 flex items-center gap-3 rounded-2xl bg-white/[0.07] px-3.5 py-3.5 ring-1 ring-inset ring-white/10">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            </span>
            <p className="text-sm font-semibold text-[#e6e8eb]">
              All caught up — nothing needs attention.
            </p>
          </div>
        ) : (
          <ul className="mt-2 space-y-2">
            {attentionRows.map((row) => {
              const Icon = row.icon;
              const tone = ATTENTION_TONE_CLASSES[row.tone];

              return (
                <li key={row.key}>
                  <Link
                    href={row.href}
                    className="flex touch-manipulation items-center gap-3 rounded-2xl bg-white/[0.07] px-3.5 py-3 ring-1 ring-inset ring-white/10 transition-colors active:bg-white/[0.12]"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.chip}`}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-white">
                        {row.label}
                      </span>
                      <span className="block truncate text-xs text-[#9b9fa6]">
                        {row.detail}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 text-lg font-bold tabular-nums ${tone.count}`}
                    >
                      {row.count}
                    </span>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-[#6b7075]"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Widgets */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link
          href="/dispatch"
          className="flex min-h-[9.5rem] touch-manipulation flex-col rounded-[1.5rem] bg-white/[0.07] p-4 ring-1 ring-inset ring-white/10 transition-colors active:bg-white/[0.12]"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d4af37]">
            Today&apos;s board
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums leading-none text-white">
            {operations.totalJobsToday}
          </p>
          <div className="mt-auto space-y-0.5 pt-3">
            <p className="text-[13px] font-semibold text-[#e6e8eb]">
              {operations.totalJobsToday === 1 ? "job today" : "jobs today"}
            </p>
            <p className="truncate text-xs text-[#9b9fa6]">{boardLine}</p>
          </div>
        </Link>

        <Link
          href="/sales"
          className="flex min-h-[9.5rem] touch-manipulation flex-col rounded-[1.5rem] bg-white/[0.07] p-4 ring-1 ring-inset ring-white/10 transition-colors active:bg-white/[0.12]"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d4af37]">
            Money
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums leading-none text-white">
            {hasOverdue
              ? formatWholeDollars(money.overdueTotal)
              : formatWholeDollars(money.paymentsTodayTotal)}
          </p>
          <div className="mt-auto space-y-0.5 pt-3">
            <p className="text-[13px] font-semibold text-[#e6e8eb]">
              {hasOverdue
                ? `${money.overdueCount} past due invoice${money.overdueCount === 1 ? "" : "s"}`
                : "collected today"}
            </p>
            {hasOverdue && money.paymentsTodayTotal > 0 ? (
              <p className="truncate text-xs text-[#9b9fa6]">
                {formatWholeDollars(money.paymentsTodayTotal)} collected today
              </p>
            ) : null}
          </div>
        </Link>
      </div>
    </div>
  );
}
