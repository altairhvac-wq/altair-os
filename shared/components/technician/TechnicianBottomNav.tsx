"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ActiveCompanyContext } from "@/lib/database/types";
import {
  getTechnicianNavItemForPath,
  getTechnicianNavItems,
} from "./nav-items";

type TechnicianBottomNavProps = {
  companyContext: ActiveCompanyContext;
};

/**
 * Fixed bottom tab bar — the only navigation in the technician shell.
 *
 * Phone audit 2026-10-24: tabs used to be a horizontally scrolling rail with
 * a 2px gap and no visible boundary between them, so adjacent tabs read as
 * one blended strip. Tabs are now equal-width (no scrolling at phone widths),
 * each one is a full-height 56px target, and the active tab carries both a
 * tinted pill and a bold label so it can be found without reading.
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
                  className={`relative flex min-h-14 w-full touch-manipulation flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 ${
                    isActive
                      ? "bg-cyan-50 text-cyan-700"
                      : "text-altair-ink-on-paper-muted hover:bg-slate-50/80 hover:text-slate-700 active:bg-slate-100/80"
                  }`}
                >
                  <Icon
                    className={`h-[22px] w-[22px] ${isActive ? "stroke-[2.5]" : ""}`}
                    aria-hidden="true"
                  />
                  <span
                    className={`w-full truncate text-center text-[11px] leading-none ${
                      isActive ? "font-bold" : "font-semibold"
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
