"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ActiveCompanyContext } from "@/lib/database/types";
import type { TechnicianNavId } from "@/lib/database/access-control";
import {
  getTechnicianNavItemForPath,
  getTechnicianNavItems,
} from "./nav-items";

type TechnicianBottomNavProps = {
  companyContext: ActiveCompanyContext;
};

/**
 * One colour chip per destination. These are the home-screen app icons the
 * owner liked (2026-10-24): they moved here so they appear exactly once —
 * the tab bar IS the launcher now. Categorical colours, each walking a
 * canonical ramp; the white glyph clears 3:1 on every chip.
 */
const CHIP_CLASS: Record<TechnicianNavId, string> = {
  today: "bg-gradient-to-br from-[#4b5563] via-[#2f3640] to-[#171a1f]",
  schedule: "bg-gradient-to-br from-[#c2a05a] via-[#987836] to-[#5f4715]",
  jobs: "bg-gradient-to-br from-[#c2a05a] via-[#987836] to-[#5f4715]",
  time: "bg-gradient-to-br from-[#78939a] via-[#465c64] to-[#2f3b40]",
  receipts: "bg-gradient-to-br from-[#5fa07d] via-[#35755a] to-[#1f4733]",
  notifications: "bg-gradient-to-br from-[#cc6a5e] via-[#a64f2d] to-[#6f3520]",
  profile: "bg-gradient-to-br from-[#4b5563] via-[#2f3640] to-[#171a1f]",
};

/**
 * Fixed bottom tab bar — the only navigation in the technician shell.
 *
 * Phone audit 2026-10-24: the hamburger drawer, the home app grid and this
 * bar all listed the same destinations. The drawer and the grid are gone;
 * the grid's icon chips live here instead. Five equal-width tabs fit a
 * 320–430px phone without scrolling; each is a full-height 64px target.
 */
export function TechnicianBottomNav({
  companyContext,
}: TechnicianBottomNavProps) {
  const pathname = usePathname();
  const navItems = getTechnicianNavItems(companyContext);
  const activeItem = getTechnicianNavItemForPath(pathname, companyContext);

  return (
    <nav
      aria-label="Technician navigation"
      className="tech-bottom-nav fixed inset-x-0 bottom-0 z-30"
    >
      <div className="tech-shell-nav-inner mx-auto pb-[max(0.375rem,env(safe-area-inset-bottom,0px))] pt-1.5">
        <ul className="flex items-stretch gap-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeItem.id;

            return (
              <li key={item.id} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  data-testid={`tech-nav-${item.id}`}
                  className="group flex min-h-16 w-full touch-manipulation flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1 transition-colors active:bg-slate-100/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-[0.85rem] ${CHIP_CLASS[item.id]} shadow-[0_6px_14px_-6px_rgb(0_0_0_/_0.55)] ring-1 ring-inset ring-white/20 transition-[transform,opacity,box-shadow] group-active:scale-95 ${
                      isActive
                        ? "ring-2 ring-offset-2 ring-offset-white ring-[#c2a05a]"
                        : "opacity-80 saturate-[0.85]"
                    }`}
                  >
                    <Icon
                      className="h-[22px] w-[22px] text-white drop-shadow-sm"
                      aria-hidden="true"
                    />
                  </span>
                  <span
                    className={`w-full truncate text-center text-[11px] leading-none ${
                      isActive
                        ? "font-bold text-slate-900"
                        : "font-semibold text-altair-ink-on-paper-muted"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
