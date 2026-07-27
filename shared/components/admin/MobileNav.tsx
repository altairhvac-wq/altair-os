"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ActiveCompanyContext } from "@/lib/database/types";
import {
  adminNavLinkActiveClass,
  adminNavLinkClass,
} from "@/shared/design-system/shell/tokens";
import {
  getOrderedAdminNavItemsForMobile,
  isAdminNavItemActive,
  type NavItem,
} from "./nav-items";

type MobileNavLinkProps = {
  item: NavItem;
  active: boolean;
  linkRef?: React.Ref<HTMLAnchorElement>;
};

function MobileNavLink({ item, active, linkRef }: MobileNavLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      ref={linkRef}
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`${adminNavLinkClass} flex min-h-11 min-w-[4.75rem] max-w-[6.5rem] shrink-0 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 ${
        active
          ? `${adminNavLinkActiveClass} text-cyan-900`
          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
      }`}
    >
      <Icon
        className={`h-[18px] w-[18px] shrink-0 ${active ? "stroke-[2.5] text-cyan-700" : ""}`}
        aria-hidden="true"
      />
      <span className="w-full truncate text-center text-[11px] font-semibold leading-tight">
        {item.label}
      </span>
    </Link>
  );
}

type MobileNavProps = {
  companyContext: ActiveCompanyContext;
  showPlatformAdminNav?: boolean;
};

/**
 * Horizontally scrollable mobile destination rail.
 * Fixed to the bottom of the viewport on phones; hidden from md+ where desktop nav applies.
 */
export function MobileNav({
  companyContext,
  showPlatformAdminNav = false,
}: MobileNavProps) {
  const pathname = usePathname();
  const scrollerRef = useRef<HTMLUListElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement | null>(null);
  const navItems = getOrderedAdminNavItemsForMobile(companyContext, {
    includePlatformAdmin: showPlatformAdminNav,
  });

  useEffect(() => {
    const activeLink = activeLinkRef.current;
    if (!activeLink) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    activeLink.scrollIntoView({
      inline: "nearest",
      block: "nearest",
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [pathname]);

  return (
    <nav
      aria-label="Mobile navigation"
      className="admin-mobile-bottom-nav no-print fixed inset-x-0 bottom-0 z-30 md:hidden"
    >
      <div className="admin-mobile-bottom-nav-inner border-t border-slate-200/90 bg-white/95 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] pt-1.5 shadow-[0_-4px_24px_-8px_rgb(15_23_42_/_0.08)] backdrop-blur-md">
        <ul
          ref={scrollerRef}
          className="mobile-nav-rail-scroll flex w-full items-stretch gap-0.5 overflow-x-auto overscroll-x-contain px-1.5"
        >
          {navItems.map((item) => {
            const active = isAdminNavItemActive(pathname, item.href);

            return (
              <li key={item.href} className="shrink-0">
                <MobileNavLink
                  item={item}
                  active={active}
                  linkRef={active ? activeLinkRef : undefined}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
