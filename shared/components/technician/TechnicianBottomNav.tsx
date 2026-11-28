"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ActiveCompanyContext } from "@/lib/database/types";
import { useTechnicianNotificationBadge } from "@/shared/components/notifications/TechnicianNotificationBadgeContext";
import {
  getTechnicianNavItemForPath,
  getTechnicianNavItems,
} from "./nav-items";

type TechnicianBottomNavProps = {
  companyContext: ActiveCompanyContext;
};

/**
 * Fixed bottom tab bar: the only navigation in the technician shell.
 *
 * Five equal tabs that fill the width (no sideways scrolling, no empty
 * slot), each a full 56px target at the bottom of the screen where a thumb
 * reaches. The active tab carries a tinted pill, the brass icon and a bold
 * label, so it can be found without reading. The unread alert count rides on
 * the Alerts tab; there is no second bell in the header.
 */
export function TechnicianBottomNav({
  companyContext,
}: TechnicianBottomNavProps) {
  const pathname = usePathname();
  const navItems = getTechnicianNavItems(companyContext);
  const activeItem = getTechnicianNavItemForPath(pathname, companyContext);
  const { unreadCount } = useTechnicianNotificationBadge();

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
            const badge =
              item.id === "notifications" && unreadCount > 0
                ? unreadCount > 9
                  ? "9+"
                  : String(unreadCount)
                : null;

            return (
              <li key={item.id} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={
                    badge ? `${item.label}, ${unreadCount} unread` : undefined
                  }
                  data-testid={`tech-nav-${item.id}`}
                  className={`relative flex min-h-14 w-full touch-manipulation flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-altair-brass ${
                    isActive
                      ? "bg-altair-brass/15 text-altair-ink-on-paper"
                      : "text-altair-ink-on-paper-muted active:bg-altair-paper-subtle"
                  }`}
                >
                  <span className="relative">
                    <Icon
                      className={`h-[22px] w-[22px] ${
                        isActive
                          ? "stroke-[2.25] text-[var(--brand-metal-text)]"
                          : ""
                      }`}
                      aria-hidden="true"
                    />
                    {badge ? (
                      <span
                        aria-hidden="true"
                        className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--chrome-elevated)] px-1 text-[10px] font-bold leading-none text-white"
                      >
                        {badge}
                      </span>
                    ) : null}
                  </span>
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
