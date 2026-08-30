import Link from "next/link";
import {
  Bell,
  CalendarDays,
  Clock,
  Receipt,
  type LucideIcon,
} from "lucide-react";

/**
 * Technician home — iOS-homescreen-style launcher.
 * Two glass widgets (Today / Time clock) over a dark graphite wallpaper,
 * then an app-icon grid of the technician tools. Every number shown is
 * real data passed from the server page — no fabricated stats.
 */

type TechnicianHomeTile = {
  href: string;
  label: string;
  icon: LucideIcon;
  chipClass: string;
};

/**
 * PRESTIGE: these four chips were authored as arbitrary hex gradients
 * (`#d4af37` metallic gold, `#22d3ee` cyan, `#34d399`, `#f59e0b`), so they
 * bypassed the palette entirely and stayed candy-bright while the rest of the
 * product moved. Four saturated gradients side by side is the "rainbow
 * gradients" failure, and `#d4af37` is the cheap gold this campaign exists to
 * remove.
 *
 * They stay four DIFFERENT colours — these are categorical navigation targets
 * and a technician picks them by colour at a glance — but they now walk the
 * canonical ramps. The mid stop of each was also darkened deliberately: the
 * white glyph sat at ~1.9:1 on the old gold, which was a legibility bug on a
 * one-handed field surface, and now clears 3:1 on every chip.
 */
const HOME_TILES: TechnicianHomeTile[] = [
  {
    href: "/technician/schedule",
    label: "Schedule",
    icon: CalendarDays,
    chipClass: "bg-gradient-to-br from-[#c2a05a] via-[#987836] to-[#5f4715]",
  },
  {
    href: "/tech/time",
    label: "Time",
    icon: Clock,
    chipClass: "bg-gradient-to-br from-[#78939a] via-[#465c64] to-[#2f3b40]",
  },
  {
    href: "/tech/receipts",
    label: "Receipts",
    icon: Receipt,
    chipClass: "bg-gradient-to-br from-[#5fa07d] via-[#35755a] to-[#1f4733]",
  },
  {
    href: "/tech/notifications",
    label: "Alerts",
    icon: Bell,
    chipClass: "bg-gradient-to-br from-[#cc6a5e] via-[#a64f2d] to-[#6f3520]",
  },
];

type TechnicianHomeScreenProps = {
  greeting: string;
  weekdayLabel: string;
  monthLabel: string;
  dayOfMonth: number;
  openJobCount: number;
  completedTodayCount: number;
  nextJobTimeLabel: string | null;
  nextJobCustomerName: string | null;
  timeStateLabel: string;
  timeStateDotClass: string;
  clockedSinceLabel: string | null;
};

export function TechnicianHomeScreen({
  greeting,
  weekdayLabel,
  monthLabel,
  dayOfMonth,
  openJobCount,
  completedTodayCount,
  nextJobTimeLabel,
  nextJobCustomerName,
  timeStateLabel,
  timeStateDotClass,
  clockedSinceLabel,
}: TechnicianHomeScreenProps) {
  const openJobsLine =
    openJobCount === 0 && completedTodayCount === 0
      ? "Nothing scheduled"
      : `${openJobCount} open job${openJobCount === 1 ? "" : "s"}${
          completedTodayCount > 0
            ? ` · ${completedTodayCount} done`
            : ""
        }`;

  return (
    <div className="-mx-4 -mt-4 -mb-[max(6rem,calc(5.5rem+env(safe-area-inset-bottom,0px)))] min-h-[calc(100dvh-3.5rem)] bg-[radial-gradient(130%_90%_at_50%_-15%,#333631_0%,#1c1e1b_48%,#0a0a09_100%)] px-5 pb-[max(8rem,calc(7rem+env(safe-area-inset-bottom,0px)))] pt-6 sm:-mx-5 sm:-mt-5">
      {/* Greeting */}
      <header className="px-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">
          {weekdayLabel}, {monthLabel} {dayOfMonth}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
          {greeting}
        </h1>
      </header>

      {/* Widgets */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link
          href="/technician/schedule"
          className="group flex min-h-[9.5rem] touch-manipulation flex-col rounded-[1.5rem] bg-white/[0.07] p-4 ring-1 ring-inset ring-white/10 transition-colors active:bg-white/[0.12]"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c2a05a]">
            Today
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums leading-none text-white">
            {dayOfMonth}
          </p>
          <div className="mt-auto space-y-0.5 pt-3">
            <p className="text-[13px] font-semibold text-[#e9e8e4]">
              {openJobsLine}
            </p>
            {nextJobTimeLabel ? (
              <p className="truncate text-xs text-[#9b9fa6]">
                Next · {nextJobTimeLabel}
                {nextJobCustomerName ? ` · ${nextJobCustomerName}` : ""}
              </p>
            ) : null}
          </div>
        </Link>

        <Link
          href="/tech/time"
          className="group flex min-h-[9.5rem] touch-manipulation flex-col rounded-[1.5rem] bg-white/[0.07] p-4 ring-1 ring-inset ring-white/10 transition-colors active:bg-white/[0.12]"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c2a05a]">
            Time clock
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${timeStateDotClass}`}
              aria-hidden
            />
            <p className="text-lg font-bold leading-tight text-white">
              {timeStateLabel}
            </p>
          </div>
          <div className="mt-auto pt-3">
            <p className="text-xs text-[#9b9fa6]">
              {clockedSinceLabel
                ? `Since ${clockedSinceLabel}`
                : "Tap to open the time clock"}
            </p>
          </div>
        </Link>
      </div>

      {/* App grid */}
      <nav aria-label="Technician tools" className="mt-8">
        <ul className="grid grid-cols-4 gap-x-2 gap-y-6">
          {HOME_TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <li key={tile.href} className="min-w-0">
                <Link
                  href={tile.href}
                  className="group flex touch-manipulation flex-col items-center gap-1.5 outline-none"
                >
                  <span
                    className={`flex h-16 w-16 items-center justify-center rounded-[1.35rem] ${tile.chipClass} shadow-[0_8px_20px_-8px_rgb(0_0_0_/_0.6)] ring-1 ring-inset ring-white/20 transition-transform group-active:scale-95`}
                  >
                    <Icon className="h-7 w-7 text-white drop-shadow-sm" aria-hidden />
                  </span>
                  <span className="w-full truncate text-center text-[11px] font-medium text-[#d7d3cc]">
                    {tile.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
