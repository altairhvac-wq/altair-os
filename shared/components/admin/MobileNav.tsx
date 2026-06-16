"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import type { ActiveCompanyContext } from "@/lib/database/types";
import {
  adminNavLinkActiveClass,
  adminNavLinkClass,
} from "@/shared/design-system/shell/tokens";
import {
  isLaborPayrollPath,
  platformAdminNavItem,
  splitAdminNavItemsForMobile,
  type NavItem,
} from "./nav-items";

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/time" && isLaborPayrollPath(pathname)) {
    return true;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

type MobileNavLinkProps = {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
};

type MobileNavLinkDensity = "default" | "compact";

function MobileNavLink({
  item,
  active,
  onNavigate,
  density = "default",
}: MobileNavLinkProps & { density?: MobileNavLinkDensity }) {
  const Icon = item.icon;
  const compact = density === "compact";

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`${adminNavLinkClass} flex min-w-0 flex-1 touch-manipulation flex-col items-center justify-center rounded-lg px-0.5 ${
        compact ? "min-h-10 gap-0.5" : "min-h-11 gap-0.5"
      } ${
        active
          ? `${adminNavLinkActiveClass} text-cyan-900`
          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
      }`}
    >
      <Icon
        className={`shrink-0 ${compact ? "h-4 w-4" : "h-4 w-4"} ${active ? "stroke-[2.5] text-cyan-700" : ""}`}
      />
      <span
        className={`w-full truncate text-center font-semibold leading-tight ${
          compact ? "text-[10px]" : "text-[10px]"
        }`}
      >
        {item.label}
      </span>
    </Link>
  );
}

type MobileNavProps = {
  companyContext: ActiveCompanyContext;
  showPlatformAdminNav?: boolean;
};

export function MobileNav({
  companyContext,
  showPlatformAdminNav = false,
}: MobileNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const { primaryRows, secondary: baseSecondary } =
    splitAdminNavItemsForMobile(companyContext);
  const secondary = showPlatformAdminNav
    ? [...baseSecondary, platformAdminNavItem]
    : baseSecondary;
  const moreActiveItem = secondary.find((item) =>
    isActivePath(pathname, item.href),
  );
  const moreActive = Boolean(moreActiveItem);
  const compactMoreMode = moreActive && !moreOpen;
  const showSecondRow =
    !compactMoreMode &&
    (primaryRows[1].length > 0 || secondary.length > 0);
  const navDensity: MobileNavLinkDensity = compactMoreMode ? "compact" : "default";

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMoreOpen(false);
      }
    }

    function handlePointerDown(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [moreOpen]);

  return (
    <nav
      ref={navRef}
      aria-label="Mobile navigation"
      className={`relative w-full max-w-full shrink-0 border-b border-slate-200/90 bg-white shadow-[0_1px_2px_rgb(15_23_42_/_0.03)] md:hidden ${
        moreOpen ? "z-50" : "z-30"
      }`}
    >
      <div
        className={`flex flex-col px-1 ${compactMoreMode ? "gap-0 py-1" : "gap-0.5 py-1"}`}
      >
        <ul className="flex w-full items-stretch gap-0.5">
          {primaryRows[0].map((item) => (
            <li key={item.href} className="flex min-w-0 flex-1">
              <MobileNavLink
                item={item}
                active={isActivePath(pathname, item.href)}
                density={navDensity}
              />
            </li>
          ))}

          {compactMoreMode && moreActiveItem ? (
            <li className="flex min-w-0 flex-[1.15]">
              <Link
                href={moreActiveItem.href}
                aria-current="page"
                className={`${adminNavLinkClass} ${adminNavLinkActiveClass} flex min-h-10 w-full min-w-0 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-cyan-900`}
              >
                <moreActiveItem.icon className="h-4 w-4 shrink-0 stroke-[2.5] text-cyan-700" />
                <span className="w-full truncate text-center text-[10px] font-semibold leading-tight">
                  {moreActiveItem.label}
                </span>
              </Link>
            </li>
          ) : null}

          {compactMoreMode && secondary.length > 0 ? (
            <li className="flex min-w-0 flex-none">
              <button
                type="button"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                aria-label="More navigation"
                onClick={() => setMoreOpen((open) => !open)}
                className={`${adminNavLinkClass} flex min-h-10 min-w-[2.75rem] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-slate-600 hover:bg-slate-50 hover:text-slate-900`}
              >
                <MoreHorizontal className="h-4 w-4 shrink-0" />
                <span className="text-[10px] font-semibold leading-tight">
                  More
                </span>
              </button>
            </li>
          ) : null}
        </ul>

        {showSecondRow ? (
          <ul className="flex w-full items-stretch gap-0.5">
            {primaryRows[1].map((item) => (
              <li key={item.href} className="flex min-w-0 flex-1">
                <MobileNavLink
                  item={item}
                  active={isActivePath(pathname, item.href)}
                  density={navDensity}
                />
              </li>
            ))}

            {secondary.length > 0 ? (
              <li className="flex min-w-0 flex-1">
                <button
                  type="button"
                  aria-expanded={moreOpen}
                  aria-haspopup="menu"
                  aria-label="More navigation"
                  onClick={() => setMoreOpen((open) => !open)}
                  className={`${adminNavLinkClass} flex min-h-11 w-full min-w-0 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 ${
                    moreActive || moreOpen
                      ? `${adminNavLinkActiveClass} text-cyan-800`
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <MoreHorizontal
                    className={`h-4 w-4 shrink-0 ${moreActive || moreOpen ? "stroke-[2.5] text-cyan-700" : ""}`}
                  />
                  <span className="w-full truncate text-center text-[10px] font-semibold leading-tight">
                    More
                  </span>
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      {moreOpen && secondary.length > 0 ? (
        <>
          <button
            type="button"
            aria-label="Close more navigation menu"
            className="fixed inset-0 z-[1] bg-slate-900/20"
            onClick={() => setMoreOpen(false)}
          />
          <div
            role="menu"
            aria-label="More navigation"
            className="absolute inset-x-0 top-full z-[2] border-b border-slate-200 bg-white shadow-lg"
          >
            <ul className="max-h-[min(60vh,24rem)] overflow-y-auto py-2">
              {secondary.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      role="menuitem"
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMoreOpen(false)}
                      className={`${adminNavLinkClass} flex items-center gap-3 px-4 py-3 text-sm font-medium ${
                        active
                          ? "bg-cyan-500/10 text-cyan-800"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${active ? "text-cyan-700" : "text-slate-500"}`}
                      />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      ) : null}
    </nav>
  );
}
