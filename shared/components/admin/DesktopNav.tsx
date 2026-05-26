"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { ActiveCompanyContext } from "@/lib/database/types";
import {
  getAdminNavItems,
  splitAdminNavItemsForDesktop,
  type NavItem,
} from "./nav-items";

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

type DesktopNavLinkProps = {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
};

function DesktopNavLink({ item, active, onNavigate }: DesktopNavLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-cyan-500/12 text-cyan-800 ring-1 ring-cyan-500/15"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${active ? "text-cyan-700" : "text-slate-500"}`}
      />
      {item.label}
    </Link>
  );
}

type DesktopNavProps = {
  companyContext: ActiveCompanyContext;
};

export function DesktopNav({ companyContext }: DesktopNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const navItems = getAdminNavItems(companyContext);
  const { primary, secondary } = splitAdminNavItemsForDesktop(companyContext);
  const moreActive = secondary.some((item) => isActivePath(pathname, item.href));

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
      aria-label="Desktop navigation"
      className={`relative hidden w-full max-w-full shrink-0 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-sm md:block ${
        moreOpen ? "z-50" : "z-30"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2 px-4 sm:px-6">
        <ul className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {primary.map((item) => (
            <li key={item.href} className="shrink-0">
              <DesktopNavLink
                item={item}
                active={isActivePath(pathname, item.href)}
              />
            </li>
          ))}

          {secondary.length > 0 ? (
            <li className="relative shrink-0">
              <button
                type="button"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                aria-label="More navigation"
                onClick={() => setMoreOpen((open) => !open)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  moreActive || moreOpen
                    ? "bg-cyan-500/12 text-cyan-800 ring-1 ring-cyan-500/15"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                More
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${
                    moreOpen ? "rotate-180" : ""
                  } ${moreActive || moreOpen ? "text-cyan-700" : "text-slate-500"}`}
                />
              </button>

              {moreOpen ? (
                <>
                  <button
                    type="button"
                    aria-label="Close more navigation menu"
                    className="fixed inset-0 z-[1]"
                    onClick={() => setMoreOpen(false)}
                  />
                  <div
                    role="menu"
                    aria-label="More navigation"
                    className="absolute left-0 top-full z-[2] mt-1 min-w-[12rem] rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg"
                  >
                    <ul className="max-h-[min(60vh,24rem)] overflow-y-auto">
                      {secondary.map((item) => {
                        const Icon = item.icon;
                        const active = isActivePath(pathname, item.href);

                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              role="menuitem"
                              onClick={() => setMoreOpen(false)}
                              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                                active
                                  ? "bg-cyan-500/10 text-cyan-800"
                                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <Icon
                                className={`h-4 w-4 shrink-0 ${
                                  active ? "text-cyan-700" : "text-slate-500"
                                }`}
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
            </li>
          ) : null}
        </ul>

        {navItems.length <= 2 ? (
          <p className="hidden max-w-xs shrink-0 truncate text-xs text-slate-500 lg:block">
            Limited workspace access
          </p>
        ) : null}
      </div>
    </nav>
  );
}
